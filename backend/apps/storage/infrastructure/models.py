from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class StorageObject(TenantBaseModel):
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    bucket = models.CharField(max_length=128)
    key = models.CharField(max_length=1024)
    filename = models.CharField(max_length=512)
    content_type = models.CharField(max_length=255, blank=True, default="application/octet-stream")
    size_bytes = models.BigIntegerField(default=0)
    checksum_sha256 = models.CharField(max_length=64, blank=True, default="")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "storage_objects"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["organization_id", "-created_at"], name="idx_storage_org_created"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["bucket", "key"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_storage_object_alive",
            )
        ]
