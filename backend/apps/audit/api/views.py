from rest_framework import serializers, status, viewsets
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.audit.application.services import AuditService
from apps.audit.infrastructure.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    actor_email = serializers.SerializerMethodField()

    class Meta:
        model = AuditLog
        fields = (
            "id",
            "organization_id",
            "actor",
            "actor_email",
            "action",
            "resource_type",
            "resource_id",
            "before",
            "after",
            "metadata",
            "trace_id",
            "created_at",
        )
        read_only_fields = fields

    def get_actor_email(self, obj):
        return getattr(obj.actor, "email", None)


class AuditLogViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        logs = AuditService().list_for_org(organization_id=organization_id, user=request.user)
        return paginate_and_serialize(request, logs, AuditLogSerializer)
