"""Governance Platform services — Track 12.9."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset
from apps.governance.application.engines import (
    build_lineage_chain,
    compute_compliance_score,
    compute_security_score,
    evaluate_access,
    timed_evaluate,
)
from apps.governance.infrastructure.models import (
    ComplianceControl,
    ConsentRecord,
    DataClassification,
    DatasetGovernance,
    Department,
    GovernancePolicy,
    PolicyEvaluationLog,
    PolicyScope,
    PolicyViolation,
    RetentionPolicy,
    RoleHierarchy,
    SecurityPolicy,
    Team,
    UnifiedLineageEdge,
)
from apps.metadata.infrastructure.models import BusinessMetadata, ColumnMetadata
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

EVALUATE_JOB = "governance.evaluate"
CLASSIFY_JOB = "governance.classify"
DELETE_REQUEST_JOB = "governance.delete_request"
LINEAGE_JOB = "governance.lineage"


class GovernanceService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()

    def _get_dataset(self, *, dataset_id, user, permission: str) -> Dataset:
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_departments(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:read")
        return Department.objects.filter(organization_id=org.id)

    def list_teams(self, *, organization_id, user, department_id=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:read")
        qs = Team.objects.filter(organization_id=org.id)
        if department_id:
            qs = qs.filter(department_id=department_id)
        return qs

    @transaction.atomic
    def create_department(self, *, organization_id, user, name: str, slug: str, description: str = ""):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:write")
        dept = Department.objects.create(
            organization_id=org.id,
            name=name,
            slug=slug,
            description=description,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="governance.department.create",
            resource_type="department",
            resource_id=dept.id,
            organization_id=org.id,
            after={"name": name, "slug": slug},
        )
        return dept

    @transaction.atomic
    def create_team(
        self,
        *,
        organization_id,
        user,
        department_id,
        name: str,
        slug: str,
        description: str = "",
    ):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:write")
        dept = Department.objects.filter(id=department_id, organization_id=org.id).first()
        if not dept:
            raise NotFoundError("Department not found")
        team = Team.objects.create(
            organization_id=org.id,
            department=dept,
            name=name,
            slug=slug,
            description=description,
            created_by=user,
            updated_by=user,
        )
        return team

    def list_policies(self, *, organization_id, user, scope=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:read")
        qs = GovernancePolicy.objects.filter(organization_id=org.id)
        if scope:
            qs = qs.filter(scope=scope)
        return qs

    @transaction.atomic
    def create_policy(self, *, organization_id, user, **fields):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:write")
        policy = GovernancePolicy.objects.create(
            organization_id=org.id,
            created_by=user,
            updated_by=user,
            **fields,
        )
        self.audit.record(
            actor=user,
            action="governance.policy.create",
            resource_type="governance_policy",
            resource_id=policy.id,
            organization_id=org.id,
            after={"name": policy.name, "policy_type": policy.policy_type},
        )
        return policy

    def list_compliance_controls(self, *, organization_id, user, framework=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:read")
        qs = ComplianceControl.objects.filter(organization_id=org.id)
        if framework:
            qs = qs.filter(framework=framework)
        return qs

    @transaction.atomic
    def seed_compliance_controls(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:write")
        seeds = [
            (ComplianceControl.Framework.GDPR, "GDPR-7", "Right to erasure", "ready"),
            (ComplianceControl.Framework.GDPR, "GDPR-6", "Lawful processing", "ready"),
            (ComplianceControl.Framework.SOC2, "CC6.1", "Logical access", "ready"),
            (ComplianceControl.Framework.SOC2, "CC7.2", "System monitoring", "ready"),
            (ComplianceControl.Framework.ISO27001, "A.9.1", "Access control policy", "ready"),
            (ComplianceControl.Framework.ISO27001, "A.12.3", "Backup", "ready"),
        ]
        created = []
        for framework, control_id, title, status in seeds:
            ctrl, was_created = ComplianceControl.objects.get_or_create(
                organization_id=org.id,
                framework=framework,
                control_id=control_id,
                defaults={
                    "title": title,
                    "status": status,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            if was_created:
                created.append(ctrl)
        return created

    def list_security_policies(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:read")
        return SecurityPolicy.objects.filter(organization_id=org.id)

    @transaction.atomic
    def seed_security_policies(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:write")
        seeds = [
            (SecurityPolicy.PolicyKind.ENCRYPTION, "AES-256 at rest", {"algorithm": "AES-256"}),
            (SecurityPolicy.PolicyKind.SECRET_ROTATION, "90-day rotation", {"days": 90}),
            (SecurityPolicy.PolicyKind.API, "Rate limit 1000/min", {"rate_limit": 1000}),
            (SecurityPolicy.PolicyKind.DATASET_ACCESS, "Classification gate", {"enforce": True}),
            (SecurityPolicy.PolicyKind.AI_ACCESS, "Restricted AI block", {"block_restricted": True}),
        ]
        created = []
        for kind, name, config in seeds:
            pol, was_created = SecurityPolicy.objects.get_or_create(
                organization_id=org.id,
                kind=kind,
                name=name,
                defaults={"config": config, "created_by": user, "updated_by": user},
            )
            if was_created:
                created.append(pol)
        return created

    def get_dataset_governance(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        gov, _ = DatasetGovernance.objects.get_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "classification": DataClassification.INTERNAL,
                "created_by": user,
                "updated_by": user,
            },
        )
        return gov

    @transaction.atomic
    def classify_dataset(
        self,
        *,
        dataset_id,
        user=None,
        actor=None,
        classification: str = DataClassification.INTERNAL,
        ai_allowed: bool = True,
        export_allowed: bool = True,
        retention_days: int | None = None,
    ):
        actor = actor or user
        if user:
            dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="governance:write")
        else:
            dataset = Dataset.objects.get(id=dataset_id)
        gov, _ = DatasetGovernance.objects.update_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "classification": classification,
                "ai_allowed": ai_allowed,
                "export_allowed": export_allowed,
                "retention_days": retention_days,
                "updated_by": actor,
            },
        )
        if not gov.created_by_id and actor:
            gov.created_by = actor
            gov.save(update_fields=["created_by"])

        BusinessMetadata.objects.update_or_create(
            dataset=dataset,
            defaults={
                "organization_id": dataset.organization_id,
                "workspace_id": dataset.workspace_id,
                "classification": classification,
                "retention_days": retention_days,
                "updated_by": actor,
            },
        )
        if actor:
            self.audit.record(
                actor=actor,
                action="governance.classify",
                resource_type="dataset",
                resource_id=dataset.id,
                organization_id=dataset.organization_id,
                after={"classification": classification},
            )
        return gov

    def evaluate_policy(
        self,
        *,
        organization_id,
        user=None,
        actor=None,
        action: str,
        resource_type: str = "",
        resource_id=None,
        workspace_id=None,
        classification: str = DataClassification.INTERNAL,
    ) -> dict:
        actor = actor or user
        if user:
            org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        else:
            from apps.organizations.infrastructure.models import Organization

            org = Organization.objects.get(id=organization_id)

        perms = (
            self.permissions.permissions_for(
                user=user, organization_id=org.id, workspace_id=workspace_id
            )
            if user
            else set()
        )

        policies = list(
            GovernancePolicy.objects.filter(organization_id=org.id, is_active=True).order_by(
                "priority"
            )
        )

        (allowed, matched, reason), latency_ms = timed_evaluate(
            evaluate_access,
            policies=policies,
            classification=classification,
            action=action,
            user_permissions=perms,
        )

        if not allowed and actor:
            PolicyViolation.objects.create(
                organization_id=org.id,
                resource_type=resource_type or "unknown",
                resource_id=resource_id or org.id,
                violation_type=reason or "access_denied",
                severity="high",
                details={"action": action, "classification": classification},
                created_by=actor,
                updated_by=actor,
            )

        if actor:
            PolicyEvaluationLog.objects.create(
                organization_id=org.id,
                user=actor if hasattr(actor, "id") else None,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                allowed=allowed,
                policies_matched=matched,
                latency_ms=latency_ms,
                created_by=actor,
                updated_by=actor,
            )

        return {
            "allowed": allowed,
            "reason": reason,
            "policies_matched": matched,
            "latency_ms": latency_ms,
        }

    def require_dataset_access(
        self,
        *,
        dataset_id,
        user=None,
        actor=None,
        action: str,
    ) -> DatasetGovernance:
        actor = actor or user
        if user:
            dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        else:
            dataset = Dataset.objects.get(id=dataset_id)

        gov = DatasetGovernance.objects.filter(dataset_id=dataset_id).first()
        classification = gov.classification if gov else DataClassification.INTERNAL

        result = self.evaluate_policy(
            organization_id=dataset.organization_id,
            user=user,
            actor=actor,
            action=action,
            resource_type="dataset",
            resource_id=dataset.id,
            workspace_id=dataset.workspace_id,
            classification=classification,
        )
        if not result["allowed"]:
            raise PermissionDeniedError(result.get("reason") or "governance_denied")

        if gov and not gov.ai_allowed and action.startswith("ai:"):
            raise PermissionDeniedError("ai_not_allowed_for_dataset")

        return gov

    @transaction.atomic
    def record_lineage_edge(
        self,
        *,
        organization_id,
        source_type: str,
        source_id,
        target_type: str,
        target_id,
        stage: str = "transform",
        workspace_id=None,
        actor=None,
        metadata: dict | None = None,
    ):
        edge = UnifiedLineageEdge.objects.create(
            organization_id=organization_id,
            workspace_id=workspace_id,
            source_type=source_type,
            source_id=source_id,
            target_type=target_type,
            target_id=target_id,
            stage=stage,
            metadata=metadata or {},
            created_by=actor,
            updated_by=actor,
        )
        return edge

    def build_dataset_lineage(self, *, dataset_id, user=None, actor=None) -> dict:
        actor = actor or user
        if user:
            dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        else:
            dataset = Dataset.objects.get(id=dataset_id)

        from django.db.models import Q

        edges = UnifiedLineageEdge.objects.filter(
            organization_id=dataset.organization_id,
        ).filter(Q(source_id=dataset.id) | Q(target_id=dataset.id))
        chain = build_lineage_chain(list(edges))

        from apps.data_platform.infrastructure.models import LineageRecord

        dp_edges = LineageRecord.objects.filter(
            organization_id=dataset.organization_id,
        ).filter(Q(source_id=dataset.id) | Q(target_id=dataset.id))
        for e in dp_edges:
            chain.append(
                {
                    "source_type": e.source_type,
                    "source_id": str(e.source_id),
                    "target_type": e.target_type,
                    "target_id": str(e.target_id),
                    "stage": e.transformation,
                }
            )
        return {"dataset_id": str(dataset.id), "lineage": chain}

    @transaction.atomic
    def sync_lineage_for_dataset(self, *, dataset_id, actor=None) -> dict:
        from apps.ai_platform.infrastructure.models import AIObservabilityEvent, EmbeddingRecord
        from apps.analytics.infrastructure.models import AnalyticsResult
        from apps.data_platform.infrastructure.models import LineageRecord
        from apps.intelligence.infrastructure.models import ContextBundle
        from apps.query_compute.infrastructure.models import QueryExecution

        dataset = Dataset.objects.get(id=dataset_id)
        org_id = dataset.organization_id
        ws_id = dataset.workspace_id
        created = 0

        for lr in LineageRecord.objects.filter(
            organization_id=org_id,
            target_id=dataset.id,
        ):
            self.record_lineage_edge(
                organization_id=org_id,
                source_type=lr.source_type,
                source_id=lr.source_id,
                target_type="dataset",
                target_id=dataset.id,
                stage="dataset",
                workspace_id=ws_id,
                actor=actor,
            )
            created += 1

        for ar in AnalyticsResult.objects.filter(dataset_id=dataset.id)[:5]:
            self.record_lineage_edge(
                organization_id=org_id,
                source_type="dataset",
                source_id=dataset.id,
                target_type="analytics",
                target_id=ar.id,
                stage="analytics",
                workspace_id=ws_id,
                actor=actor,
            )
            created += 1

        if ContextBundle.objects.filter(dataset_id=dataset.id).exists():
            bundle = ContextBundle.objects.filter(dataset_id=dataset.id).first()
            self.record_lineage_edge(
                organization_id=org_id,
                source_type="dataset",
                source_id=dataset.id,
                target_type="intelligence",
                target_id=bundle.id,
                stage="intelligence",
                workspace_id=ws_id,
                actor=actor,
            )
            created += 1

        for ev in AIObservabilityEvent.objects.filter(dataset_id=dataset.id)[:3]:
            self.record_lineage_edge(
                organization_id=org_id,
                source_type="dataset",
                source_id=dataset.id,
                target_type="ai",
                target_id=ev.id,
                stage="ai",
                workspace_id=ws_id,
                actor=actor,
            )
            created += 1

        for qe in QueryExecution.objects.filter(dataset_id=dataset.id)[:3]:
            self.record_lineage_edge(
                organization_id=org_id,
                source_type="dataset",
                source_id=dataset.id,
                target_type="report",
                target_id=qe.id,
                stage="report",
                workspace_id=ws_id,
                actor=actor,
            )
            created += 1

        if EmbeddingRecord.objects.filter(dataset_id=dataset.id).exists():
            emb = EmbeddingRecord.objects.filter(dataset_id=dataset.id).first()
            self.record_lineage_edge(
                organization_id=org_id,
                source_type="dataset",
                source_id=dataset.id,
                target_type="embedding",
                target_id=emb.id,
                stage="ai",
                workspace_id=ws_id,
                actor=actor,
            )
            created += 1

        return {"dataset_id": str(dataset.id), "edges_created": created}

    def get_dashboard(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="governance:read")

        violations = list(
            PolicyViolation.objects.filter(organization_id=org.id, resolved=False)[:50]
        )
        controls = list(ComplianceControl.objects.filter(organization_id=org.id))
        security_policies = list(SecurityPolicy.objects.filter(organization_id=org.id))
        sensitive = DatasetGovernance.objects.filter(
            organization_id=org.id,
            classification__in=[
                DataClassification.CONFIDENTIAL,
                DataClassification.RESTRICTED,
            ],
        ).count()
        pii_datasets = ColumnMetadata.objects.filter(
            organization_id=org.id, pii_detected=True
        ).values("dataset_id").distinct().count()

        from apps.ai_platform.infrastructure.models import AIObservabilityEvent

        ai_usage = AIObservabilityEvent.objects.filter(organization_id=org.id).count()
        ownership = DatasetGovernance.objects.filter(
            organization_id=org.id, owner__isnull=False
        ).count()

        return {
            "policy_violations": len(violations),
            "compliance_score": compute_compliance_score(controls),
            "security_score": compute_security_score(violations, security_policies),
            "sensitive_datasets": sensitive,
            "pii_datasets": pii_datasets,
            "ai_usage_events": ai_usage,
            "dataset_ownership_assigned": ownership,
            "open_violations": [
                {
                    "id": str(v.id),
                    "violation_type": v.violation_type,
                    "severity": v.severity,
                    "resource_type": v.resource_type,
                }
                for v in violations[:10]
            ],
        }

    @transaction.atomic
    def record_consent(
        self,
        *,
        dataset_id,
        user,
        subject_identifier: str,
        consent_given: bool,
        purpose: str = "",
    ):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="governance:write")
        record = ConsentRecord.objects.create(
            organization_id=dataset.organization_id,
            dataset=dataset,
            subject_identifier=subject_identifier,
            consent_given=consent_given,
            purpose=purpose,
            created_by=user,
            updated_by=user,
        )
        return record

    @transaction.atomic
    def request_delete(self, *, dataset_id, user, subject_identifier: str = ""):
        """Right-to-delete workflow — marks consent withdrawn and queues deletion job."""
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="governance:write")
        ConsentRecord.objects.create(
            organization_id=dataset.organization_id,
            dataset=dataset,
            subject_identifier=subject_identifier or "gdpr_request",
            consent_given=False,
            purpose="right_to_delete",
            metadata={"requested_at": timezone.now().isoformat()},
            created_by=user,
            updated_by=user,
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=DELETE_REQUEST_JOB,
            payload={"dataset_id": str(dataset.id), "subject_identifier": subject_identifier},
        )
        self.audit.record(
            actor=user,
            action="governance.delete_request",
            resource_type="dataset",
            resource_id=dataset.id,
            organization_id=dataset.organization_id,
            after={"subject": subject_identifier},
        )
        return job

    @transaction.atomic
    def run_delete_for_job(self, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValidationError("dataset_id required")
        dataset = Dataset.objects.get(id=dataset_id)

        from apps.ai_platform.infrastructure.models import EmbeddingRecord, RAGChunk, RAGDocument

        EmbeddingRecord.objects.filter(dataset_id=dataset.id).delete()
        RAGChunk.objects.filter(document__dataset_id=dataset.id).delete()
        RAGDocument.objects.filter(dataset_id=dataset.id).delete()
        DatasetGovernance.objects.filter(dataset_id=dataset.id).delete()
        from django.db.models import Q

        UnifiedLineageEdge.objects.filter(
            organization_id=dataset.organization_id,
        ).filter(Q(source_id=dataset.id) | Q(target_id=dataset.id)).delete()

        return {
            "dataset_id": str(dataset.id),
            "status": "purged",
            "subject": (job.payload or {}).get("subject_identifier"),
        }

    def run_classify_for_job(self, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValidationError("dataset_id required")
        payload = job.payload or {}
        gov = self.classify_dataset(
            dataset_id=dataset_id,
            actor=job.created_by,
            classification=payload.get("classification", DataClassification.INTERNAL),
            ai_allowed=payload.get("ai_allowed", True),
            export_allowed=payload.get("export_allowed", True),
            retention_days=payload.get("retention_days"),
        )
        return {"dataset_id": str(dataset_id), "classification": gov.classification}

    def run_evaluate_for_job(self, job) -> dict:
        payload = job.payload or {}
        return self.evaluate_policy(
            organization_id=job.organization_id,
            actor=job.created_by,
            action=payload.get("action", "dataset:read"),
            resource_type=payload.get("resource_type", ""),
            resource_id=payload.get("resource_id"),
            workspace_id=job.workspace_id,
            classification=payload.get("classification", DataClassification.INTERNAL),
        )

    def run_lineage_for_job(self, job) -> dict:
        dataset_id = (job.payload or {}).get("dataset_id")
        if not dataset_id:
            raise ValidationError("dataset_id required")
        sync = self.sync_lineage_for_dataset(dataset_id=dataset_id, actor=job.created_by)
        lineage = self.build_dataset_lineage(dataset_id=dataset_id, actor=job.created_by)
        return {**sync, **lineage}

    def run_wave4_for_dataset(self, *, dataset_id, actor=None) -> dict:
        gov = self.classify_dataset(
            dataset_id=dataset_id,
            actor=actor,
            classification=DataClassification.INTERNAL,
        )
        lineage = self.sync_lineage_for_dataset(dataset_id=dataset_id, actor=actor)
        eval_result = self.evaluate_policy(
            organization_id=gov.organization_id,
            actor=actor,
            action="dataset:read",
            resource_type="dataset",
            resource_id=dataset_id,
            workspace_id=gov.workspace_id,
            classification=gov.classification,
        )
        return {
            "governance": {
                "classification": gov.classification,
                "lineage": lineage,
                "policy_evaluation": eval_result,
            }
        }

