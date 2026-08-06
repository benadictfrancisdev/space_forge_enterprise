from rest_framework import serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.api.pagination import paginate_and_serialize
from apps.jobs.api.views import JobSerializer
from apps.metadata.application.services import MetadataService
from apps.metadata.infrastructure.models import (
    BusinessMetadata,
    ColumnMetadata,
    DatasetRelationship,
    MetadataTag,
    SchemaRegistryEntry,
)


class ColumnMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = ColumnMetadata
        fields = (
            "id",
            "dataset_id",
            "dataset_version_id",
            "column_name",
            "physical_type",
            "business_name",
            "description",
            "is_nullable",
            "is_primary_key",
            "tags",
            "statistics",
            "pii_detected",
            "pii_type",
            "created_at",
        )
        read_only_fields = fields


class DatasetRelationshipSerializer(serializers.ModelSerializer):
    class Meta:
        model = DatasetRelationship
        fields = (
            "id",
            "source_dataset_id",
            "target_dataset_id",
            "relation_type",
            "source_column",
            "target_column",
            "description",
            "confidence",
            "created_at",
        )
        read_only_fields = fields


class MetadataTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = MetadataTag
        fields = ("id", "dataset_id", "tag", "category", "created_at")
        read_only_fields = fields


class SchemaRegistrySerializer(serializers.ModelSerializer):
    class Meta:
        model = SchemaRegistryEntry
        fields = (
            "id",
            "dataset_id",
            "version_number",
            "schema",
            "checksum",
            "is_current",
            "created_at",
        )
        read_only_fields = fields


class BusinessMetadataSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessMetadata
        fields = (
            "id",
            "dataset_id",
            "business_owner_id",
            "data_steward_id",
            "domain",
            "classification",
            "retention_days",
            "glossary_terms",
            "custom_fields",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields


class MetadataViewSet(viewsets.ViewSet):
    @action(detail=True, methods=["get"], url_path="columns")
    def columns(self, request, pk=None):
        cols = MetadataService().list_columns(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, cols, ColumnMetadataSerializer)

    @action(detail=True, methods=["get"], url_path="relationships")
    def relationships(self, request, pk=None):
        rels = MetadataService().list_relationships(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, rels, DatasetRelationshipSerializer)

    @action(detail=True, methods=["get", "post"], url_path="tags")
    def tags(self, request, pk=None):
        if request.method == "POST":
            tag = request.data.get("tag")
            if not tag:
                return Response(
                    {"error": {"code": "validation_error", "message": "tag is required"}},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            obj = MetadataService().add_tag(
                dataset_id=pk,
                user=request.user,
                tag=tag,
                category=request.data.get("category", "general"),
            )
            return Response(MetadataTagSerializer(obj).data, status=status.HTTP_201_CREATED)
        tags = MetadataService().list_tags(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, tags, MetadataTagSerializer)

    @action(detail=True, methods=["get"], url_path="schema-registry")
    def schema_registry(self, request, pk=None):
        entries = MetadataService().get_schema_registry(dataset_id=pk, user=request.user)
        return paginate_and_serialize(request, entries, SchemaRegistrySerializer)

    @action(detail=True, methods=["get", "patch"], url_path="business")
    def business(self, request, pk=None):
        if request.method == "PATCH":
            meta = MetadataService().upsert_business_metadata(
                dataset_id=pk,
                user=request.user,
                domain=request.data.get("domain", ""),
                classification=request.data.get("classification", "internal"),
                glossary_terms=request.data.get("glossary_terms"),
                custom_fields=request.data.get("custom_fields"),
            )
            return Response(BusinessMetadataSerializer(meta).data)
        meta = MetadataService().get_business_metadata(dataset_id=pk, user=request.user)
        if not meta:
            return Response({"dataset_id": pk, "domain": "", "classification": "internal"})
        return Response(BusinessMetadataSerializer(meta).data)

    @action(detail=True, methods=["post"], url_path="extract")
    def extract(self, request, pk=None):
        job = MetadataService().enqueue_extract(dataset_id=pk, user=request.user)
        return Response({"job": JobSerializer(job).data}, status=status.HTTP_202_ACCEPTED)
