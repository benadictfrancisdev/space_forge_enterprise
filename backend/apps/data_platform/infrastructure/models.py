"""Enterprise Data Platform models — Track 12.1."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TenantBaseModel


class PipelineLayer(models.TextChoices):
    LANDING = "landing", "Landing Zone"
    BRONZE = "bronze", "Bronze"
    SILVER = "silver", "Silver"
    GOLD = "gold", "Gold"


class DatasetVersion(TenantBaseModel):
    """Immutable version snapshot for a dataset."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="versions",
    )
    version_number = models.PositiveIntegerField()
    storage_object = models.ForeignKey(
        "storage.StorageObject",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="dataset_versions",
    )
    schema = models.JSONField(default=dict, blank=True)
    row_count = models.BigIntegerField(null=True, blank=True)
    checksum_sha256 = models.CharField(max_length=64, blank=True, default="")
    change_summary = models.TextField(blank=True, default="")
    source_layer = models.CharField(
        max_length=16,
        choices=PipelineLayer.choices,
        default=PipelineLayer.LANDING,
    )

    class Meta:
        db_table = "data_platform_dataset_versions"
        ordering = ["-version_number"]
        constraints = [
            models.UniqueConstraint(
                fields=["dataset", "version_number"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_dataset_version_alive",
            ),
        ]
        indexes = [
            models.Index(
                fields=["organization_id", "dataset", "-version_number"],
                name="idx_dp_version_org_ds",
            ),
        ]


class LayerArtifact(TenantBaseModel):
    """Storage artifact at a specific pipeline layer."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="layer_artifacts",
    )
    dataset_version = models.ForeignKey(
        DatasetVersion,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="layer_artifacts",
    )
    layer = models.CharField(max_length=16, choices=PipelineLayer.choices, db_index=True)
    storage_object = models.ForeignKey(
        "storage.StorageObject",
        on_delete=models.PROTECT,
        related_name="layer_artifacts",
    )
    row_count = models.BigIntegerField(null=True, blank=True)
    schema = models.JSONField(default=dict, blank=True)
    status = models.CharField(max_length=32, default="ready")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "data_platform_layer_artifacts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["dataset", "layer", "-created_at"],
                name="idx_dp_layer_ds_layer",
            ),
        ]


class CatalogEntry(TenantBaseModel):
    """Searchable data catalog entry — one per dataset."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.OneToOneField(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="catalog_entry",
    )
    display_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    current_layer = models.CharField(
        max_length=16,
        choices=PipelineLayer.choices,
        default=PipelineLayer.LANDING,
    )
    quality_score = models.FloatField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="catalog_entries_owned",
    )
    search_text = models.TextField(blank=True, default="")

    class Meta:
        db_table = "data_platform_catalog"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["organization_id", "-updated_at"], name="idx_dp_catalog_org"),
            models.Index(fields=["organization_id", "is_published"], name="idx_dp_catalog_pub"),
        ]


class LineageRecord(TenantBaseModel):
    """Transformation lineage between datasets, layers, or external sources."""

    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    source_type = models.CharField(max_length=64)  # connection, dataset, storage_object
    source_id = models.UUIDField()
    target_type = models.CharField(max_length=64)  # dataset, layer_artifact, dataset_version
    target_id = models.UUIDField()
    transformation = models.CharField(max_length=128, default="ingest")
    layer = models.CharField(
        max_length=16,
        choices=PipelineLayer.choices,
        blank=True,
        default="",
    )
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "data_platform_lineage"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["source_type", "source_id"], name="idx_dp_lineage_src"),
            models.Index(fields=["target_type", "target_id"], name="idx_dp_lineage_tgt"),
        ]


class PipelineRun(TenantBaseModel):
    """Tracks a full landing → gold pipeline execution."""

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"
        CANCELLED = "cancelled", "Cancelled"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="pipeline_runs",
    )
    job = models.ForeignKey(
        "jobs.Job",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pipeline_runs",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    current_layer = models.CharField(
        max_length=16,
        choices=PipelineLayer.choices,
        blank=True,
        default="",
    )
    source_storage_object = models.ForeignKey(
        "storage.StorageObject",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pipeline_runs_as_source",
    )
    error = models.TextField(blank=True, default="")
    stages_completed = models.JSONField(default=list, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "data_platform_pipeline_runs"
        ordering = ["-created_at"]
