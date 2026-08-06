"""Enterprise Applications API — Track 13."""
from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.enterprise_applications.application.services import (
    DecisionService,
    ForecastStudioService,
    InsightService,
    JourneyService,
    OperationalService,
    ReportingService,
    SankeyService,
)
from apps.enterprise_applications.infrastructure.models import (
    DecisionCase,
    JourneyDefinition,
    ReportTemplate,
)
from apps.jobs.api.views import JobSerializer


class JourneySerializer(serializers.ModelSerializer):
    dataset_id = serializers.UUIDField(source="dataset.id", allow_null=True, read_only=True)

    class Meta:
        model = JourneyDefinition
        fields = (
            "id", "organization_id", "workspace_id", "name", "journey_type",
            "industry", "dataset_id", "stage_column", "stages", "is_template",
            "description", "owner_department", "time_column", "entity_column", "created_at",
        )
        read_only_fields = ("id", "organization_id", "created_at")


class ReportTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportTemplate
        fields = (
            "id", "name", "report_type", "sections", "schedule", "is_active", "created_at",
        )
        read_only_fields = fields


class DecisionCaseSerializer(serializers.ModelSerializer):
    dataset_id = serializers.UUIDField(source="dataset.id", read_only=True)

    class Meta:
        model = DecisionCase
        fields = ("id", "dataset_id", "problem", "status", "result_bundle", "created_at")
        read_only_fields = fields


class ExecutiveInsightViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"], url_path="bundle")
    def bundle(self, request):
        dataset_id = request.query_params.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        include_ai = request.query_params.get("include_ai") in {"1", "true"}
        bundle = InsightService().build_insight_bundle(
            dataset_id=dataset_id,
            user=request.user,
            include_ai=include_ai,
        )
        return Response(bundle)

    @action(detail=False, methods=["post"], url_path="prepare")
    def prepare(self, request):
        from apps.jobs.application.services import JobService
        from apps.datasets.application.services import DatasetService

        dataset_id = request.data.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dataset = DatasetService()._get(
            dataset_id=dataset_id, user=request.user, permission="dataset:write"
        )
        from apps.data_platform.application.services import DataPlatformService

        run, job = DataPlatformService().enqueue_pipeline(dataset_id=dataset.id, user=request.user)
        return Response(
            {"pipeline_run_id": str(run.id), "job": JobSerializer(job).data},
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["post"], url_path="schedule-brief")
    def schedule_brief(self, request):
        dataset_id = request.data.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        schedule, job = InsightService().schedule_brief(
            dataset_id=dataset_id,
            user=request.user,
            frequency=request.data.get("frequency", "daily"),
        )
        return Response(
            {
                "schedule_id": str(schedule.id),
                "frequency": schedule.frequency,
                "job": JobSerializer(job).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path="brief-schedules")
    def brief_schedules(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        schedules = InsightService().list_brief_schedules(
            organization_id=org_id, user=request.user
        )
        data = [
            {
                "id": str(s.id),
                "dataset_id": str(s.dataset_id),
                "frequency": s.frequency,
                "last_run_at": s.last_run_at,
            }
            for s in schedules
        ]
        return Response(data)


class JourneyViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        journeys = JourneyService().list_journeys(organization_id=org_id, user=request.user)
        return paginate_and_serialize(request, journeys, JourneySerializer)

    def create(self, request):
        org_id = request.data.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        journey = JourneyService().create_journey(
            organization_id=org_id,
            user=request.user,
            workspace_id=request.data.get("workspace_id"),
            name=request.data.get("name", ""),
            journey_type=request.data.get("journey_type", "customer"),
            industry=request.data.get("industry", ""),
            dataset_id=request.data.get("dataset_id"),
            stage_column=request.data.get("stage_column", ""),
            stages=request.data.get("stages", []),
            description=request.data.get("description", ""),
            owner_department=request.data.get("owner_department", ""),
            time_column=request.data.get("time_column", ""),
            entity_column=request.data.get("entity_column", ""),
        )
        return Response(JourneySerializer(journey).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="seed-templates")
    def seed_templates(self, request):
        org_id = request.data.get("organization_id")
        ws_id = request.data.get("workspace_id")
        if not org_id or not ws_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id and workspace_id required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        created = JourneyService().seed_templates(
            organization_id=org_id, user=request.user, workspace_id=ws_id
        )
        return Response({"seeded": len(created)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="analyze")
    def analyze(self, request, pk=None):
        analysis = JourneyService().analyze_journey(
            journey_id=pk,
            user=request.user,
            dataset_id=request.query_params.get("dataset_id"),
        )
        return Response(analysis)

    @action(detail=True, methods=["post"], url_path="explain")
    def explain(self, request, pk=None):
        result = JourneyService().explain_journey(
            journey_id=pk,
            user=request.user,
            dataset_id=request.data.get("dataset_id"),
        )
        return Response(result)


class DecisionViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        cases = DecisionService().list_cases(organization_id=org_id, user=request.user)
        return paginate_and_serialize(request, cases, DecisionCaseSerializer)

    def create(self, request):
        dataset_id = request.data.get("dataset_id")
        problem = request.data.get("problem", "")
        if not dataset_id or not problem:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id and problem required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = DecisionService().analyze_problem(
            dataset_id=dataset_id, user=request.user, problem=problem
        )
        return Response(result, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        case = DecisionService().get_case(case_id=pk, user=request.user)
        return Response(DecisionCaseSerializer(case).data)


class ForecastStudioViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"], url_path="scenarios")
    def scenarios(self, request):
        dataset_id = request.data.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = ForecastStudioService().run_scenarios(
            dataset_id=dataset_id,
            user=request.user,
            horizon=int(request.data.get("horizon", 7)),
        )
        return Response(result)


class ReportingViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"], url_path="types")
    def types(self, request):
        return Response(ReportingService().list_report_types())

    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        templates = ReportingService().list_templates(organization_id=org_id, user=request.user)
        return paginate_and_serialize(request, templates, ReportTemplateSerializer)

    @action(detail=False, methods=["post"], url_path="generate")
    def generate(self, request):
        dataset_id = request.data.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        report = ReportingService().generate_report(
            dataset_id=dataset_id,
            user=request.user,
            report_type=request.data.get("report_type", "executive"),
        )
        return Response(report, status=status.HTTP_201_CREATED)


        return Response(report, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=["post"], url_path="schedule")
    def schedule(self, request):
        dataset_id = request.data.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        schedule, job = ReportingService().schedule_report(
            dataset_id=dataset_id,
            user=request.user,
            report_type=request.data.get("report_type", "executive"),
            frequency=request.data.get("frequency", "daily"),
        )
        return Response(
            {
                "schedule_id": str(schedule.id),
                "report_type": schedule.report_type,
                "job": JobSerializer(job).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=False, methods=["get"], url_path="schedules")
    def schedules(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        schedules = ReportingService().list_scheduled_reports(
            organization_id=org_id, user=request.user
        )
        data = [
            {
                "id": str(s.id),
                "dataset_id": str(s.dataset_id),
                "report_type": s.report_type,
                "frequency": s.frequency,
                "last_run_at": s.last_run_at,
            }
            for s in schedules
        ]
        return Response(data)


class SankeyViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["post"], url_path="visualize")
    def visualize(self, request):
        result = SankeyService().visualize(
            user=request.user,
            journey_id=request.data.get("journey_id"),
            dataset_id=request.data.get("dataset_id"),
            flow_type=request.data.get("flow_type", "customer"),
        )
        return Response(result)


class OperationalViewSet(viewsets.ViewSet):
    def list(self, request):
        org_id = request.query_params.get("organization_id")
        if not org_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        dashboard = OperationalService().get_ops_dashboard(
            organization_id=org_id, user=request.user
        )
        return Response(dashboard)


class ScientistViewSet(viewsets.ViewSet):
    @action(detail=False, methods=["get"], url_path="context")
    def context(self, request):
        dataset_id = request.query_params.get("dataset_id")
        if not dataset_id:
            return Response(
                {"error": {"code": "validation_error", "message": "dataset_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.intelligence.application.services import IntelligenceService
        from apps.metadata.application.services import MetadataService

        IntelligenceService().enrich_dataset(dataset_id=dataset_id, actor=request.user)
        bundle = InsightService().build_insight_bundle(dataset_id=dataset_id, user=request.user)
        columns = MetadataService().list_columns(dataset_id=dataset_id, user=request.user)
        return Response({
            "insight": bundle,
            "columns": [
                {"name": c.column_name, "type": c.physical_type, "pii": c.pii_detected}
                for c in columns
            ],
        })
