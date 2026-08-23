"""Schema discovery orchestration — connector.discover job."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from apps.integrations.application.connection_service import ConnectionService
from apps.integrations.application.connector_registry import get_connector_registry
from apps.integrations.domain.schema import schema_fingerprint, schema_to_tables_payload
from apps.integrations.infrastructure.models import Connection, SchemaSnapshot
from apps.jobs.application.services import JobService
from apps.jobs.infrastructure.models import Job

CONNECTOR_DISCOVER_JOB = "connector.discover"


class DiscoveryService:
    def __init__(self):
        self.connections = ConnectionService()
        self.jobs = JobService()
        self.audit = AuditService()

    def get_latest(self, *, connection_id, user) -> SchemaSnapshot:
        connection = self.connections.get(
            connection_id=connection_id, user=user
        )
        snapshot = (
            SchemaSnapshot.objects.filter(connection_id=connection.id)
            .order_by("-version")
            .first()
        )
        if snapshot is None:
            raise NotFoundError("No schema snapshot for connection")
        return snapshot

    def get_version(self, *, connection_id, user, version: int) -> SchemaSnapshot:
        connection = self.connections.get(
            connection_id=connection_id, user=user
        )
        try:
            return SchemaSnapshot.objects.get(
                connection_id=connection.id, version=version
            )
        except SchemaSnapshot.DoesNotExist as exc:
            raise NotFoundError(f"Schema version {version} not found") from exc

    def list_versions(self, *, connection_id, user):
        connection = self.connections.get(
            connection_id=connection_id, user=user
        )
        return SchemaSnapshot.objects.filter(connection_id=connection.id).order_by(
            "-version"
        )

    @transaction.atomic
    def enqueue_discover(self, *, connection_id, user) -> Job:
        connection = self.connections._get(
            connection_id=connection_id, user=user, permission="connection:write"
        )
        job = self.jobs.enqueue(
            organization_id=connection.organization_id,
            user=user,
            job_type=CONNECTOR_DISCOVER_JOB,
            payload={"connection_id": str(connection.id)},
            workspace_id=connection.workspace_id,
            timeout_seconds=120,
            max_retries=1,
        )
        self.audit.record(
            actor=user,
            action="connection.discover_enqueued",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=connection.organization_id,
            after={"job_id": str(job.id)},
        )
        return job

    def run_discover_for_job(self, *, connection_id, organization_id) -> dict:
        """Worker entrypoint — discover schema and version snapshots."""
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
            try:
                connector = registry.get(connection.connector_type)
            except NotFoundError as exc:
                raise ValidationError(
                    f"Connector plugin '{connection.connector_type}' is not installed yet"
                ) from exc

        if not connector.capabilities.supports_schema_discovery:
            raise ValidationError(
                f"Connector '{connection.connector_type}' does not support schema discovery"
            )

        credentials = self.connections._resolve_credentials_dict(connection)
        discovered = connector.discover_schema(
            config=connection.config or {}, credentials=credentials
        )
        tables_payload = schema_to_tables_payload(discovered)
        fingerprint = schema_fingerprint(tables_payload)
        now = timezone.now()

        latest = (
            SchemaSnapshot.objects.filter(connection_id=connection.id)
            .order_by("-version")
            .first()
        )

        changed = True
        if latest is not None and latest.fingerprint == fingerprint:
            # Idempotent: refresh timestamp only, keep version
            latest.discovered_at = now
            latest.metadata = {
                **(latest.metadata or {}),
                **(discovered.metadata or {}),
                "refreshed_at": now.isoformat(),
            }
            latest.save(update_fields=["discovered_at", "metadata", "updated_at"])
            snapshot = latest
            changed = False
        else:
            next_version = (latest.version + 1) if latest else 1
            snapshot = SchemaSnapshot.objects.create(
                organization_id=connection.organization_id,
                workspace_id=connection.workspace_id,
                connection=connection,
                version=next_version,
                discovered_at=now,
                tables=tables_payload,
                fingerprint=fingerprint,
                metadata=discovered.metadata or {},
                created_by=connection.owner or connection.created_by,
                updated_by=connection.owner or connection.created_by,
            )
            connection.schema_version = next_version
            connection.save(update_fields=["schema_version", "updated_at"])

        actor = connection.owner or connection.created_by
        if actor is not None:
            self.audit.record(
                actor=actor,
                action="connection.schema_discovered",
                resource_type="connection",
                resource_id=str(connection.id),
                organization_id=connection.organization_id,
                after={
                    "schema_version": snapshot.version,
                    "changed": changed,
                    "table_count": len(tables_payload),
                    "fingerprint": fingerprint,
                },
            )

        return {
            "ok": True,
            "connection_id": str(connection.id),
            "schema_version": snapshot.version,
            "changed": changed,
            "table_count": len(tables_payload),
            "fingerprint": fingerprint,
            "snapshot_id": str(snapshot.id),
        }
