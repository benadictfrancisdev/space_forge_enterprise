from __future__ import annotations

from django.db import models

from apps.core.models import UUIDPrimaryKeyModel, TimeStampedModel


class Permission(UUIDPrimaryKeyModel, TimeStampedModel):
    code = models.CharField(max_length=128, unique=True)
    description = models.CharField(max_length=255, blank=True, default="")

    class Meta:
        db_table = "permissions"

    def __str__(self) -> str:
        return self.code


class Role(UUIDPrimaryKeyModel, TimeStampedModel):
    class Scope(models.TextChoices):
        ORGANIZATION = "organization", "Organization"
        WORKSPACE = "workspace", "Workspace"
        PLATFORM = "platform", "Platform"

    class Codes:
        ORG_OWNER = "org_owner"
        ORG_ADMIN = "org_admin"
        ORG_MEMBER = "org_member"
        WS_ADMIN = "workspace_admin"
        WS_MEMBER = "workspace_member"

    code = models.CharField(max_length=64)
    name = models.CharField(max_length=128)
    scope = models.CharField(max_length=32, choices=Scope.choices)
    is_system = models.BooleanField(default=True)
    permissions = models.ManyToManyField(Permission, through="RolePermission", related_name="roles")

    class Meta:
        db_table = "roles"
        constraints = [
            models.UniqueConstraint(fields=["code", "scope"], name="uniq_role_code_scope")
        ]

    def __str__(self) -> str:
        return f"{self.scope}:{self.code}"


class RolePermission(UUIDPrimaryKeyModel, TimeStampedModel):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE)

    class Meta:
        db_table = "role_permissions"
        constraints = [
            models.UniqueConstraint(fields=["role", "permission"], name="uniq_role_permission")
        ]
