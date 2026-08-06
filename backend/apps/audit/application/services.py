from __future__ import annotations

from apps.audit.infrastructure.models import AuditLog
from apps.core.logging import get_trace_id


class AuditService:
    def record(
        self,
        *,
        actor,
        action: str,
        resource_type: str,
        resource_id: str = "",
        organization_id=None,
        before=None,
        after=None,
        metadata=None,
    ) -> AuditLog:
        return AuditLog.objects.create(
            actor=actor,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            organization_id=organization_id,
            before=before,
            after=after,
            metadata=metadata or {},
            trace_id=get_trace_id(),
        )

    def list_for_org(self, *, organization_id, user):
        from apps.organizations.application.services import OrganizationService
        from apps.permissions.application.services import PermissionService

        org = OrganizationService().get_for_user(organization_id=organization_id, user=user)
        PermissionService().require(user=user, organization_id=org.id, permission="audit:read")
        return (
            AuditLog.objects.filter(organization_id=org.id)
            .select_related("actor")
            .order_by("-created_at")
        )
