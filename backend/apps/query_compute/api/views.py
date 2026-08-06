from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.jobs.api.views import JobSerializer
from apps.query_compute.application.services import QueryComputeService
from apps.query_compute.infrastructure.models import QueryExecution, QueryPlan


class QueryPlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryPlan
        fields = (
            "id", "dataset_id", "natural_language", "generated_sql", "optimized_sql",
            "plan_steps", "status", "engine", "created_at",
        )
        read_only_fields = fields


class QueryExecutionSerializer(serializers.ModelSerializer):
    class Meta:
        model = QueryExecution
        fields = (
            "id", "dataset_id", "query_plan_id", "job_id", "sql", "status",
            "row_count", "result_preview", "execution_ms", "engine", "error",
            "finished_at", "created_at",
        )
        read_only_fields = fields


class QueryComputeViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["post"], url_path="generate-sql")
    def generate_sql(self, request, pk=None):
        plan = QueryComputeService().generate_plan(
            dataset_id=pk,
            user=request.user,
            natural_language=request.data.get("natural_language", ""),
            sql=request.data.get("sql"),
        )
        return Response(QueryPlanSerializer(plan).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], url_path="execute")
    def execute(self, request, pk=None):
        execution, job = QueryComputeService().enqueue_execute(
            dataset_id=pk,
            user=request.user,
            sql=request.data.get("sql"),
            plan_id=request.data.get("plan_id"),
        )
        return Response(
            {
                "execution": QueryExecutionSerializer(execution).data,
                "job": JobSerializer(job).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="executions")
    def executions(self, request, pk=None):
        runs = QueryComputeService().list_executions(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, runs, QueryExecutionSerializer)

    @action(detail=True, methods=["get"], url_path="plans")
    def plans(self, request, pk=None):
        plans = QueryComputeService().list_plans(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, plans, QueryPlanSerializer)


class WorkerPoolViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pools = QueryComputeService().get_worker_pools(
            organization_id=organization_id, user=request.user
        )
        data = [
            {
                "id": str(p.id),
                "pool_name": p.pool_name,
                "max_concurrent": p.max_concurrent,
                "active_jobs": p.active_jobs,
                "engine_capabilities": p.engine_capabilities,
            }
            for p in pools
        ]
        return Response(data)
