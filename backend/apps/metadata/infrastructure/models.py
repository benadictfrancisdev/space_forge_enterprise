"""Metadata Platform models — Track 12.2."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TenantBaseModel


class ColumnMetadata(TenantBaseModel):
    """Column-level metadata for a dataset version."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="column_metadata",
    )
    dataset_version_id = models.UUIDField(null=True, blank=True, db_index=True)
    column_name = models.CharField(max_length=255)
    physical_type = models.CharField(max_length=64, blank=True, default="")
    business_name = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    is_nullable = models.BooleanField(default=True)
    is_primary_key = models.BooleanField(default=False)
    tags = models.JSONField(default=list, blank=True)
    statistics = models.JSONField(default=dict, blank=True)
    pii_detected = models.BooleanField(default=False)
    pii_type = models.CharField(max_length=64, blank=True, default="")

    class Meta:
        db_table = "metadata_columns"
        ordering = ["column_name"]
        indexes = [
            models.Index(fields=["dataset", "column_name"], name="idx_meta_col_ds_name"),
        ]


class DatasetRelationship(TenantBaseModel):
    """Relationship between datasets (FK, join, derived)."""

    class RelationType(models.TextChoices):
        FOREIGN_KEY = "foreign_key", "Foreign Key"
        JOIN = "join", "Join"
        DERIVED = "derived", "Derived"
        DUPLICATE = "duplicate", "Duplicate"

    workspace_id = models.UUIDField(db_index=True)
    source_dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="outbound_relationships",
    )
    target_dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="inbound_relationships",
    )
    relation_type = models.CharField(
        max_length=32,
        choices=RelationType.choices,
        default=RelationType.DERIVED,
    )
    source_column = models.CharField(max_length=255, blank=True, default="")
    target_column = models.CharField(max_length=255, blank=True, default="")
    description = models.TextField(blank=True, default="")
    confidence = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "metadata_relationships"
        ordering = ["-created_at"]


class MetadataTag(TenantBaseModel):
    """Reusable tag applied to datasets."""

    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="metadata_tags",
    )
    tag = models.CharField(max_length=128, db_index=True)
    category = models.CharField(max_length=64, blank=True, default="general")

    class Meta:
        db_table = "metadata_tags"
        ordering = ["tag"]
        constraints = [
            models.UniqueConstraint(
                fields=["dataset", "tag"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_metadata_tag_alive",
            ),
        ]


class SchemaRegistryEntry(TenantBaseModel):
    """Versioned schema snapshot in the schema registry."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="schema_registry_entries",
    )
    version_number = models.PositiveIntegerField()
    schema = models.JSONField(default=dict)
    checksum = models.CharField(max_length=64, blank=True, default="")
    is_current = models.BooleanField(default=True)

    class Meta:
        db_table = "metadata_schema_registry"
        ordering = ["-version_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["dataset", "version_number"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_schema_registry_version_alive",
            ),
        ]


class BusinessMetadata(TenantBaseModel):
    """Business context and ownership for a dataset."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.OneToOneField(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="business_metadata",
    )
    business_owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="datasets_business_owned",
    )
    data_steward = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="datasets_stewarded",
    )
    domain = models.CharField(max_length=128, blank=True, default="")
    classification = models.CharField(max_length=64, blank=True, default="internal")
    retention_days = models.PositiveIntegerField(null=True, blank=True)
    glossary_terms = models.JSONField(default=list, blank=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "metadata_business"
