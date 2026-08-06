from __future__ import annotations

import re

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError
from apps.events.application.services import EventService
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.workspaces.infrastructure.models import Workspace


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:64] or "workspace"


class WorkspaceService:
    def __init__(self):
        self.audit = AuditService()
        self.events = EventService()
        self.permissions = PermissionService()
        self.orgs = OrganizationService()

    @transaction.atomic
    def create(self, *, organization_id, user, name: str, slug: str | None = None) -> Workspace:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="workspace:create")
        base = slugify(slug or name)
        candidate = base
        n = 1
        while Workspace.objects.filter(organization_id=org.id, slug=candidate).exists():
            n += 1
            candidate = f"{base}-{n}"[:64]

        workspace = Workspace.objects.create(
            organization_id=org.id,
            name=name,
            slug=candidate,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="workspace.created",
            resource_type="workspace",
            resource_id=str(workspace.id),
            organization_id=org.id,
            after={"name": workspace.name, "slug": workspace.slug},
        )
        self.events.publish(
            event_type="workspace.created",
            organization_id=org.id,
            payload={
                "workspace_id": str(workspace.id),
                "organization_id": str(org.id),
                "name": workspace.name,
            },
            actor_id=user.id,
        )
        return workspace

    def list_for_org(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="workspace:read")
        return Workspace.objects.filter(organization_id=org.id)

    def get(self, *, workspace_id, user) -> Workspace:
        try:
            workspace = Workspace.objects.get(id=workspace_id)
        except Workspace.DoesNotExist as exc:
            raise NotFoundError("Workspace not found") from exc
        self.orgs.get_for_user(organization_id=workspace.organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=workspace.organization_id,
            permission="workspace:read",
            workspace_id=workspace.id,
        )
        return workspace
