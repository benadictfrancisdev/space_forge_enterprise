from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TenantBaseModel


class Membership(TenantBaseModel):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="memberships",
    )
    role = models.ForeignKey(
        "permissions.Role",
        on_delete=models.PROTECT,
        related_name="memberships",
    )
    workspace = models.ForeignKey(
        "workspaces.Workspace",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="memberships",
    )

    class Meta:
        db_table = "memberships"
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "user"],
                condition=models.Q(workspace__isnull=True, deleted_at__isnull=True),
                name="uniq_org_membership_alive",
            ),
            models.UniqueConstraint(
                fields=["organization_id", "user", "workspace"],
                condition=models.Q(workspace__isnull=False, deleted_at__isnull=True),
                name="uniq_workspace_membership_alive",
            ),
        ]
