"""Data Quality Platform services — Track 12.3."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError
from apps.data_platform.application.pipeline_stages import parse_content
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset
from apps.metadata.infrastructure.models import ColumnMetadata, SchemaRegistryEntry
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.quality.application.engine import (
    compute_quality_score,
    run_duplicate_detection,
    run_missing_value_detection,
    run_pii_detection,
    run_schema_drift_detection,
    run_validation,
)
from apps.quality.infrastructure.models import QualityReport, QualityRun
from apps.storage.application.services import StorageService

QUALITY_VALIDATE_JOB = "quality.validate"


class QualityService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()
        self.storage = StorageService()

    def _get_dataset(self, *, dataset_id, user, permission: str) -> Dataset:
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_runs(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return QualityRun.objects.filter(dataset_id=dataset.id).select_related("job").order_by(
            "-created_at"
        )

    def get_report(self, *, dataset_id, user, run_id=None) -> QualityReport:
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        if run_id:
            try:
                run = QualityRun.objects.get(id=run_id, dataset_id=dataset.id)
                return QualityReport.objects.get(quality_run_id=run.id)
            except (QualityRun.DoesNotExist, QualityReport.DoesNotExist) as exc:
                raise NotFoundError("Quality report not found") from exc
        report = (
            QualityReport.objects.filter(dataset_id=dataset.id).order_by("-created_at").first()
        )
        if not report:
            raise NotFoundError("Quality report not found")
        return report

    @transaction.atomic
    def enqueue_validate(self, *, dataset_id, user) -> tuple[QualityRun, object]:
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        run = QualityRun.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            status=QualityRun.Status.QUEUED,
            created_by=user,
            updated_by=user,
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=QUALITY_VALIDATE_JOB,
            payload={
                "dataset_id": str(dataset.id),
                "quality_run_id": str(run.id),
            },
            timeout_seconds=300,
        )
        run.job = job
        run.save(update_fields=["job", "updated_at"])
        run.refresh_from_db()
        job.refresh_from_db()
        return run, job

    def run_validate_for_job(self, *, job) -> dict:
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")

        run_id = payload.get("quality_run_id")
        run = QualityRun.objects.filter(id=run_id).first() if run_id else None
        dataset = Dataset.objects.select_related("storage_object").get(id=dataset_id)
        actor = job.created_by or dataset.created_by

        if run is None:
            run = QualityRun.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                job=job,
                status=QualityRun.Status.RUNNING,
                created_by=actor,
                updated_by=actor,
            )
        else:
            run.job = job
            run.status = QualityRun.Status.RUNNING
            run.save(update_fields=["job", "status", "updated_at"])

        schema = dataset.schema or {}
        statistics = dataset.statistics or {}
        row_count = dataset.row_count or 0
        columns = [c.get("name") for c in (schema.get("columns") or []) if c.get("name")]

        rows: list[dict] = []
        if dataset.storage_object_id:
            content = self.storage.provider.download(key=dataset.storage_object.key)
            rows, _ = parse_content(content, filename=dataset.storage_object.filename)

        validation = run_validation(schema, statistics, row_count or len(rows))
        duplicates = run_duplicate_detection(rows, columns)
        missing = run_missing_value_detection(statistics)
        profiling = {
            "row_count": row_count or len(rows),
            "column_count": len(columns),
            "statistics": statistics,
        }

        prev_schema_entry = (
            SchemaRegistryEntry.objects.filter(dataset_id=dataset.id, is_current=False)
            .order_by("-version_number")
            .first()
        )
        previous_schema = prev_schema_entry.schema if prev_schema_entry else None
        drift = run_schema_drift_detection(schema, previous_schema)

        col_meta = list(ColumnMetadata.objects.filter(dataset_id=dataset.id))
        pii = run_pii_detection(col_meta)

        score = compute_quality_score(validation, duplicates, missing, drift, pii)

        checks_failed = validation.get("failed", 0)
        checks_warning = validation.get("warnings", 0) + (
            1 if duplicates.get("status") == "warning" else 0
        ) + (1 if missing.get("status") == "warning" else 0) + (
            1 if drift.get("drift_detected") else 0
        ) + (1 if pii.get("pii_count", 0) > 0 else 0)
        checks_passed = validation.get("passed", 0)

        if validation.get("failed", 0) > 0 or duplicates.get("status") == "fail":
            run_status = QualityRun.Status.FAILED
        elif score < 70 or checks_warning > 0:
            run_status = QualityRun.Status.WARNING
        else:
            run_status = QualityRun.Status.PASSED

        report = QualityReport.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            quality_run=run,
            overall_score=score,
            validation_results=validation,
            profiling_results=profiling,
            duplicate_results=duplicates,
            missing_value_results=missing,
            schema_drift_results=drift,
            pii_results=pii,
            summary={
                "score": score,
                "status": run_status,
                "checks_passed": checks_passed,
                "checks_failed": checks_failed,
                "checks_warning": checks_warning,
            },
            created_by=actor,
            updated_by=actor,
        )

        run.status = run_status
        run.score = score
        run.checks_passed = checks_passed
        run.checks_failed = checks_failed
        run.checks_warning = checks_warning
        run.finished_at = timezone.now()
        run.save(
            update_fields=[
                "status",
                "score",
                "checks_passed",
                "checks_failed",
                "checks_warning",
                "finished_at",
                "updated_at",
            ]
        )

        # Update catalog quality score
        from apps.data_platform.infrastructure.models import CatalogEntry

        CatalogEntry.objects.filter(dataset_id=dataset.id).update(
            quality_score=score,
            updated_at=timezone.now(),
        )

        if actor:
            self.audit.record(
                actor=actor,
                action="quality.validated",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
                after={"score": score, "status": run_status},
            )

        return {
            "ok": True,
            "dataset_id": str(dataset.id),
            "quality_run_id": str(run.id),
            "report_id": str(report.id),
            "score": score,
            "status": run_status,
        }

    def mark_run_failed(self, *, job_id, error: str) -> None:
        run = QualityRun.objects.filter(job_id=job_id).first()
        if not run:
            return
        run.status = QualityRun.Status.FAILED
        run.error = error[:4000]
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "error", "finished_at", "updated_at"])
