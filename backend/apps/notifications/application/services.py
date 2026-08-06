from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.notifications.infrastructure.models import Notification
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService


class NotificationService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()

    @transaction.atomic
    def send(
        self,
        *,
        organization_id,
        user,
        title: str,
        body: str = "",
        channel: str = Notification.Channel.IN_APP,
        payload: dict | None = None,
    ) -> Notification:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        notification = Notification.objects.create(
            organization_id=org.id,
            user=user,
            title=title,
            body=body,
            channel=channel,
            payload=payload or {},
            status=Notification.Status.SENT,
            sent_at=timezone.now(),
            created_by=user,
            updated_by=user,
        )
        return notification

    def list_for_user(self, *, user, organization_id=None):
        if organization_id:
            org = self.orgs.get_for_user(organization_id=organization_id, user=user)
            self.permissions.require(
                user=user, organization_id=org.id, permission="notification:read"
            )
            return Notification.objects.filter(user=user, organization_id=org.id)
        return Notification.objects.filter(user=user)
