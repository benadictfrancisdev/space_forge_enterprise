from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class Workspace(TenantBaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        ARCHIVED = "archived", "Archived"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=64)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "workspaces"
        ordering = ["name"]
        indexes = [
            models.Index(fields=["organization_id", "-created_at"], name="idx_workspaces_org_created"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "slug"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_workspace_slug_per_org_alive",
            )
        ]

    def __str__(self) -> str:
        return self.name
