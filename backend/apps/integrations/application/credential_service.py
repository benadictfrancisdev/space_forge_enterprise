"""Credential lifecycle — create, rotate, revoke. Secrets never leave application layer."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, ValidationError
from apps.integrations.domain.auth import AuthMethod
from apps.integrations.infrastructure.encryption import (
    CURRENT_KEY_VERSION,
    decrypt_payload,
    encrypt_payload,
)
from apps.integrations.infrastructure.models import Credential
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService


class CredentialService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()

    def _get(self, *, credential_id, user, permission: str) -> Credential:
        try:
            credential = Credential.objects.get(id=credential_id)
        except Credential.DoesNotExist as exc:
            raise NotFoundError("Credential not found") from exc
        self.orgs.get_for_user(organization_id=credential.organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=credential.organization_id,
            permission=permission,
        )
        return credential

    def _validate_auth_method(self, auth_method: str) -> str:
        allowed = {m.value for m in AuthMethod}
        if auth_method not in allowed:
            raise ValidationError(f"Unsupported auth_method: {auth_method}")
        return auth_method

    @transaction.atomic
    def create(
        self,
        *,
        organization_id,
        user,
        name: str,
        auth_method: str,
        payload: dict,
        rotation_due_at=None,
    ) -> Credential:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="credential:write"
        )
        method = self._validate_auth_method(auth_method)
        if not (name or "").strip():
            raise ValidationError("name is required")

        credential = Credential.objects.create(
            organization_id=org.id,
            name=name.strip(),
            auth_method=method,
            encrypted_payload=encrypt_payload(payload),
            key_version=CURRENT_KEY_VERSION,
            status=Credential.Status.ACTIVE,
            rotation_due_at=rotation_due_at,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="credential.created",
            resource_type="credential",
            resource_id=str(credential.id),
            organization_id=org.id,
            after={
                "name": credential.name,
                "auth_method": credential.auth_method,
                "status": credential.status,
            },
        )
        return credential

    def list(self, *, organization_id, user, include_inactive: bool = False):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="credential:read"
        )
        qs = Credential.objects.filter(organization_id=org.id).order_by("-created_at")
        if not include_inactive:
            qs = qs.filter(status=Credential.Status.ACTIVE)
        return qs

    def get(self, *, credential_id, user) -> Credential:
        return self._get(credential_id=credential_id, user=user, permission="credential:read")

    def decrypt_for_use(self, *, credential_id, user) -> dict:
        """Internal use by connectors/jobs — never expose via API serializers."""
        credential = self._get(
            credential_id=credential_id, user=user, permission="credential:read"
        )
        if credential.status != Credential.Status.ACTIVE:
            raise ValidationError("Credential is not active")
        self.audit.record(
            actor=user,
            action="credential.accessed",
            resource_type="credential",
            resource_id=str(credential.id),
            organization_id=credential.organization_id,
            metadata={"purpose": "connector_use"},
        )
        return decrypt_payload(credential.encrypted_payload)

    @transaction.atomic
    def rotate(self, *, credential_id, user, payload: dict) -> Credential:
        old = self._get(credential_id=credential_id, user=user, permission="credential:write")
        if old.status != Credential.Status.ACTIVE:
            raise ValidationError("Only active credentials can be rotated")

        now = timezone.now()
        old.status = Credential.Status.ROTATED
        old.updated_by = user
        old.save(update_fields=["status", "updated_by", "updated_at"])

        new = Credential.objects.create(
            organization_id=old.organization_id,
            name=old.name,
            auth_method=old.auth_method,
            encrypted_payload=encrypt_payload(payload),
            key_version=CURRENT_KEY_VERSION,
            status=Credential.Status.ACTIVE,
            rotation_due_at=old.rotation_due_at,
            last_rotated_at=now,
            replaces=old,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="credential.rotated",
            resource_type="credential",
            resource_id=str(new.id),
            organization_id=old.organization_id,
            before={"id": str(old.id), "status": Credential.Status.ROTATED},
            after={"id": str(new.id), "status": Credential.Status.ACTIVE},
        )
        return new

    @transaction.atomic
    def delete(self, *, credential_id, user) -> None:
        credential = self._get(
            credential_id=credential_id, user=user, permission="credential:write"
        )
        credential.status = Credential.Status.REVOKED
        credential.updated_by = user
        credential.save(update_fields=["status", "updated_by", "updated_at"])
        credential.delete()  # soft-delete
        self.audit.record(
            actor=user,
            action="credential.deleted",
            resource_type="credential",
            resource_id=str(credential.id),
            organization_id=credential.organization_id,
            after={"name": credential.name, "status": Credential.Status.REVOKED},
        )
