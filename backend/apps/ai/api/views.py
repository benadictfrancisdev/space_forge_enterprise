from rest_framework import serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.ai.application.client import AIComputeClient
from apps.ai.application.services import AIGatewayService
from apps.api.throttling import AIComputeThrottle


class AIRequestSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    dataset_id = serializers.UUIDField(required=False, allow_null=True)
    question = serializers.CharField(required=False, allow_blank=True)
    message = serializers.CharField(required=False, allow_blank=True)
    query = serializers.CharField(required=False, allow_blank=True)
    hypothesis = serializers.CharField(required=False, allow_blank=True)
    target_column = serializers.CharField(required=False, allow_blank=True)
    horizon = serializers.IntegerField(required=False, min_value=1, max_value=365)
    module = serializers.CharField(required=False, allow_blank=True)
    params = serializers.DictField(required=False)


class AIComputeView(APIView):
    """POST /api/v1/ai/{operation}/ — Django gateway → FastAPI/inline compute."""

    throttle_classes = [AIComputeThrottle]

    def post(self, request, operation: str):
        serializer = AIRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        payload = {
            "question": data.get("question"),
            "message": data.get("message"),
            "query": data.get("query"),
            "hypothesis": data.get("hypothesis"),
            "target_column": data.get("target_column"),
            "horizon": data.get("horizon"),
            "module": data.get("module"),
            "params": data.get("params") or {},
        }
        payload = {k: v for k, v in payload.items() if v is not None}

        result = AIGatewayService().run(
            operation=operation,
            user=request.user,
            organization_id=data["organization_id"],
            dataset_id=str(data["dataset_id"]) if data.get("dataset_id") else None,
            payload=payload,
        )
        return Response(result, status=status.HTTP_200_OK)


class AIHealthView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        health = AIComputeClient().health()
        return Response(
            {
                "status": health.get("status", "unknown"),
                "operations": health.get("operations") or [],
                "providers": health.get("providers") or [],
                "prompt_versions": health.get("prompt_versions") or {},
                "schema_version": health.get("schema_version"),
                "upstream": health,
            }
        )
