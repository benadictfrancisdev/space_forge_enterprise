from __future__ import annotations

import re

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.core.exceptions import ConflictError, NotFoundError, PermissionDeniedError
from apps.events.application.services import EventService
from apps.memberships.infrastructure.models import Membership
from apps.organizations.infrastructure.models import Organization
from apps.permissions.application.services import PermissionService
from apps.permissions.infrastructure.models import Role


def slugify(value: str) -> str:
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-")[:64] or "org"


class OrganizationService:
    def __init__(self):
        self.audit = AuditService()
        self.events = EventService()
        self.permissions = PermissionService()

    @transaction.atomic
    def create(self, *, name: str, owner, slug: str | None = None) -> Organization:
        base = slugify(slug or name)
        candidate = base
        n = 1
        while Organization.objects.filter(slug=candidate).exists():
            n += 1
            candidate = f"{base}-{n}"[:64]

        org = Organization.objects.create(
            name=name,
            slug=candidate,
            created_by=owner,
            updated_by=owner,
        )
        owner_role = Role.objects.get(code=Role.Codes.ORG_OWNER, scope=Role.Scope.ORGANIZATION)
        Membership.objects.create(
            organization_id=org.id,
            user=owner,
            role=owner_role,
            created_by=owner,
            updated_by=owner,
        )
        self.audit.record(
            actor=owner,
            action="organization.created",
            resource_type="organization",
            resource_id=str(org.id),
            organization_id=org.id,
            after={"name": org.name, "slug": org.slug},
        )
        self.events.publish(
            event_type="organization.created",
            organization_id=org.id,
            payload={"organization_id": str(org.id), "name": org.name},
            actor_id=owner.id,
        )
        return org

    def get_for_user(self, *, organization_id, user) -> Organization:
        try:
            org = Organization.objects.get(id=organization_id)
        except Organization.DoesNotExist as exc:
            raise NotFoundError("Organization not found") from exc
        if not Membership.objects.filter(organization_id=org.id, user=user).exists():
            raise PermissionDeniedError("Not a member of this organization")
        return org

    def list_for_user(self, user):
        org_ids = Membership.objects.filter(user=user, workspace__isnull=True).values_list(
            "organization_id", flat=True
        )
        return Organization.objects.filter(id__in=org_ids)

    def update(self, *, organization_id, user, name: str | None = None) -> Organization:
        org = self.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=org.id,
            permission="org:update",
        )
        before = {"name": org.name}
        if name:
            org.name = name
            org.updated_by = user
            org.save(update_fields=["name", "updated_by", "updated_at"])
        self.audit.record(
            actor=user,
            action="organization.updated",
            resource_type="organization",
            resource_id=str(org.id),
            organization_id=org.id,
            before=before,
            after={"name": org.name},
        )
        return org
