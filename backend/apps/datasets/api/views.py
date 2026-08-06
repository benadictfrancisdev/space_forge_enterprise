from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.datasets.application.services import DatasetService
from apps.datasets.infrastructure.models import Dataset


class DatasetListSerializer(serializers.ModelSerializer):
    """List view — excludes heavy schema/statistics JSON blobs."""

    class Meta:
        model = Dataset
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "name",
            "description",
            "status",
            "profile_status",
            "row_count",
            "version",
            "storage_object_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "name",
            "description",
            "status",
            "profile_status",
            "schema",
            "statistics",
            "row_count",
            "version",
            "storage_object_id",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class DatasetCreateSerializer(serializers.Serializer):
    organization_id = serializers.UUIDField()
    workspace_id = serializers.UUIDField()
    name = serializers.CharField(max_length=255)
    description = serializers.CharField(required=False, allow_blank=True, default="")
    storage_object_id = serializers.UUIDField(required=False, allow_null=True)
    schema = serializers.DictField(required=False)
    row_count = serializers.IntegerField(required=False, allow_null=True)


class DatasetBindSerializer(serializers.Serializer):
    storage_object_id = serializers.UUIDField()


class DatasetViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        datasets = DatasetService().list(
            organization_id=organization_id,
            user=request.user,
            workspace_id=request.query_params.get("workspace_id"),
        )
        return paginate_and_serialize(request, datasets, DatasetListSerializer)

    def create(self, request):
        serializer = DatasetCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dataset = DatasetService().create(
            organization_id=serializer.validated_data["organization_id"],
            workspace_id=serializer.validated_data["workspace_id"],
            user=request.user,
            name=serializer.validated_data["name"],
            description=serializer.validated_data.get("description", ""),
            storage_object_id=serializer.validated_data.get("storage_object_id"),
            schema=serializer.validated_data.get("schema"),
            row_count=serializer.validated_data.get("row_count"),
        )
        return Response(DatasetSerializer(dataset).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        dataset = DatasetService().get(dataset_id=pk, user=request.user)
        return Response(DatasetSerializer(dataset).data)

    @action(detail=True, methods=["post"], url_path="bind-storage")
    def bind_storage(self, request, pk=None):
        serializer = DatasetBindSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dataset = DatasetService().bind_storage(
            dataset_id=pk,
            user=request.user,
            storage_object_id=serializer.validated_data["storage_object_id"],
        )
        return Response(DatasetSerializer(dataset).data)

    @action(detail=True, methods=["post"], url_path="profile")
    def profile(self, request, pk=None):
        dataset = DatasetService().enqueue_profile(dataset_id=pk, user=request.user)
        return Response(DatasetSerializer(dataset).data, status=status.HTTP_202_ACCEPTED)

    @action(detail=True, methods=["get"], url_path="statistics")
    def statistics(self, request, pk=None):
        dataset = DatasetService().get(dataset_id=pk, user=request.user)
        return Response(
            {
                "dataset_id": str(dataset.id),
                "profile_status": dataset.profile_status,
                "row_count": dataset.row_count,
                "schema": dataset.schema,
                "statistics": dataset.statistics,
            }
        )

    def destroy(self, request, pk=None):
        DatasetService().delete(dataset_id=pk, user=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["get"], url_path="export")
    def export(self, request, pk=None):
        manifest = DatasetService().export_manifest(dataset_id=pk, user=request.user)
        return Response(manifest)

    @action(detail=True, methods=["post"], url_path="share")
    def share(self, request, pk=None):
        email = request.data.get("email") or request.data.get("grantee_email")
        permission = request.data.get("permission") or "dataset:read"
        if not email:
            return Response(
                {"error": {"code": "validation_error", "message": "email is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        result = DatasetService().share(
            dataset_id=pk, user=request.user, grantee_email=email, permission=permission
        )
        return Response(result, status=status.HTTP_201_CREATED)
