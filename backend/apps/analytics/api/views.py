from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.analytics.application.services import AnalyticsService
from apps.analytics.infrastructure.models import AnalyticsResult, AnalyticsRun
from apps.api.pagination import paginate_and_serialize
from apps.jobs.api.views import JobSerializer


class AnalyticsRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsRun
        fields = (
            "id", "dataset_id", "job_id", "operation", "status", "parameters",
            "error", "finished_at", "created_at",
        )
        read_only_fields = fields


class AnalyticsResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = AnalyticsResult
        fields = (
            "id", "dataset_id", "analytics_run_id", "operation", "result",
            "method", "confidence", "created_at",
        )
        read_only_fields = fields


class AnalyticsViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["post"], url_path="compute")
    def compute(self, request, pk=None):
        operation = request.data.get("operation", "statistics")
        run, job = AnalyticsService().enqueue_compute(
            dataset_id=pk,
            user=request.user,
            operation=operation,
            parameters=request.data.get("parameters"),
        )
        return Response(
            {"analytics_run": AnalyticsRunSerializer(run).data, "job": JobSerializer(job).data},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="runs")
    def runs(self, request, pk=None):
        runs = AnalyticsService().list_runs(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, runs, AnalyticsRunSerializer)

    @action(detail=True, methods=["get"], url_path="results")
    def results(self, request, pk=None):
        result = AnalyticsService().get_result(
            dataset_id=pk,
            user=request.user,
            operation=request.query_params.get("operation"),
        )
        return Response(AnalyticsResultSerializer(result).data)
