"""Connection registry — CRUD, health, and connector.test job enqueue."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from apps.integrations.application.connector_registry import get_connector_registry
from apps.integrations.application.credential_service import CredentialService
from apps.integrations.domain.auth import AuthMethod
from apps.integrations.domain.connector import TestResult
from apps.integrations.infrastructure.encryption import decrypt_payload
from apps.integrations.infrastructure.models import Connection, Credential
from apps.jobs.application.services import JobService
from apps.jobs.infrastructure.models import Job
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.workspaces.infrastructure.models import Workspace

CONNECTOR_TEST_JOB = "connector.test"


class ConnectionService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.credentials = CredentialService()
        self.jobs = JobService()

    def _get(self, *, connection_id, user, permission: str) -> Connection:
        try:
            connection = Connection.objects.select_related("credential", "target_dataset").get(
                id=connection_id
            )
        except Connection.DoesNotExist as exc:
            raise NotFoundError("Connection not found") from exc
        self.orgs.get_for_user(organization_id=connection.organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=connection.organization_id,
            permission=permission,
            workspace_id=connection.workspace_id,
        )
        return connection

    def _assert_workspace(self, *, organization_id, workspace_id) -> Workspace:
        try:
            return Workspace.objects.get(id=workspace_id, organization_id=organization_id)
        except Workspace.DoesNotExist as exc:
            raise ValidationError("workspace_id not found in organization") from exc

    def _resolve_credentials_dict(self, connection: Connection) -> dict:
        if not connection.credential_id:
            return {}
        credential = connection.credential
        if credential is None or credential.status != Credential.Status.ACTIVE:
            raise ValidationError("Connection credential is missing or inactive")
        if credential.organization_id != connection.organization_id:
            raise ValidationError("Credential organization mismatch")
        return decrypt_payload(credential.encrypted_payload)

    @transaction.atomic
    def create(
        self,
        *,
        organization_id,
        workspace_id,
        user,
        name: str,
        connector_type: str,
        config: dict | None = None,
        connector_version: str | None = None,
        credential_id=None,
        secrets: dict | None = None,
        auth_method: str | None = None,
        sync_schedule: str = "manual",
        is_active: bool = True,
    ) -> Connection:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user,
            organization_id=org.id,
            permission="connection:write",
            workspace_id=workspace_id,
        )
        self._assert_workspace(organization_id=org.id, workspace_id=workspace_id)
        if not (name or "").strip():
            raise ValidationError("name is required")
        if not (connector_type or "").strip():
            raise ValidationError("connector_type is required")

        credential = None
        if credential_id:
            try:
                credential = Credential.objects.get(
                    id=credential_id,
                    organization_id=org.id,
                    status=Credential.Status.ACTIVE,
                )
            except Credential.DoesNotExist as exc:
                raise ValidationError("credential_id not found in organization") from exc
        elif secrets:
            method = auth_method or AuthMethod.PASSWORD.value
            credential = self.credentials.create(
                organization_id=org.id,
                user=user,
                name=f"{name.strip()} credentials",
                auth_method=method,
                payload=secrets,
            )

        version = connector_version
        if not version:
            try:
                version = get_connector_registry().get(connector_type.strip()).version
            except NotFoundError:
                version = "1.0.0"

        connection = Connection.objects.create(
            organization_id=org.id,
            workspace_id=workspace_id,
            name=name.strip(),
            connector_type=connector_type.strip(),
            connector_version=version,
            credential=credential,
            config=config or {},
            sync_schedule=sync_schedule or "manual",
            is_active=is_active,
            owner=user,
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="connection.created",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=org.id,
            after={
                "name": connection.name,
                "connector_type": connection.connector_type,
                "workspace_id": str(workspace_id),
            },
        )
        return connection

    def list(self, *, organization_id, user, workspace_id=None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="connection:read"
        )
        qs = (
            Connection.objects.filter(organization_id=org.id)
            .select_related("credential", "target_dataset")
            .order_by("-created_at")
        )
        if workspace_id:
            qs = qs.filter(workspace_id=workspace_id)
        return qs

    def get(self, *, connection_id, user) -> Connection:
        return self._get(
            connection_id=connection_id, user=user, permission="connection:read"
        )

    @transaction.atomic
    def update(
        self,
        *,
        connection_id,
        user,
        name: str | None = None,
        config: dict | None = None,
        sync_schedule: str | None = None,
        is_active: bool | None = None,
        secrets: dict | None = None,
    ) -> Connection:
        connection = self._get(
            connection_id=connection_id, user=user, permission="connection:write"
        )
        fields = ["updated_by", "updated_at"]
        if name is not None:
            if not name.strip():
                raise ValidationError("name is required")
            connection.name = name.strip()
            fields.append("name")
        if config is not None:
            connection.config = config
            fields.append("config")
        if sync_schedule is not None:
            connection.sync_schedule = sync_schedule
            fields.append("sync_schedule")
        if is_active is not None:
            connection.is_active = is_active
            fields.append("is_active")
        if secrets:
            if connection.credential_id:
                rotated = self.credentials.rotate(
                    credential_id=connection.credential_id, user=user, payload=secrets
                )
                connection.credential = rotated
                fields.append("credential")
            else:
                created = self.credentials.create(
                    organization_id=connection.organization_id,
                    user=user,
                    name=f"{connection.name} credentials",
                    auth_method=AuthMethod.PASSWORD.value,
                    payload=secrets,
                )
                connection.credential = created
                fields.append("credential")
        connection.updated_by = user
        connection.save(update_fields=fields)
        self.audit.record(
            actor=user,
            action="connection.updated",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=connection.organization_id,
            after={"name": connection.name, "is_active": connection.is_active},
        )
        return connection

    @transaction.atomic
    def delete(self, *, connection_id, user) -> None:
        connection = self._get(
            connection_id=connection_id, user=user, permission="connection:write"
        )
        connection.is_active = False
        connection.updated_by = user
        connection.save(update_fields=["is_active", "updated_by", "updated_at"])
        connection.delete()
        self.audit.record(
            actor=user,
            action="connection.deleted",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=connection.organization_id,
            after={"name": connection.name},
        )

    def test_draft(
        self,
        *,
        organization_id,
        user,
        connector_type: str,
        config: dict | None = None,
        credentials: dict | None = None,
        connector_version: str | None = None,
    ) -> TestResult:
        """Framework test without persisting a Connection (form preview)."""
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="connection:write"
        )
        registry = get_connector_registry()
        try:
            connector = registry.get(connector_type, version=connector_version)
        except NotFoundError:
            return TestResult(
                ok=False,
                message=f"Connector plugin '{connector_type}' is not installed yet",
                details={"connector_type": connector_type},
            )
        return connector.test_connection(
            config=config or {}, credentials=credentials or {}
        )

    @transaction.atomic
    def enqueue_test(self, *, connection_id, user) -> Job:
        connection = self._get(
            connection_id=connection_id, user=user, permission="connection:write"
        )
        connection.health_status = Connection.HealthStatus.TESTING
        connection.last_health_message = "test queued"
        connection.updated_by = user
        connection.save(
            update_fields=[
                "health_status",
                "last_health_message",
                "updated_by",
                "updated_at",
            ]
        )
        job = self.jobs.enqueue(
            organization_id=connection.organization_id,
            user=user,
            job_type=CONNECTOR_TEST_JOB,
            payload={"connection_id": str(connection.id)},
            workspace_id=connection.workspace_id,
            timeout_seconds=30,
            max_retries=1,
        )
        self.audit.record(
            actor=user,
            action="connection.test_enqueued",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=connection.organization_id,
            after={"job_id": str(job.id)},
        )
        connection.refresh_from_db()
        return job

    def apply_test_result(
        self, *, connection_id, result: TestResult, actor=None
    ) -> Connection:
        try:
            connection = Connection.objects.get(id=connection_id)
        except Connection.DoesNotExist as exc:
            raise NotFoundError("Connection not found") from exc
        connection.health_status = (
            Connection.HealthStatus.HEALTHY
            if result.ok
            else Connection.HealthStatus.UNHEALTHY
        )
        connection.last_health_message = result.message or (
            "ok" if result.ok else "test failed"
        )
        connection.last_tested_at = timezone.now()
        connection.save(
            update_fields=[
                "health_status",
                "last_health_message",
                "last_tested_at",
                "updated_at",
            ]
        )
        if actor is not None:
            self.audit.record(
                actor=actor,
                action="connection.tested",
                resource_type="connection",
                resource_id=str(connection.id),
                organization_id=connection.organization_id,
                after={
                    "health_status": connection.health_status,
                    "ok": result.ok,
                },
            )
        return connection

    def run_test_for_job(self, *, connection_id, organization_id) -> dict:
        """Worker entrypoint — no HTTP user permission checks."""
        try:
            connection = Connection.objects.select_related("credential").get(
                id=connection_id, organization_id=organization_id
            )
        except Connection.DoesNotExist as exc:
            raise PermissionDeniedError(
                "Cross-tenant resource access blocked in worker."
            ) from exc

        registry = get_connector_registry()
        try:
            connector = registry.get(
                connection.connector_type, version=connection.connector_version
            )
        except NotFoundError:
            # Fall back to latest type if exact version missing
            try:
                connector = registry.get(connection.connector_type)
            except NotFoundError as exc:
                result = TestResult(
                    ok=False,
                    message=(
                        f"Connector plugin '{connection.connector_type}' "
                        "is not installed yet"
                    ),
                )
                self.apply_test_result(connection_id=connection.id, result=result)
                return {
                    "ok": False,
                    "message": result.message,
                    "connection_id": str(connection.id),
                    "health_status": Connection.HealthStatus.UNHEALTHY,
                }

        credentials = self._resolve_credentials_dict(connection)
        result = connector.test_connection(
            config=connection.config or {}, credentials=credentials
        )
        updated = self.apply_test_result(
            connection_id=connection.id,
            result=result,
            actor=connection.owner or connection.created_by,
        )
        return {
            "ok": result.ok,
            "message": result.message,
            "details": result.details or {},
            "connection_id": str(updated.id),
            "health_status": updated.health_status,
        }
