from __future__ import annotations

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from apps.datasets.application.profiling import profile_tabular_bytes
from apps.datasets.infrastructure.models import Dataset
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.storage.application.services import StorageService
from apps.storage.infrastructure.models import StorageObject
from apps.workspaces.infrastructure.models import Workspace


class DatasetService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.storage = StorageService()

    def _get(self, *, dataset_id, user, permission: str) -> Dataset:
        try:
            dataset = Dataset.objects.select_related("storage_object").get(id=dataset_id)
        except Dataset.DoesNotExist as exc:
            raise NotFoundError("Dataset not found") from exc
        self.orgs.get_for_user(organization_id=dataset.organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=dataset.organization_id,
            permission=permission,
            workspace_id=dataset.workspace_id,
        )
        return dataset

    def _assert_workspace(self, *, organization_id, workspace_id) -> Workspace:
        try:
            return Workspace.objects.get(id=workspace_id, organization_id=organization_id)
        except Workspace.DoesNotExist as exc:
            raise ValidationError("workspace_id not found in organization") from exc

    @transaction.atomic
    def create(
        self,
        *,
        organization_id,
        workspace_id,
        user,
        name: str,
        description: str = "",
        storage_object_id=None,
        schema: dict | None = None,
        row_count: int | None = None,
    ) -> Dataset:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=org.id,
            permission="dataset:write",
            workspace_id=workspace_id,
        )
        self._assert_workspace(organization_id=org.id, workspace_id=workspace_id)

        storage_obj = None
        if storage_object_id:
            try:
                storage_obj = StorageObject.objects.get(
                    id=storage_object_id, organization_id=org.id
                )
            except StorageObject.DoesNotExist as exc:
                raise ValidationError("storage_object_id not found in organization") from exc

        dataset = Dataset.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            name=name,
            description=description,
            storage_object=storage_obj,
            schema=schema or {},
            row_count=row_count,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="dataset.created",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=org.id,
            after={"name": name, "storage_object_id": str(storage_object_id or "")},
        )
        return dataset

    def list(self, *, organization_id, user, workspace_id=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        qs = (
            Dataset.objects.filter(organization_id=org.id)
            .select_related("storage_object")
            .defer("schema", "statistics")
            .order_by("-created_at")
        )
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        return qs

    def get(self, *, dataset_id, user) -> Dataset:
        return self._get(dataset_id=dataset_id, user=user, permission="dataset:read")

    @transaction.atomic
    def bind_storage(self, *, dataset_id, user, storage_object_id) -> Dataset:
        dataset = self._get(dataset_id=dataset_id, user=user, permission="dataset:write")
        try:
            storage_obj = StorageObject.objects.get(
                id=storage_object_id, organization_id=dataset.organization_id
            )
        except StorageObject.DoesNotExist as exc:
            raise ValidationError("storage_object_id not found in organization") from exc
        dataset.storage_object = storage_obj
        dataset.updated_by = user
        dataset.save(update_fields=["storage_object", "updated_by", "updated_at"])
        self.audit.record(
            actor=user,
            action="dataset.bind_storage",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
            after={"storage_object_id": str(storage_object_id)},
        )
        return dataset

    @transaction.atomic
    def delete(self, *, dataset_id, user) -> None:
        dataset = self._get(dataset_id=dataset_id, user=user, permission="dataset:delete")
        org_id = dataset.organization_id
        did = str(dataset.id)
        dataset.delete()
        self.audit.record(
            actor=user,
            action="dataset.deleted",
            resource_type="dataset",
            resource_id=did,
            organization_id=org_id,
        )

    def export_manifest(self, *, dataset_id, user) -> dict:
        dataset = self._get(dataset_id=dataset_id, user=user, permission="dataset:export")
        self.audit.record(
            actor=user,
            action="dataset.export",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
        )
        return {
            "dataset_id": str(dataset.id),
            "name": dataset.name,
            "schema": dataset.schema,
            "statistics": dataset.statistics,
            "row_count": dataset.row_count,
            "profile_status": dataset.profile_status,
        }

    def share(self, *, dataset_id, user, grantee_email: str, permission: str = "dataset:read") -> dict:
        dataset = self._get(dataset_id=dataset_id, user=user, permission="dataset:share")
        allowed = {"dataset:read", "dataset:write", "dataset:export"}
        if permission not in allowed:
            raise ValidationError("Invalid share permission")
        self.audit.record(
            actor=user,
            action="dataset.share",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
            after={"grantee_email": grantee_email, "permission": permission},
        )
        return {
            "dataset_id": str(dataset.id),
            "grantee_email": grantee_email,
            "permission": permission,
            "status": "recorded",
        }

    def enqueue_profile(self, *, dataset_id, user) -> Dataset:
        dataset = self._get(dataset_id=dataset_id, user=user, permission="dataset:write")
        if not dataset.storage_object_id:
            raise ValidationError("Dataset has no storage_object — upload a file first")

        from apps.jobs.application.services import JobService

        dataset.profile_status = Dataset.ProfileStatus.RUNNING
        dataset.save(update_fields=["profile_status", "updated_at"])

        JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type="dataset.profile",
            payload={"dataset_id": str(dataset.id)},
        )
        self.audit.record(
            actor=user,
            action="dataset.profile_enqueued",
            resource_type="dataset",
            resource_id=str(dataset.id),
            organization_id=dataset.organization_id,
        )
        return self.get(dataset_id=dataset.id, user=user)

    def apply_profile_result(
        self, *, dataset_id, schema: dict, statistics: dict, row_count: int
    ) -> Dataset:
        dataset = Dataset.objects.get(id=dataset_id)
        dataset.schema = schema
        dataset.statistics = statistics
        dataset.row_count = row_count
        dataset.profile_status = Dataset.ProfileStatus.READY
        dataset.status = Dataset.Status.READY
        dataset.version = (dataset.version or 1) + 1
        dataset.save(
            update_fields=[
                "schema",
                "statistics",
                "row_count",
                "profile_status",
                "status",
                "version",
                "updated_at",
            ]
        )
        return dataset

    def mark_profile_failed(self, *, dataset_id, error: str) -> Dataset:
        dataset = Dataset.objects.get(id=dataset_id)
        dataset.profile_status = Dataset.ProfileStatus.FAILED
        dataset.statistics = {**(dataset.statistics or {}), "error": error}
        dataset.save(update_fields=["profile_status", "statistics", "updated_at"])
        return dataset

    def run_profile_now(self, *, dataset_id, organization_id) -> Dataset:
        """Called by Celery worker — no user context."""
        try:
            dataset = Dataset.objects.select_related("storage_object").get(
                id=dataset_id, organization_id=organization_id
            )
        except Dataset.DoesNotExist as exc:
            raise PermissionDeniedError(
                "Cross-tenant resource access blocked in worker."
            ) from exc
        if not dataset.storage_object_id:
            raise ValidationError("No storage object")
        content = self.storage.provider.download(key=dataset.storage_object.key)
        result = profile_tabular_bytes(content, filename=dataset.storage_object.filename)
        return self.apply_profile_result(
            dataset_id=dataset.id,
            schema=result["schema"],
            statistics=result["statistics"],
            row_count=result["row_count"],
        )
