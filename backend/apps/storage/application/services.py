from __future__ import annotations

import logging
from uuid import uuid4

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.storage.application.factory import get_object_storage
from apps.storage.infrastructure.models import StorageObject

logger = logging.getLogger("spaceforge.storage")


class StorageService:
    def __init__(self):
        self.provider = get_object_storage()
        self.permissions = PermissionService()
        self.orgs = OrganizationService()
        self.audit = AuditService()

    @transaction.atomic
    def upload(
        self,
        *,
        organization_id,
        user,
        filename: str,
        content: bytes,
        content_type: str = "application/octet-stream",
        workspace_id=None,
        metadata: dict | None = None,
    ) -> StorageObject:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="storage:write")
        key = f"orgs/{org.id}/{workspace_id or 'default'}/{uuid4()}/{filename}"
        stored = self.provider.upload(
            key=key,
            body=content,
            content_type=content_type,
            metadata=metadata,
        )
        obj = StorageObject.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            bucket=getattr(self.provider, "bucket", "default"),
            key=key,
            filename=filename,
            content_type=content_type,
            size_bytes=stored.size_bytes,
            checksum_sha256=stored.checksum_sha256,
            metadata=stored.metadata,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="storage.uploaded",
            resource_type="storage_object",
            resource_id=str(obj.id),
            organization_id=org.id,
            after={"key": key, "filename": filename, "size_bytes": stored.size_bytes},
        )
        return obj

    def download(self, *, object_id, user) -> tuple[StorageObject, bytes]:
        obj = self._get_for_user(object_id=object_id, user=user, permission="storage:read")
        return obj, self.provider.download(key=obj.key)

    def delete(self, *, object_id, user) -> None:
        obj = self._get_for_user(object_id=object_id, user=user, permission="storage:write")
        self.provider.delete(key=obj.key)
        obj.delete()
        self.audit.record(
            actor=user,
            action="storage.deleted",
            resource_type="storage_object",
            resource_id=str(obj.id),
            organization_id=obj.organization_id,
        )

    def signed_url(self, *, object_id, user, expires_in: int = 3600) -> str:
        obj = self._get_for_user(object_id=object_id, user=user, permission="storage:read")
        return self.provider.signed_url(key=obj.key, expires_in=expires_in)

    def list(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="storage:read")
        return StorageObject.objects.filter(organization_id=org.id).order_by("-created_at")

    def _get_for_user(self, *, object_id, user, permission: str) -> StorageObject:
        try:
            obj = StorageObject.objects.get(id=object_id)
        except StorageObject.DoesNotExist as exc:
            raise NotFoundError("Storage object not found") from exc
        self.orgs.get_for_user(organization_id=obj.organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=obj.organization_id, permission=permission
        )
        return obj
