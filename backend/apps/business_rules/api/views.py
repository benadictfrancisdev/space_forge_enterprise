from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.business_rules.application.services import BusinessRulesService
from apps.business_rules.infrastructure.models import KPIDefinition, Policy
from apps.jobs.api.views import JobSerializer


class KPIDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = KPIDefinition
        fields = (
            "id", "organization_id", "workspace_id", "dataset_id", "name", "description",
            "column_name", "aggregation", "target_value", "unit", "is_active", "created_at",
        )
        read_only_fields = fields


class PolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = Policy
        fields = (
            "id", "organization_id", "workspace_id", "name", "description",
            "policy_type", "rules", "is_active", "created_at",
        )
        read_only_fields = fields


class KPIViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kpis = BusinessRulesService().list_kpis(
            organization_id=organization_id,
            user=request.user,
            workspace_id=request.query_params.get("workspace_id"),
        )
        return paginate_and_serialize(request, kpis, KPIDefinitionSerializer)

    def create(self, request):
        organization_id = request.data.get("organization_id")
        workspace_id = request.data.get("workspace_id")
        if not organization_id or not workspace_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id and workspace_id required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        kpi = BusinessRulesService().create_kpi(
            organization_id=organization_id,
            workspace_id=workspace_id,
            user=request.user,
            name=request.data.get("name", "KPI"),
            description=request.data.get("description", ""),
            column_name=request.data.get("column_name", ""),
            aggregation=request.data.get("aggregation", "count"),
            target_value=request.data.get("target_value"),
            unit=request.data.get("unit", ""),
            dataset_id=request.data.get("dataset_id"),
        )
        return Response(KPIDefinitionSerializer(kpi).data, status=status.HTTP_201_CREATED)


class PolicyViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        policies = BusinessRulesService().list_policies(
            organization_id=organization_id, user=request.user
        )
        return paginate_and_serialize(request, policies, PolicySerializer)


class BusinessRulesDatasetViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["post"], url_path="evaluate")
    def evaluate(self, request, pk=None):
        job = BusinessRulesService().enqueue_evaluate(dataset_id=pk, user=request.user)
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)
