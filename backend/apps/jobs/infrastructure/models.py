from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class Job(TenantBaseModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    class Priority(models.IntegerChoices):
        LOW = 1, "Low"
        NORMAL = 5, "Normal"
        HIGH = 10, "High"

    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    job_type = models.CharField(max_length=128, db_index=True)
    status = models.CharField(
        max_length=32, choices=Status.choices, default=Status.QUEUED, db_index=True
    )
    payload = models.JSONField(default=dict, blank=True)
    result = models.JSONField(null=True, blank=True)
    error = models.TextField(blank=True, default="")
    status_message = models.CharField(max_length=255, blank=True, default="")
    progress_pct = models.PositiveSmallIntegerField(default=0)
    priority = models.PositiveSmallIntegerField(
        choices=Priority.choices, default=Priority.NORMAL, db_index=True
    )
    attempt_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=3)
    timeout_seconds = models.PositiveIntegerField(default=300)
    cancel_requested = models.BooleanField(default=False)
    celery_task_id = models.CharField(max_length=255, blank=True, default="", db_index=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    execution_ms = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        db_table = "jobs"
        ordering = ["-priority", "-created_at"]
        indexes = [
            models.Index(fields=["organization_id", "status", "-created_at"], name="idx_jobs_org_status_created"),
            models.Index(fields=["organization_id", "-priority", "-created_at"], name="idx_jobs_org_prio_created"),
        ]
