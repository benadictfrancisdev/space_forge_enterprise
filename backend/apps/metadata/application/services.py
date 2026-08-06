"""Metadata extraction and registry services — Track 12.2."""
from __future__ import annotations

import hashlib
import json
import re

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset
from apps.metadata.infrastructure.models import (
    BusinessMetadata,
    ColumnMetadata,
    DatasetRelationship,
    MetadataTag,
    SchemaRegistryEntry,
)
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

METADATA_EXTRACT_JOB = "metadata.extract"

# PII detection patterns (deterministic, not LLM)
PII_PATTERNS = {
    "email": re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"),
    "phone": re.compile(r"^\+?[\d\s\-().]{7,20}$"),
    "ssn": re.compile(r"^\d{3}-?\d{2}-?\d{4}$"),
}


def _detect_pii(column_name: str, sample_values: list[str]) -> tuple[bool, str]:
    name_lower = column_name.lower()
    if any(k in name_lower for k in ("email", "phone", "ssn", "social", "address", "name")):
        for hint, ptype in [
            ("email", "email"),
            ("phone", "phone"),
            ("ssn", "ssn"),
            ("social", "ssn"),
        ]:
            if hint in name_lower:
                return True, ptype

    for val in sample_values[:20]:
        s = str(val).strip()
        if not s:
            continue
        for ptype, pattern in PII_PATTERNS.items():
            if pattern.match(s):
                return True, ptype
    return False, ""


def _schema_checksum(schema: dict) -> str:
    raw = json.dumps(schema, sort_keys=True, default=str)
    return hashlib.sha256(raw.encode()).hexdigest()


class MetadataService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()

    def _get_dataset(self, *, dataset_id, user, permission: str) -> Dataset:
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_columns(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return ColumnMetadata.objects.filter(dataset_id=dataset.id).order_by("column_name")

    def list_relationships(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        outbound = DatasetRelationship.objects.filter(source_dataset_id=dataset.id)
        inbound = DatasetRelationship.objects.filter(target_dataset_id=dataset.id)
        return list(outbound) + list(inbound)

    def list_tags(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return MetadataTag.objects.filter(dataset_id=dataset.id).order_by("tag")

    def get_schema_registry(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return SchemaRegistryEntry.objects.filter(dataset_id=dataset.id).order_by("-version_number")

    def get_business_metadata(self, *, dataset_id, user) -> BusinessMetadata | None:
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return BusinessMetadata.objects.filter(dataset_id=dataset.id).first()

    @transaction.atomic
    def upsert_business_metadata(
        self,
        *,
        dataset_id,
        user,
        domain: str = "",
        classification: str = "internal",
        glossary_terms: list | None = None,
        custom_fields: dict | None = None,
    ) -> BusinessMetadata:
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        meta, created = BusinessMetadata.objects.get_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "business_owner": user,
                "domain": domain,
                "classification": classification,
                "created_by": user,
                "updated_by": user,
            },
        )
        if not created:
            meta.domain = domain or meta.domain
            meta.classification = classification or meta.classification
            if glossary_terms is not None:
                meta.glossary_terms = glossary_terms
            if custom_fields is not None:
                meta.custom_fields = custom_fields
            meta.updated_by = user
            meta.save()
        self.audit.record(
            actor=user,
            action="metadata.business_updated",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
        )
        return meta

    @transaction.atomic
    def add_tag(self, *, dataset_id, user, tag: str, category: str = "general") -> MetadataTag:
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        obj, _ = MetadataTag.objects.get_or_create(
            dataset=dataset,
            tag=tag.strip().lower(),
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "category": category,
                "created_by": user,
                "updated_by": user,
            },
        )
        return obj

    def enqueue_extract(self, *, dataset_id, user):
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=METADATA_EXTRACT_JOB,
            payload={"dataset_id": str(dataset.id)},
            timeout_seconds=300,
        )
        return job

    @transaction.atomic
    def extract_for_dataset(self, *, dataset_id, actor=None) -> dict:
        """Extract column metadata, schema registry, and PII flags from dataset profile."""
        dataset = Dataset.objects.get(id=dataset_id)
        schema = dataset.schema or {}
        statistics = dataset.statistics or {}
        columns = schema.get("columns") or []
        version_number = dataset.version or 1

        ColumnMetadata.objects.filter(dataset_id=dataset.id).delete()

        for col_def in columns:
            col_name = col_def.get("name", "")
            if not col_name:
                continue
            col_stats = (statistics.get("columns") or {}).get(col_name, {})
            samples = col_stats.get("sample_values") or []
            pii, pii_type = _detect_pii(col_name, samples)
            ColumnMetadata.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                dataset_version_id=None,
                column_name=col_name,
                physical_type=col_def.get("dtype", col_stats.get("dtype", "")),
                is_nullable=col_stats.get("null_count", 0) > 0,
                statistics=col_stats,
                pii_detected=pii,
                pii_type=pii_type,
                created_by=actor,
                updated_by=actor,
            )

        checksum = _schema_checksum(schema)
        SchemaRegistryEntry.objects.filter(dataset_id=dataset.id, is_current=True).update(
            is_current=False
        )
        SchemaRegistryEntry.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            version_number=version_number,
            schema=schema,
            checksum=checksum,
            is_current=True,
            created_by=actor,
            updated_by=actor,
        )

        BusinessMetadata.objects.get_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "business_owner": actor,
                "created_by": actor,
                "updated_by": actor,
            },
        )

        if actor:
            self.audit.record(
                actor=actor,
                action="metadata.extracted",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
                after={"columns": len(columns), "version": version_number},
            )

        return {
            "dataset_id": str(dataset.id),
            "columns_extracted": len(columns),
            "schema_version": version_number,
            "schema_checksum": checksum,
        }

    def run_extract_for_job(self, *, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")
        actor = job.created_by
        return self.extract_for_dataset(dataset_id=dataset_id, actor=actor)
