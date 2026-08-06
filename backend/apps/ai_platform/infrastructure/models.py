"""Enterprise AI Platform models — Track 12.7."""
from __future__ import annotations

from django.conf import settings
from django.db import models

from apps.core.models import TenantBaseModel


class PromptTemplate(TenantBaseModel):
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    operation = models.CharField(max_length=64, db_index=True)
    version_tag = models.CharField(max_length=64, default="v1")
    system_prompt = models.TextField()
    user_template = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ai_platform_prompts"
        ordering = ["operation", "-created_at"]


class AgentDefinition(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    operations = models.JSONField(default=list, blank=True)
    tools = models.JSONField(default=list, blank=True)
    model_preferences = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ai_platform_agents"
        ordering = ["name"]


class AIMemory(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_memories",
    )
    session_key = models.CharField(max_length=128, db_index=True, blank=True, default="")
    role = models.CharField(max_length=32, default="assistant")
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "ai_platform_memory"
        ordering = ["-created_at"]


class EmbeddingRecord(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="embeddings",
    )
    source_type = models.CharField(max_length=64, default="row")
    source_key = models.CharField(max_length=255)
    text = models.TextField()
    vector = models.JSONField(default=list)
    model_name = models.CharField(max_length=128, default="spaceforge-hash-v1")

    class Meta:
        db_table = "ai_platform_embeddings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["dataset", "source_type"], name="idx_ai_embed_ds_type"),
        ]


class RAGDocument(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="rag_documents",
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "ai_platform_rag_documents"
        ordering = ["-created_at"]


class RAGChunk(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    document = models.ForeignKey(
        RAGDocument,
        on_delete=models.CASCADE,
        related_name="chunks",
    )
    chunk_index = models.PositiveIntegerField(default=0)
    text = models.TextField()
    embedding_id = models.UUIDField(null=True, blank=True)

    class Meta:
        db_table = "ai_platform_rag_chunks"
        ordering = ["chunk_index"]


class GuardrailPolicy(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    rules = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ai_platform_guardrails"
        ordering = ["name"]


class ToolDefinition(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True, default="")
    tool_type = models.CharField(max_length=64, default="dataset_query")
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "ai_platform_tools"
        ordering = ["name"]


class AIObservabilityEvent(TenantBaseModel):
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="ai_observability_events",
    )
    operation = models.CharField(max_length=64, db_index=True)
    provider = models.CharField(max_length=64, blank=True, default="")
    model = models.CharField(max_length=128, blank=True, default="")
    latency_ms = models.IntegerField(default=0)
    tokens_total = models.IntegerField(default=0)
    cost_usd = models.FloatField(default=0.0)
    confidence = models.FloatField(null=True, blank=True)
    guardrail_passed = models.BooleanField(default=True)
    hallucination_score = models.FloatField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "ai_platform_observability"
        ordering = ["-created_at"]
