"""Synchronization engine — extract → storage → dataset (Track 11.5)."""
from __future__ import annotations

import csv
import io
from datetime import datetime, timezone as dt_timezone

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, PermissionDeniedError, ValidationError
from apps.datasets.application.services import DatasetService
from apps.integrations.application.connection_service import ConnectionService
from apps.integrations.application.connector_registry import get_connector_registry
from apps.integrations.application.discovery_service import DiscoveryService
from apps.integrations.domain.sync import SyncCursor, SyncMode
from apps.integrations.infrastructure.models import Connection, SyncRun
from apps.jobs.application.pipeline import JobCancelled
from apps.jobs.application.services import JobService
from apps.jobs.infrastructure.models import Job
from apps.storage.application.services import StorageService
from apps.integrations.application.transform_service import TransformService

CONNECTOR_SYNC_JOB = "connector.sync"
DEFAULT_BATCH_SIZE = 100


def _rows_to_csv_bytes(rows: list[dict]) -> bytes:
    if not rows:
        return b""
    fieldnames: list[str] = list(rows[0].keys())
    for row in rows[1:]:
        for key in row:
            if key not in fieldnames:
                fieldnames.append(key)
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=fieldnames, extrasaction="ignore")
    writer.writeheader()
    for row in rows:
        writer.writerow({k: row.get(k, "") for k in fieldnames})
    return buf.getvalue().encode("utf-8")


class SyncService:
    def __init__(self):
        self.connections = ConnectionService()
        self.jobs = JobService()
        self.audit = AuditService()
        self.storage = StorageService()
        self.datasets = DatasetService()
        self.discovery = DiscoveryService()
        self.transforms = TransformService()

    def list_runs(self, *, connection_id, user):
        connection = self.connections.get(connection_id=connection_id, user=user)
        return SyncRun.objects.filter(connection_id=connection.id).order_by("-created_at")

    def get_run(self, *, sync_run_id, user) -> SyncRun:
        try:
            run = SyncRun.objects.select_related("connection", "job", "dataset").get(
                id=sync_run_id
            )
        except SyncRun.DoesNotExist as exc:
            raise NotFoundError("Sync run not found") from exc
        self.connections.get(connection_id=run.connection_id, user=user)
        return run

    def enqueue_sync(
        self,
        *,
        connection_id,
        user,
        mode: str = SyncMode.FULL.value,
        batch_size: int = DEFAULT_BATCH_SIZE,
    ) -> tuple[Job, SyncRun]:
        connection = self.connections._get(
            connection_id=connection_id, user=user, permission="connection:write"
        )
        mode_norm = (mode or SyncMode.FULL.value).lower()
        if mode_norm not in {SyncMode.FULL.value, SyncMode.INCREMENTAL.value}:
            raise ValidationError("mode must be 'full' or 'incremental'")
        if mode_norm == SyncMode.INCREMENTAL.value:
            registry = get_connector_registry()
            try:
                connector = registry.get(connection.connector_type)
            except NotFoundError as exc:
                raise ValidationError(
                    f"Connector plugin '{connection.connector_type}' is not installed yet"
                ) from exc
            if not connector.capabilities.supports_incremental_sync:
                raise ValidationError(
                    f"Connector '{connection.connector_type}' does not support incremental sync"
                )

        # Create SyncRun before enqueue so eager workers can update it in-place.
        run = SyncRun.objects.create(
            organization_id=connection.organization_id,
            workspace_id=connection.workspace_id,
            connection=connection,
            mode=mode_norm,
            status=SyncRun.Status.QUEUED,
            created_by=user,
            updated_by=user,
        )
        job = self.jobs.enqueue(
            organization_id=connection.organization_id,
            user=user,
            job_type=CONNECTOR_SYNC_JOB,
            payload={
                "connection_id": str(connection.id),
                "sync_run_id": str(run.id),
                "mode": mode_norm,
                "batch_size": max(1, int(batch_size or DEFAULT_BATCH_SIZE)),
            },
            workspace_id=connection.workspace_id,
            timeout_seconds=600,
            max_retries=1,
        )
        run.job = job
        run.save(update_fields=["job", "updated_at"])
        run.refresh_from_db()
        job.refresh_from_db()

        self.audit.record(
            actor=user,
            action="connection.sync_enqueued",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=connection.organization_id,
            after={
                "job_id": str(job.id),
                "mode": mode_norm,
                "sync_run_id": str(run.id),
            },
        )
        return job, run

    def run_sync_for_job(self, *, job: Job, job_service: JobService) -> dict:
        """Worker entrypoint for connector.sync."""
        payload = job.payload or {}
        connection_id = payload.get("connection_id")
        if not connection_id:
            raise ValueError("connection_id required in payload")
        mode_norm = (payload.get("mode") or SyncMode.FULL.value).lower()
        batch_size = max(1, int(payload.get("batch_size") or DEFAULT_BATCH_SIZE))
        mode = SyncMode(mode_norm)

        try:
            connection = Connection.objects.select_related(
                "credential", "target_dataset"
            ).get(id=connection_id, organization_id=job.organization_id)
        except Connection.DoesNotExist as exc:
            raise PermissionDeniedError(
                "Cross-tenant resource access blocked in worker."
            ) from exc

        actor = job.created_by or connection.owner or connection.created_by
        if actor is None:
            raise ValidationError("Sync requires a user actor on the job")

        sync_run_id = payload.get("sync_run_id")
        run = None
        if sync_run_id:
            run = SyncRun.objects.filter(
                id=sync_run_id, organization_id=job.organization_id
            ).first()
        if run is None:
            run = SyncRun.objects.filter(job_id=job.id).first()
        if run is None:
            run = SyncRun.objects.create(
                organization_id=connection.organization_id,
                workspace_id=connection.workspace_id,
                connection=connection,
                job=job,
                mode=mode_norm,
                status=SyncRun.Status.RUNNING,
                started_at=timezone.now(),
                created_by=actor,
                updated_by=actor,
            )
        else:
            run.job = job
            run.status = SyncRun.Status.RUNNING
            run.started_at = timezone.now()
            run.save(update_fields=["job", "status", "started_at", "updated_at"])

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

        if mode == SyncMode.FULL and not connector.capabilities.supports_full_sync:
            raise ValidationError("Connector does not support full sync")
        if (
            mode == SyncMode.INCREMENTAL
            and not connector.capabilities.supports_incremental_sync
        ):
            raise ValidationError("Connector does not support incremental sync")

        if connection.schema_version == 0 and connector.capabilities.supports_schema_discovery:
            self.discovery.run_discover_for_job(
                connection_id=str(connection.id),
                organization_id=connection.organization_id,
            )
            connection.refresh_from_db()

        credentials = self.connections._resolve_credentials_dict(connection)

        if mode == SyncMode.INCREMENTAL:
            last = (
                SyncRun.objects.filter(
                    connection_id=connection.id,
                    status=SyncRun.Status.SUCCEEDED,
                )
                .exclude(id=run.id)
                .order_by("-finished_at", "-created_at")
                .first()
            )
            cursor = SyncCursor(state=dict(last.cursor_state or {}) if last else {})
        else:
            cursor = SyncCursor.empty()

        all_rows: list[dict] = []
        last_table_name: str | None = None
        job_service.update_progress(job, progress_pct=10, message="extracting")

        while True:
            if job_service.is_cancelled(job):
                run.status = SyncRun.Status.CANCELLED
                run.error = "cancelled"
                run.finished_at = timezone.now()
                run.cursor_state = cursor.state
                run.rows_extracted = len(all_rows)
                run.save(
                    update_fields=[
                        "status",
                        "error",
                        "finished_at",
                        "cursor_state",
                        "rows_extracted",
                        "updated_at",
                    ]
                )
                raise JobCancelled("cancel requested during extract")

            batch = connector.extract(
                config=connection.config or {},
                credentials=credentials,
                cursor=cursor,
                mode=mode,
                batch_size=batch_size,
            )
            all_rows.extend(batch.rows)
            if batch.table_name:
                last_table_name = batch.table_name
            cursor = batch.next_cursor
            run.rows_extracted = len(all_rows)
            run.cursor_state = cursor.state
            run.save(update_fields=["rows_extracted", "cursor_state", "updated_at"])

            pct = min(70, 10 + len(all_rows))
            job_service.update_progress(
                job, progress_pct=pct, message=f"extracted:{len(all_rows)}"
            )
            if not batch.has_more:
                break

        job_service.update_progress(job, progress_pct=72, message="transforming")
        all_rows = self.transforms.apply_for_connection(
            connection_id=str(connection.id),
            rows=all_rows,
            table_name=last_table_name,
        )

        job_service.update_progress(job, progress_pct=75, message="writing_storage")
        csv_bytes = _rows_to_csv_bytes(all_rows)
        stamp = datetime.now(dt_timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        filename = f"sync-{connection.id}-{stamp}.csv"
        storage_obj = self.storage.upload(
            organization_id=connection.organization_id,
            user=actor,
            filename=filename,
            content=csv_bytes,
            content_type="text/csv",
            workspace_id=connection.workspace_id,
            metadata={
                "connection_id": str(connection.id),
                "sync_run_id": str(run.id),
                "mode": mode_norm,
            },
        )

        job_service.update_progress(job, progress_pct=85, message="updating_dataset")
        dataset_name = f"{connection.name} sync"
        if connection.target_dataset_id:
            dataset = self.datasets.bind_storage(
                dataset_id=connection.target_dataset_id,
                user=actor,
                storage_object_id=storage_obj.id,
            )
            dataset.row_count = len(all_rows)
            dataset.updated_by = actor
            dataset.save(update_fields=["row_count", "updated_by", "updated_at"])
        else:
            dataset = self.datasets.create(
                organization_id=connection.organization_id,
                workspace_id=connection.workspace_id,
                user=actor,
                name=dataset_name,
                description=f"Synced from connection {connection.connector_type}",
                storage_object_id=storage_obj.id,
                row_count=len(all_rows),
            )
            connection.target_dataset = dataset

        connection.last_sync_at = timezone.now()
        connection.updated_by = actor
        connection.save(
            update_fields=["target_dataset", "last_sync_at", "updated_by", "updated_at"]
        )

        dataset.refresh_from_db()
        run.status = SyncRun.Status.SUCCEEDED
        run.rows_loaded = len(all_rows)
        run.cursor_state = cursor.state
        run.storage_object = storage_obj
        run.dataset = dataset
        run.finished_at = timezone.now()
        run.error = ""
        run.save(
            update_fields=[
                "status",
                "rows_loaded",
                "cursor_state",
                "storage_object",
                "dataset",
                "finished_at",
                "error",
                "updated_at",
            ]
        )

        # Track 12 — enqueue enterprise data pipeline (landing → gold + metadata + quality)
        pipeline_run_id = None
        try:
            from apps.data_platform.application.services import DataPlatformService

            pipeline_run, pipeline_job = DataPlatformService().enqueue_pipeline(
                dataset_id=dataset.id,
                user=actor,
                source_storage_object_id=storage_obj.id,
            )
            pipeline_run_id = str(pipeline_run.id)
        except Exception:  # noqa: BLE001
            pass

        self.audit.record(
            actor=actor,
            action="connection.synced",
            resource_type="connection",
            resource_id=str(connection.id),
            organization_id=connection.organization_id,
            after={
                "sync_run_id": str(run.id),
                "mode": mode_norm,
                "rows_loaded": len(all_rows),
                "dataset_id": str(dataset.id),
            },
        )

        return {
            "ok": True,
            "connection_id": str(connection.id),
            "sync_run_id": str(run.id),
            "mode": mode_norm,
            "rows_extracted": len(all_rows),
            "rows_loaded": len(all_rows),
            "cursor_state": cursor.state,
            "dataset_id": str(dataset.id),
            "storage_object_id": str(storage_obj.id),
            "schema_version": connection.schema_version,
            "pipeline_run_id": pipeline_run_id,
        }

    def mark_run_failed(self, *, job_id, error: str) -> None:
        run = SyncRun.objects.filter(job_id=job_id).first()
        if not run:
            return
        run.status = SyncRun.Status.FAILED
        run.error = error[:4000]
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "error", "finished_at", "updated_at"])

    def mark_run_cancelled(self, *, job_id) -> None:
        run = SyncRun.objects.filter(job_id=job_id).first()
        if not run or run.status == SyncRun.Status.SUCCEEDED:
            return
        run.status = SyncRun.Status.CANCELLED
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "finished_at", "updated_at"])
