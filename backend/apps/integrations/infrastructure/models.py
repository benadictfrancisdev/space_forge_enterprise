"""Integrations infrastructure models."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TenantBaseModel
from apps.integrations.domain.auth import AuthMethod


class Credential(TenantBaseModel):
    """Org-scoped secret store. Encrypted payload never leaves the backend."""

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ROTATED = "rotated", "Rotated"
        REVOKED = "revoked", "Revoked"

    name = models.CharField(max_length=255)
    auth_method = models.CharField(
        max_length=32,
        choices=[(m.value, m.value) for m in AuthMethod],
        default=AuthMethod.PASSWORD.value,
    )
    encrypted_payload = models.BinaryField()
    key_version = models.PositiveIntegerField(default=1)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.ACTIVE,
        db_index=True,
    )
    rotation_due_at = models.DateTimeField(null=True, blank=True)
    last_rotated_at = models.DateTimeField(null=True, blank=True)
    replaces = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="replaced_by",
    )

    class Meta:
        db_table = "integration_credentials"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization_id", "status", "-created_at"],
                name="idx_cred_org_status_created",
            ),
        ]


class Connection(TenantBaseModel):
    """System of record for an integration endpoint (org + workspace scoped)."""

    class HealthStatus(models.TextChoices):
        UNKNOWN = "unknown", "Unknown"
        TESTING = "testing", "Testing"
        HEALTHY = "healthy", "Healthy"
        UNHEALTHY = "unhealthy", "Unhealthy"

    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    connector_type = models.CharField(max_length=128, db_index=True)
    connector_version = models.CharField(max_length=32, default="1.0.0")
    credential = models.ForeignKey(
        Credential,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="connections",
    )
    config = models.JSONField(default=dict, blank=True)
    health_status = models.CharField(
        max_length=32,
        choices=HealthStatus.choices,
        default=HealthStatus.UNKNOWN,
        db_index=True,
    )
    last_health_message = models.TextField(blank=True, default="")
    last_tested_at = models.DateTimeField(null=True, blank=True)
    last_sync_at = models.DateTimeField(null=True, blank=True)
    next_sync_at = models.DateTimeField(null=True, blank=True)
    schema_version = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    sync_schedule = models.CharField(max_length=64, default="manual")
    target_dataset = models.ForeignKey(
        "datasets.Dataset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="source_connections",
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="owned_connections",
    )

    class Meta:
        db_table = "integration_connections"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["organization_id", "workspace_id", "-created_at"],
                name="idx_conn_org_ws_created",
            ),
            models.Index(
                fields=["organization_id", "health_status"],
                name="idx_conn_org_health",
            ),
        ]


class SchemaSnapshot(TenantBaseModel):
    """Versioned discovery output for a connection."""

    workspace_id = models.UUIDField(db_index=True)
    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="schema_snapshots",
    )
    version = models.PositiveIntegerField()
    discovered_at = models.DateTimeField()
    tables = models.JSONField(default=list, blank=True)
    fingerprint = models.CharField(max_length=64, db_index=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "integration_schema_snapshots"
        ordering = ["-version"]
        constraints = [
            models.UniqueConstraint(
                fields=["connection", "version"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_schema_snapshot_conn_version_alive",
            ),
        ]
        indexes = [
            models.Index(
                fields=["connection", "-version"],
                name="idx_schema_conn_version",
            ),
        ]


class SyncRun(TenantBaseModel):
    """History + resume state for a connector sync execution."""

    class Mode(models.TextChoices):
        FULL = "full", "Full"
        INCREMENTAL = "incremental", "Incremental"

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    workspace_id = models.UUIDField(db_index=True)
    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="sync_runs",
    )
    job = models.ForeignKey(
        "jobs.Job",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sync_runs",
    )
    mode = models.CharField(max_length=32, choices=Mode.choices, default=Mode.FULL)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    rows_extracted = models.PositiveIntegerField(default=0)
    rows_loaded = models.PositiveIntegerField(default=0)
    cursor_state = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    storage_object = models.ForeignKey(
        "storage.StorageObject",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sync_runs",
    )
    dataset = models.ForeignKey(
        "datasets.Dataset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="sync_runs",
    )

    class Meta:
        db_table = "integration_sync_runs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["connection", "-created_at"],
                name="idx_sync_run_conn_created",
            ),
            models.Index(
                fields=["organization_id", "status", "-created_at"],
                name="idx_sync_run_org_status",
            ),
        ]


class TransformRule(TenantBaseModel):
    """Declarative transform steps applied between extract and storage."""

    workspace_id = models.UUIDField(db_index=True)
    connection = models.ForeignKey(
        Connection,
        on_delete=models.CASCADE,
        related_name="transform_rules",
    )
    name = models.CharField(max_length=255)
    table_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Empty = apply to all tables/batches",
    )
    steps = models.JSONField(
        default=list,
        blank=True,
        help_text="Ordered ops: rename, cast, nulls",
    )
    is_active = models.BooleanField(default=True)
    priority = models.PositiveIntegerField(default=100)

    class Meta:
        db_table = "integration_transform_rules"
        ordering = ["priority", "created_at"]
        indexes = [
            models.Index(
                fields=["connection", "is_active", "priority"],
                name="idx_xform_conn_active_prio",
            ),
        ]
