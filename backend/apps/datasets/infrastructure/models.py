from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class Dataset(TenantBaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        READY = "ready", "Ready"
        ARCHIVED = "archived", "Archived"

    class ProfileStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        RUNNING = "running", "Running"
        READY = "ready", "Ready"
        FAILED = "failed", "Failed"

    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    storage_object = models.ForeignKey(
        "storage.StorageObject",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="datasets",
    )
    schema = models.JSONField(default=dict, blank=True)
    statistics = models.JSONField(default=dict, blank=True)
    profile_status = models.CharField(
        max_length=32,
        choices=ProfileStatus.choices,
        default=ProfileStatus.PENDING,
    )
    row_count = models.BigIntegerField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "datasets"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_id", "-created_at"], name="idx_datasets_org_created"),
            models.Index(fields=["workspace_id", "status"], name="idx_datasets_ws_status"),
        ]
