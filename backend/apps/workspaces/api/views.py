from rest_framework import serializers, status, viewsets
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.workspaces.application.services import WorkspaceService
from apps.workspaces.infrastructure.models import Workspace


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = (
            "id",
            "organization_id",
            "name",
            "slug",
            "status",
            "settings",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class WorkspaceCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=255)
    slug = serializers.SlugField(max_length=64, required=False, allow_blank=True)
    organization_id = serializers.UUIDField()


class WorkspaceViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id") or getattr(
            request.tenant, "organization_id", None
        )
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        workspaces = WorkspaceService().list_for_org(
            organization_id=organization_id, user=request.user
        )
        return paginate_and_serialize(request, workspaces, WorkspaceSerializer)

    def create(self, request):
        serializer = WorkspaceCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        workspace = WorkspaceService().create(
            organization_id=serializer.validated_data["organization_id"],
            user=request.user,
            name=serializer.validated_data["name"],
            slug=serializer.validated_data.get("slug") or None,
        )
        return Response(WorkspaceSerializer(workspace).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        workspace = WorkspaceService().get(workspace_id=pk, user=request.user)
        return Response(WorkspaceSerializer(workspace).data)
