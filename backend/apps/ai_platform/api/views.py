from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.ai_platform.application.services import AIPlatformService
from apps.ai_platform.infrastructure.models import (
    AgentDefinition,
    AIObservabilityEvent,
    PromptTemplate,
)
from apps.api.pagination import paginate_and_serialize
from apps.jobs.api.views import JobSerializer


class PromptTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = PromptTemplate
        fields = (
            "id", "operation", "version_tag", "system_prompt", "user_template",
            "is_active", "created_at",
        )
        read_only_fields = fields


class AgentSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgentDefinition
        fields = (
            "id", "name", "description", "operations", "tools",
            "model_preferences", "is_active", "created_at",
        )
        read_only_fields = fields


class ObservabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = AIObservabilityEvent
        fields = (
            "id", "dataset_id", "operation", "provider", "model", "latency_ms",
            "tokens_total", "cost_usd", "confidence", "guardrail_passed",
            "hallucination_score", "created_at",
        )
        read_only_fields = fields


class PromptViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        prompts = AIPlatformService().list_prompts(
            organization_id=organization_id, user=request.user
        )
        return paginate_and_serialize(request, prompts, PromptTemplateSerializer)


class AgentViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        agents = AIPlatformService().list_agents(
            organization_id=organization_id, user=request.user
        )
        return paginate_and_serialize(request, agents, AgentSerializer)


class ObservabilityViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        events = AIPlatformService().list_observability(
            organization_id=organization_id,
            user=request.user,
            dataset_id=request.query_params.get("dataset_id"),
        )
        return paginate_and_serialize(request, events, ObservabilitySerializer)


class AIPlatformDatasetViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["post"], url_path="reason")
    def reason(self, request, pk=None):
        job = AIPlatformService().enqueue_reason(
            dataset_id=pk,
            user=request.user,
            operation=request.data.get("operation", "narrative"),
            question=request.data.get("question", ""),
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="embed")
    def embed(self, request, pk=None):
        from apps.jobs.application.services import JobService

        dataset = AIPlatformService()._get_dataset(
            dataset_id=pk, user=request.user, permission="ai:invoke"
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=request.user,
            workspace_id=dataset.workspace_id,
            job_type="ai_platform.embed",
            payload={"dataset_id": str(dataset.id)},
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["post"], url_path="rag")
    def rag(self, request, pk=None):
        query = request.data.get("query") or request.data.get("question")
        if not query:
            return Response(
                {"error": {"code": "validation_error", "message": "query is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        from apps.jobs.application.services import JobService

        dataset = AIPlatformService()._get_dataset(
            dataset_id=pk, user=request.user, permission="ai:invoke"
        )
        job = JobService().enqueue(
            organization_id=dataset.organization_id,
            user=request.user,
            workspace_id=dataset.workspace_id,
            job_type="ai_platform.rag",
            payload={"dataset_id": str(dataset.id), "query": query},
        )
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)
