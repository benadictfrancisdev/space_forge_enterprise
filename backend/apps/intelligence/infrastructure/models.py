"""Enterprise Intelligence Platform models — Track 12.6."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class SemanticModel(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="semantic_models",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    is_published = models.BooleanField(default=False)

    class Meta:
        db_table = "intelligence_semantic_models"
        ordering = ["name"]


class MetricDefinition(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    semantic_model = models.ForeignKey(
        SemanticModel,
        on_delete=models.CASCADE,
        related_name="metrics",
    )
    name = models.CharField(max_length=255)
    expression = models.CharField(max_length=512)
    column_name = models.CharField(max_length=255, blank=True, default="")
    aggregation = models.CharField(max_length=32, default="sum")
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "intelligence_metrics"
        ordering = ["name"]


class DimensionDefinition(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    semantic_model = models.ForeignKey(
        SemanticModel,
        on_delete=models.CASCADE,
        related_name="dimensions",
    )
    name = models.CharField(max_length=255)
    column_name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")

    class Meta:
        db_table = "intelligence_dimensions"
        ordering = ["name"]


class GlossaryTerm(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    term = models.CharField(max_length=255, db_index=True)
    definition = models.TextField()
    domain = models.CharField(max_length=128, blank=True, default="")
    related_columns = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "intelligence_glossary"
        ordering = ["term"]
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "term"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_glossary_term_alive",
            ),
        ]


class KnowledgeGraphNode(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="graph_nodes",
    )
    entity_type = models.CharField(max_length=64, default="column")
    entity_key = models.CharField(max_length=255)
    label = models.CharField(max_length=255)
    properties = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "intelligence_graph_nodes"
        ordering = ["entity_key"]
        indexes = [
            models.Index(fields=["dataset", "entity_type"], name="idx_intel_node_ds_type"),
        ]


class KnowledgeGraphEdge(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="graph_edges",
    )
    source_node = models.ForeignKey(
        KnowledgeGraphNode,
        on_delete=models.CASCADE,
        related_name="outbound_edges",
    )
    target_node = models.ForeignKey(
        KnowledgeGraphNode,
        on_delete=models.CASCADE,
        related_name="inbound_edges",
    )
    relationship = models.CharField(max_length=128, default="related")
    weight = models.FloatField(default=1.0)

    class Meta:
        db_table = "intelligence_graph_edges"
        ordering = ["-weight"]


class Recommendation(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="recommendations",
    )
    category = models.CharField(max_length=64, default="general")
    title = models.CharField(max_length=255)
    body = models.TextField()
    priority = models.CharField(max_length=32, default="medium")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "intelligence_recommendations"
        ordering = ["-created_at"]


class ContextBundle(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="context_bundles",
    )
    bundle = models.JSONField(default=dict, blank=True)
    version = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "intelligence_context_bundles"
        ordering = ["-version"]


class IndustryModel(TenantBaseModel):
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    industry = models.CharField(max_length=64, db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    kpi_templates = models.JSONField(default=list, blank=True)
    metric_templates = models.JSONField(default=list, blank=True)
    is_system = models.BooleanField(default=False)

    class Meta:
        db_table = "intelligence_industry_models"
        ordering = ["industry", "name"]
