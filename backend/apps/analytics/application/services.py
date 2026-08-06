"""Analytics Platform services — Track 12.5."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.analytics.application.engines import OPERATIONS, run_analytics_operation
from apps.analytics.infrastructure.models import AnalyticsResult, AnalyticsRun
from apps.audit.application.services import AuditService
from apps.core.dataset_context import load_dataset_context, require_quality_gate
from apps.datasets.application.services import DatasetService
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

COMPUTE_JOB = "analytics.compute"
ALL_OPERATIONS = list(OPERATIONS.keys())


class AnalyticsService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()

    def _get_dataset(self, *, dataset_id, user, permission: str):
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_runs(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return AnalyticsRun.objects.filter(dataset_id=dataset.id).order_by("-created_at")

    def get_result(self, *, dataset_id, user, operation: str | None = None):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        qs = AnalyticsResult.objects.filter(dataset_id=dataset.id)
        if operation:
            qs = qs.filter(operation=operation)
        result = qs.order_by("-created_at").first()
        if not result:
            from apps.core.exceptions import NotFoundError

            raise NotFoundError("Analytics result not found")
        return result

    @transaction.atomic
    def enqueue_compute(
        self,
        *,
        dataset_id,
        user,
        operation: str = "statistics",
        parameters: dict | None = None,
    ):
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        op = operation.lower()
        if op not in OPERATIONS:
            raise ValueError(f"Unknown operation: {operation}")

        run = AnalyticsRun.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            operation=op,
            status=AnalyticsRun.Status.QUEUED,
            parameters=parameters or {},
            created_by=user,
            updated_by=user,
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=COMPUTE_JOB,
            payload={
                "dataset_id": str(dataset.id),
                "analytics_run_id": str(run.id),
                "operation": op,
                "parameters": parameters or {},
            },
        )
        run.job = job
        run.save(update_fields=["job", "updated_at"])
        run.refresh_from_db()
        job.refresh_from_db()
        return run, job

    @transaction.atomic
    def compute(
        self,
        *,
        dataset_id,
        operation: str,
        parameters: dict | None = None,
        actor=None,
        analytics_run_id=None,
        require_quality: bool = True,
    ) -> dict:
        context = load_dataset_context(dataset_id)
        if require_quality:
            require_quality_gate(context, min_score=50.0)

        dataset = context["dataset"]
        op = operation.lower()
        result_data = run_analytics_operation(op, context, parameters)

        run = None
        if analytics_run_id:
            run = AnalyticsRun.objects.filter(id=analytics_run_id).first()
        if run is None:
            run = AnalyticsRun.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                operation=op,
                status=AnalyticsRun.Status.RUNNING,
                parameters=parameters or {},
                created_by=actor,
                updated_by=actor,
            )

        run.status = AnalyticsRun.Status.SUCCEEDED
        run.finished_at = timezone.now()
        run.save(update_fields=["status", "finished_at", "updated_at"])

        AnalyticsResult.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            analytics_run=run,
            operation=op,
            result=result_data,
            method=result_data.get("method", ""),
            confidence=result_data.get("confidence"),
            created_by=actor,
            updated_by=actor,
        )

        if actor:
            self.audit.record(
                actor=actor,
                action="analytics.computed",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
                after={"operation": op},
            )

        return {
            "dataset_id": str(dataset.id),
            "operation": op,
            "analytics_run_id": str(run.id),
            "result": result_data,
        }

    def compute_all(self, *, dataset_id, actor=None, require_quality: bool = True) -> dict:
        outputs = {}
        for op in ALL_OPERATIONS:
            outputs[op] = self.compute(
                dataset_id=dataset_id,
                operation=op,
                actor=actor,
                require_quality=require_quality,
            )["result"]
        return {"dataset_id": str(dataset_id), "operations": ALL_OPERATIONS, "results": outputs}

    def run_compute_for_job(self, *, job) -> dict:
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        if not dataset_id:
            raise ValueError("dataset_id required")
        operation = payload.get("operation", "statistics")
        if operation == "all":
            return self.compute_all(dataset_id=dataset_id, actor=job.created_by)
        return self.compute(
            dataset_id=dataset_id,
            operation=operation,
            parameters=payload.get("parameters"),
            actor=job.created_by,
            analytics_run_id=payload.get("analytics_run_id"),
        )
