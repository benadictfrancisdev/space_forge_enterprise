from __future__ import annotations

from apps.core.exceptions import PermissionDeniedError
from apps.memberships.infrastructure.models import Membership
from apps.permissions.infrastructure.models import Role


DEFAULT_PERMISSIONS = [
    ("org:read", "Read organization"),
    ("org:update", "Update organization"),
    ("org:manage_members", "Manage organization members"),
    ("workspace:create", "Create workspace"),
    ("workspace:read", "Read workspace"),
    ("workspace:update", "Update workspace"),
    ("workspace:delete", "Delete workspace"),
    ("storage:read", "Read storage objects"),
    ("storage:write", "Write storage objects"),
    ("dataset:read", "Read datasets"),
    ("dataset:write", "Write datasets"),
    ("dataset:delete", "Delete datasets"),
    ("dataset:share", "Share datasets"),
    ("dataset:export", "Export datasets"),
    ("credential:read", "Read integration credentials"),
    ("credential:write", "Create, rotate, and revoke credentials"),
    ("connection:read", "Read integration connections"),
    ("connection:write", "Create, update, test, and delete connections"),
    ("ai:invoke", "Invoke AI compute"),
    ("job:create", "Create jobs"),
    ("job:read", "Read jobs"),
    ("notification:read", "Read notifications"),
    ("audit:read", "Read audit logs"),
    ("ops:read", "Read platform operations"),
    ("governance:read", "Read governance policies and compliance"),
    ("governance:write", "Manage governance policies and classification"),
    ("governance:admin", "Governance administrator — bypass restricted policies"),
    ("enterprise:read", "Read enterprise services"),
    ("enterprise:write", "Manage enterprise services configuration"),
    ("applications:read", "Read enterprise applications"),
    ("applications:write", "Manage enterprise applications"),
]

ROLE_PERMISSION_MAP = {
    Role.Codes.ORG_OWNER: [code for code, _ in DEFAULT_PERMISSIONS],
    Role.Codes.ORG_ADMIN: [
        "org:read",
        "org:update",
        "org:manage_members",
        "workspace:create",
        "workspace:read",
        "workspace:update",
        "workspace:delete",
        "storage:read",
        "storage:write",
        "dataset:read",
        "dataset:write",
        "dataset:delete",
        "dataset:share",
        "dataset:export",
        "credential:read",
        "credential:write",
        "connection:read",
        "connection:write",
        "ai:invoke",
        "job:create",
        "job:read",
        "notification:read",
        "audit:read",
        "ops:read",
        "governance:read",
        "governance:write",
        "governance:admin",
        "enterprise:read",
        "enterprise:write",
        "applications:read",
        "applications:write",
    ],
    Role.Codes.ORG_MEMBER: [
        "org:read",
        "workspace:read",
        "storage:read",
        "dataset:read",
        "dataset:export",
        "ai:invoke",
        "job:read",
        "notification:read",
    ],
    Role.Codes.WS_ADMIN: [
        "workspace:read",
        "workspace:update",
        "storage:read",
        "storage:write",
        "dataset:read",
        "dataset:write",
        "dataset:delete",
        "dataset:share",
        "dataset:export",
        "credential:read",
        "credential:write",
        "connection:read",
        "connection:write",
        "ai:invoke",
        "job:create",
        "job:read",
    ],
    Role.Codes.WS_MEMBER: [
        "workspace:read",
        "storage:read",
        "dataset:read",
        "dataset:export",
        "ai:invoke",
        "job:read",
    ],
}


class PermissionService:
    def permissions_for(self, *, user, organization_id, workspace_id=None) -> set[str]:
        memberships = Membership.objects.filter(
            user=user,
            organization_id=organization_id,
        ).select_related("role")
        codes: set[str] = set()
        for membership in memberships:
            if workspace_id and membership.workspace_id and membership.workspace_id != workspace_id:
                continue
            codes.update(membership.role.permissions.values_list("code", flat=True))
        return codes

    def has(self, *, user, organization_id, permission: str, workspace_id=None) -> bool:
        if getattr(user, "is_superuser", False):
            return True
        return permission in self.permissions_for(
            user=user, organization_id=organization_id, workspace_id=workspace_id
        )

    def require(self, *, user, organization_id, permission: str, workspace_id=None) -> None:
        if not self.has(
            user=user,
            organization_id=organization_id,
            permission=permission,
            workspace_id=workspace_id,
        ):
            raise PermissionDeniedError(f"Missing permission: {permission}")
