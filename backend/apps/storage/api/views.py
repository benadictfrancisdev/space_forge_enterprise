from rest_framework import serializers, status, viewsets
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.api.throttling import UploadThrottle
from apps.storage.application.services import StorageService
from apps.storage.infrastructure.models import StorageObject


class StorageObjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = StorageObject
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "bucket",
            "key",
            "filename",
            "content_type",
            "size_bytes",
            "checksum_sha256",
            "created_at",
        )
        read_only_fields = fields


class StorageObjectViewSet(viewsets.ViewSet):
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UploadThrottle]

    def list(self, request):
        organization_id = request.query_params.get("organization_id") or getattr(
            request.tenant, "organization_id", None
        )
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        objects = StorageService().list(organization_id=organization_id, user=request.user)
        return paginate_and_serialize(request, objects, StorageObjectSerializer)

    def create(self, request):
        organization_id = request.data.get("organization_id")
        file_obj = request.FILES.get("file")
        if not organization_id or not file_obj:
            return Response(
                {
                    "error": {
                        "code": "validation_error",
                        "message": "organization_id and file are required",
                    }
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        content = file_obj.read()
        obj = StorageService().upload(
            organization_id=organization_id,
            user=request.user,
            filename=file_obj.name,
            content=content,
            content_type=getattr(file_obj, "content_type", None) or "application/octet-stream",
            workspace_id=request.data.get("workspace_id") or None,
        )
        return Response(StorageObjectSerializer(obj).data, status=status.HTTP_201_CREATED)
