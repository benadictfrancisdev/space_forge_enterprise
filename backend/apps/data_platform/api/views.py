from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.data_platform.application.services import DataPlatformService
from apps.data_platform.infrastructure.models import (
    CatalogEntry,
    DatasetVersion,
    LayerArtifact,
    LineageRecord,
    PipelineRun,
)
from apps.jobs.api.views import JobSerializer


class CatalogEntrySerializer(serializers.ModelSerializer):
    dataset_id = serializers.UUIDField(source="dataset.id", read_only=True)

    class Meta:
        model = CatalogEntry
        fields = (
            "id",
            "organization_id",
            "workspace_id",
            "dataset_id",
            "display_name",
            "description",
            "tags",
            "current_layer",
            "quality_score",
            "is_published",
            "owner_id",
            "search_text",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class DatasetVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetVersion
        fields = (
            "id",
            "dataset_id",
            "version_number",
            "storage_object_id",
            "schema",
            "row_count",
            "checksum_sha256",
            "change_summary",
            "source_layer",
            "created_at",
        )
        read_only_fields = fields


class LayerArtifactSerializer(serializers.ModelSerializer):
    class Meta:
        model = LayerArtifact
        fields = (
            "id",
            "dataset_id",
            "dataset_version_id",
            "layer",
            "storage_object_id",
            "row_count",
            "schema",
            "status",
            "metadata",
            "created_at",
        )
        read_only_fields = fields


class LineageRecordSerializer(serializers.ModelSerializer):
    class Meta:
        model = LineageRecord
        fields = (
            "id",
            "source_type",
            "source_id",
            "target_type",
            "target_id",
            "transformation",
            "layer",
            "metadata",
            "created_at",
        )
        read_only_fields = fields


class PipelineRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PipelineRun
        fields = (
            "id",
            "dataset_id",
            "job_id",
            "status",
            "current_layer",
            "source_storage_object_id",
            "error",
            "stages_completed",
            "finished_at",
            "created_at",
        )
        read_only_fields = fields


class CatalogViewSet(viewsets.ViewSet):
    def list(self, request):
        organization_id = request.query_params.get("organization_id")
        if not organization_id:
            return Response(
                {"error": {"code": "validation_error", "message": "organization_id is required"}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        entries = DataPlatformService().list_catalog(
            organization_id=organization_id,
            user=request.user,
            workspace_id=request.query_params.get("workspace_id"),
            published_only=request.query_params.get("published") in {"1", "true"},
        )
        return paginate_and_serialize(request, entries, CatalogEntrySerializer)


class DatasetPlatformViewSet(viewsets.ViewSet):
    """Data platform endpoints nested under datasets."""

    @action(detail=True, methods=["post"], url_path="pipeline")
    def pipeline(self, request, pk=None):
        run, job = DataPlatformService().enqueue_pipeline(
            dataset_id=pk,
            user=request.user,
            source_storage_object_id=request.data.get("source_storage_object_id"),
        )
        return Response(
            {
                "pipeline_run": PipelineRunSerializer(run).data,
                "job": JobSerializer(job).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )

    @action(detail=True, methods=["get"], url_path="versions")
    def versions(self, request, pk=None):
        versions = DataPlatformService().list_versions(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, versions, DatasetVersionSerializer)

    @action(detail=True, methods=["get"], url_path="layers")
    def layers(self, request, pk=None):
        artifacts = DataPlatformService().list_layer_artifacts(
            dataset_id=pk,
            user=request.user,
            layer=request.query_params.get("layer"),
        )
        return paginate_and_serialize(request, artifacts, LayerArtifactSerializer)

    @action(detail=True, methods=["get"], url_path="lineage")
    def lineage(self, request, pk=None):
        records = DataPlatformService().list_lineage(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, records, LineageRecordSerializer)

    @action(detail=True, methods=["get"], url_path="pipeline-runs")
    def pipeline_runs(self, request, pk=None):
        runs = DataPlatformService().list_pipeline_runs(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, runs, PipelineRunSerializer)

    @action(detail=True, methods=["get"], url_path="catalog")
    def catalog(self, request, pk=None):
        entry = DataPlatformService().get_catalog_entry(dataset_id=pk, user=request.user)
        return Response(CatalogEntrySerializer(entry).data)
