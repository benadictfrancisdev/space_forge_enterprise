"""Governance Platform models — Track 12.9."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TenantBaseModel


class DataClassification(models.TextChoices):
    PUBLIC = "public", "Public"
    INTERNAL = "internal", "Internal"
    CONFIDENTIAL = "confidential", "Confidential"
    RESTRICTED = "restricted", "Restricted"


class PolicyScope(models.TextChoices):
    ORGANIZATION = "organization", "Organization"
    WORKSPACE = "workspace", "Workspace"
    DEPARTMENT = "department", "Department"
    TEAM = "team", "Team"


class Department(TenantBaseModel):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=64)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "governance_departments"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_gov_dept_slug_alive",
            ),
        ]


class Team(TenantBaseModel):
    department = models.ForeignKey(
        Department,
        on_delete=models.CASCADE,
        related_name="teams",
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=64)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "governance_teams"
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["department", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_gov_team_slug_alive",
            ),
        ]


class GovernancePolicy(TenantBaseModel):
    """Enterprise governance policy — org/workspace/dept/team scoped."""

    class PolicyType(models.TextChoices):
        ACCESS = "access", "Access"
        DATA = "data", "Data"
        AI = "ai", "AI"
        SECURITY = "security", "Security"
        COMPLIANCE = "compliance", "Compliance"

    name = models.CharField(max_length=255)
    policy_type = models.CharField(max_length=32, choices=PolicyType.choices)
    scope = models.CharField(max_length=32, choices=PolicyScope.choices)
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    department = models.ForeignKey(
        Department,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="policies",
    )
    team = models.ForeignKey(
        Team,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="policies",
    )
    rules = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=100)

    class Meta:
        db_table = "governance_policies"
        ordering = ["priority", "name"]


class RoleHierarchy(TenantBaseModel):
    """Parent role inherits permissions to child role within org."""

    parent_role = models.ForeignKey(
        "permissions.Role",
        on_delete=models.CASCADE,
        related_name="child_hierarchies",
    )
    child_role = models.ForeignKey(
        "permissions.Role",
        on_delete=models.CASCADE,
        related_name="parent_hierarchies",
    )

    class Meta:
        db_table = "governance_role_hierarchy"
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "parent_role", "child_role"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_gov_role_hierarchy_alive",
            ),
        ]


class DatasetGovernance(TenantBaseModel):
    """Governed classification and ownership for a dataset."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.OneToOneField(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="governance",
    )
    classification = models.CharField(
        max_length=32,
        choices=DataClassification.choices,
        default=DataClassification.INTERNAL,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="governed_datasets",
    )
    ai_allowed = models.BooleanField(default=True)
    export_allowed = models.BooleanField(default=True)
    consent_required = models.BooleanField(default=False)
    retention_days = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = "governance_dataset_records"


class UnifiedLineageEdge(TenantBaseModel):
    """Full lineage: connector → dataset → transformation → analytics → ai → report."""

    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    source_type = models.CharField(max_length=64)
    source_id = models.UUIDField()
    target_type = models.CharField(max_length=64)
    target_id = models.UUIDField()
    stage = models.CharField(max_length=64, default="ingest")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "governance_lineage_edges"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_type", "source_id"], name="idx_gov_lineage_src"),
            models.Index(fields=["target_type", "target_id"], name="idx_gov_lineage_tgt"),
        ]


class ComplianceControl(TenantBaseModel):
    """Compliance framework control mapping (GDPR, SOC2, ISO 27001)."""

    class Framework(models.TextChoices):
        GDPR = "gdpr", "GDPR"
        SOC2 = "soc2", "SOC2"
        ISO27001 = "iso27001", "ISO 27001"

    framework = models.CharField(max_length=32, choices=Framework.choices)
    control_id = models.CharField(max_length=64)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=32, default="ready")
    evidence = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "governance_compliance_controls"
        ordering = ["framework", "control_id"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "framework", "control_id"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_gov_compliance_ctrl_alive",
            ),
        ]


class RetentionPolicy(TenantBaseModel):
    classification = models.CharField(
        max_length=32,
        choices=DataClassification.choices,
        default=DataClassification.INTERNAL,
    )
    retention_days = models.PositiveIntegerField()
    auto_delete = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "governance_retention_policies"


class ConsentRecord(TenantBaseModel):
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="consent_records",
    )
    subject_identifier = models.CharField(max_length=255)
    consent_given = models.BooleanField(default=False)
    purpose = models.CharField(max_length=255, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "governance_consent_records"
        ordering = ["-created_at"]


class SecurityPolicy(TenantBaseModel):
    class PolicyKind(models.TextChoices):
        ENCRYPTION = "encryption", "Encryption"
        SECRET_ROTATION = "secret_rotation", "Secret Rotation"
        API = "api", "API"
        DATASET_ACCESS = "dataset_access", "Dataset Access"
        AI_ACCESS = "ai_access", "AI Access"

    kind = models.CharField(max_length=32, choices=PolicyKind.choices)
    name = models.CharField(max_length=255)
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "governance_security_policies"
        ordering = ["kind", "name"]


class PolicyViolation(TenantBaseModel):
    policy = models.ForeignKey(
        GovernancePolicy,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="violations",
    )
    resource_type = models.CharField(max_length=64)
    resource_id = models.UUIDField()
    violation_type = models.CharField(max_length=128)
    severity = models.CharField(max_length=32, default="medium")
    details = models.JSONField(default=dict, blank=True)
    resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "governance_policy_violations"
        ordering = ["-created_at"]


class PolicyEvaluationLog(TenantBaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    action = models.CharField(max_length=128)
    resource_type = models.CharField(max_length=64, blank=True, default="")
    resource_id = models.UUIDField(null=True, blank=True)
    allowed = models.BooleanField(default=True)
    policies_matched = models.JSONField(default=list, blank=True)
    latency_ms = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "governance_policy_evaluations"
        ordering = ["-created_at"]
