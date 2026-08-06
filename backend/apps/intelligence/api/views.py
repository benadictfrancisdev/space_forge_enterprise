from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.intelligence.application.services import IntelligenceService
from apps.intelligence.infrastructure.models import (
    ContextBundle,
    GlossaryTerm,
    IndustryModel,
    Recommendation,
    SemanticModel,
)
from apps.jobs.api.views import JobSerializer


class SemanticModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SemanticModel
        fields = (
            "id", "dataset_id", "name", "description", "is_published", "created_at",
        )
        read_only_fields = fields


class GlossaryTermSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlossaryTerm
        fields = (
            "id", "term", "definition", "domain", "related_columns", "created_at",
        )
        read_only_fields = fields


class RecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Recommendation
        fields = (
            "id", "category", "title", "body", "priority", "metadata", "created_at",
        )
        read_only_fields = fields


class IndustryModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = IndustryModel
        fields = (
            "id", "industry", "name", "description", "kpi_templates",
            "metric_templates", "is_system", "created_at",
        )
        read_only_fields = fields


class SemanticModelViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        models = IntelligenceService().list_semantic_models(
            organization_id=organization_id,
            user=request.user,
            dataset_id=request.query_params.get("dataset_id"),
        )
        return paginate_and_serialize(request, models, SemanticModelSerializer)

    def create(self, request):
        organization_id = request.data.get("organization_id")
        workspace_id = request.data.get("workspace_id")
        dataset_id = request.data.get("dataset_id")
        if not all([organization_id, workspace_id, dataset_id]):
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id, workspace_id, dataset_id required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        model = IntelligenceService().create_semantic_model(
            organization_id=organization_id,
            workspace_id=workspace_id,
            user=request.user,
            dataset_id=dataset_id,
            name=request.data.get("name", "Semantic Model"),
            description=request.data.get("description", ""),
        )
        return Response(SemanticModelSerializer(model).data, status=status.HTTP_201_CREATED)


class GlossaryViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        terms = IntelligenceService().list_glossary(
            organization_id=organization_id, user=request.user
        )
        return paginate_and_serialize(request, terms, GlossaryTermSerializer)


class IndustryModelViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        models = IntelligenceService().list_industry_models(
            organization_id=organization_id, user=request.user
        )
        return paginate_and_serialize(request, models, IndustryModelSerializer)


class IntelligenceDatasetViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["post"], url_path="enrich")
    def enrich(self, request, pk=None):
        job = IntelligenceService().enqueue_enrich(dataset_id=pk, user=request.user)
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["get"], url_path="context")
    def context(self, request, pk=None):
        bundle = IntelligenceService().get_context(dataset_id=pk, user=request.user)
        return Response({"version": bundle.version, "bundle": bundle.bundle})

    @action(detail=True, methods=["get"], url_path="graph")
    def graph(self, request, pk=None):
        return Response(IntelligenceService().get_graph(dataset_id=pk, user=request.user))

    @action(detail=True, methods=["get"], url_path="recommendations")
    def recommendations(self, request, pk=None):
        IntelligenceService()._get_dataset(dataset_id=pk, user=request.user, permission="dataset:read")
        recs = Recommendation.objects.filter(dataset_id=pk).order_by("-created_at")
        return paginate_and_serialize(request, recs, RecommendationSerializer)
