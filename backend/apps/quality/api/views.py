from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.jobs.api.views import JobSerializer
from apps.quality.application.services import QualityService
from apps.quality.infrastructure.models import QualityReport, QualityRun


class QualityRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityRun
        fields = (
            "id",
            "dataset_id",
            "job_id",
            "status",
            "score",
            "checks_passed",
            "checks_failed",
            "checks_warning",
            "error",
            "finished_at",
            "created_at",
        )
        read_only_fields = fields


class QualityReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = QualityReport
        fields = (
            "id",
            "dataset_id",
            "quality_run_id",
            "overall_score",
            "validation_results",
            "profiling_results",
            "duplicate_results",
            "missing_value_results",
            "schema_drift_results",
            "pii_results",
            "summary",
            "created_at",
        )
        read_only_fields = fields


class QualityViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["post"], url_path="validate")
    def validate(self, request, pk=None):
        run, job = QualityService().enqueue_validate(dataset_id=pk, user=request.user)
        return Response(
            {"quality_run": QualityRunSerializer(run).data, "job": JobSerializer(job).data},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="runs")
    def runs(self, request, pk=None):
        runs = QualityService().list_runs(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, runs, QualityRunSerializer)

    @action(detail=True, methods=["get"], url_path="report")
    def report(self, request, pk=None):
        report = QualityService().get_report(
            dataset_id=pk,
            user=request.user,
            run_id=request.query_params.get("run_id"),
        )
        return Response(QualityReportSerializer(report).data)
