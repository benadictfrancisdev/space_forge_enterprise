"""Query & Compute Platform services — Track 12.8."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.dataset_context import load_dataset_context, require_quality_gate
from apps.core.exceptions import NotFoundError, PermissionDeniedError
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService
from apps.query_compute.application.engines import (
    execute_sql_duckdb,
    generate_sql,
    optimize_sql,
    plan_query,
)
from apps.query_compute.infrastructure.models import ComputeWorkerPool, QueryExecution, QueryPlan
from apps.storage.application.factory import get_object_storage

EXECUTE_JOB = "query_compute.execute"
GENERATE_JOB = "query_compute.generate"


class QueryComputeService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()
        self.datasets = DatasetService()

    def _get_dataset(self, *, dataset_id, user, permission: str):
        return self.datasets._get(dataset_id=dataset_id, user=user, permission=permission)

    def list_executions(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return QueryExecution.objects.filter(dataset_id=dataset.id).select_related("job").order_by(
            "-created_at"
        )

    def list_plans(self, *, dataset_id, user):
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:read")
        return QueryPlan.objects.filter(dataset_id=dataset.id).order_by("-created_at")

    def get_worker_pools(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(user=user, organization_id=org.id, permission="dataset:read")
        pools = ComputeWorkerPool.objects.filter(
            organization_id=org.id, is_active=True
        )
        if not pools.exists():
            ComputeWorkerPool.objects.get_or_create(
                organization_id=org.id,
                pool_name="default",
                defaults={
                    "engine_capabilities": ["duckdb", "python_fallback"],
                    "max_concurrent": 4,
                },
            )
            pools = ComputeWorkerPool.objects.filter(organization_id=org.id, is_active=True)
        return pools

    @transaction.atomic
    def generate_plan(
        self,
        *,
        dataset_id,
        user,
        natural_language: str = "",
        sql: str | None = None,
    ) -> QueryPlan:
        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        ctx = load_dataset_context(dataset_id)
        require_quality_gate(ctx, min_score=50.0)

        if sql:
            generated = sql
        else:
            generated = generate_sql(natural_language, ctx["columns"])
        optimized = optimize_sql(generated)
        steps = plan_query(optimized, ctx["columns"])

        plan = QueryPlan.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            natural_language=natural_language or "",
            generated_sql=generated,
            optimized_sql=optimized,
            plan_steps=steps,
            status=QueryPlan.Status.READY,
            engine="duckdb",
            created_by=user,
            updated_by=user,
        )
        return plan

    @transaction.atomic
    def enqueue_execute(self, *, dataset_id, user, sql: str | None = None, plan_id=None):
        from apps.jobs.application.services import JobService

        dataset = self._get_dataset(dataset_id=dataset_id, user=user, permission="dataset:write")
        if plan_id:
            plan = QueryPlan.objects.get(id=plan_id, dataset_id=dataset.id)
            sql = plan.optimized_sql or plan.generated_sql
        if not sql:
            raise ValueError("sql or plan_id required")

        execution = QueryExecution.objects.create(
            organization_id=dataset.organization_id,
            workspace_id=dataset.workspace_id,
            dataset=dataset,
            query_plan_id=plan_id,
            sql=sql,
            status=QueryExecution.Status.QUEUED,
            created_by=user,
            updated_by=user,
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=user,
            workspace_id=dataset.workspace_id,
            job_type=EXECUTE_JOB,
            payload={
                "dataset_id": str(dataset.id),
                "execution_id": str(execution.id),
                "sql": sql,
            },
        )
        execution.job = job
        execution.save(update_fields=["job", "updated_at"])
        execution.refresh_from_db()
        job.refresh_from_db()
        return execution, job

    @transaction.atomic
    def execute_sql(
        self,
        *,
        dataset_id,
        sql: str,
        actor=None,
        execution_id=None,
    ) -> dict:
        ctx = load_dataset_context(dataset_id)
        require_quality_gate(ctx, min_score=50.0)
        dataset = ctx["dataset"]

        if not dataset.storage_object_id:
            raise ValueError("Dataset has no storage object")

        provider = get_object_storage()
        content = provider.download(key=dataset.storage_object.key)
        result = execute_sql_duckdb(content, sql, filename=dataset.storage_object.filename)

        execution = None
        if execution_id:
            execution = QueryExecution.objects.filter(id=execution_id).first()
        if execution is None:
            execution = QueryExecution.objects.create(
                organization_id=dataset.organization_id,
                workspace_id=dataset.workspace_id,
                dataset=dataset,
                sql=sql,
                status=QueryExecution.Status.RUNNING,
                created_by=actor,
                updated_by=actor,
            )

        execution.status = QueryExecution.Status.SUCCEEDED
        execution.row_count = result.get("row_count")
        execution.result_preview = result.get("preview") or []
        execution.execution_ms = result.get("execution_ms")
        execution.engine = result.get("engine", "duckdb")
        execution.finished_at = timezone.now()
        execution.save(
            update_fields=[
                "status",
                "row_count",
                "result_preview",
                "execution_ms",
                "engine",
                "finished_at",
                "updated_at",
            ]
        )

        if actor:
            self.audit.record(
                actor=actor,
                action="query_compute.executed",
                resource_type="dataset",
                resource_id=str(dataset.id),
                organization_id=dataset.organization_id,
                after={"row_count": execution.row_count, "engine": execution.engine},
            )

        return {
            "dataset_id": str(dataset.id),
            "execution_id": str(execution.id),
            "sql": sql,
            **result,
        }

    def run_execute_for_job(self, *, job) -> dict:
        payload = job.payload or {}
        dataset_id = payload.get("dataset_id")
        sql = payload.get("sql")
        if not dataset_id or not sql:
            raise ValueError("dataset_id and sql required")
        try:
            Dataset.objects.get(id=dataset_id, organization_id=job.organization_id)
        except Dataset.DoesNotExist as exc:
            raise PermissionDeniedError(
                "Cross-tenant resource access blocked in worker."
            ) from exc
        execution_id = payload.get("execution_id")
        if execution_id:
            try:
                QueryExecution.objects.get(
                    id=execution_id, organization_id=job.organization_id
                )
            except QueryExecution.DoesNotExist as exc:
                raise PermissionDeniedError(
                    "Cross-tenant resource access blocked in worker."
                ) from exc
        return self.execute_sql(
            dataset_id=dataset_id,
            sql=sql,
            actor=job.created_by,
            execution_id=payload.get("execution_id"),
        )
