"""Query & Compute Platform models — Track 12.8."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class QueryPlan(TenantBaseModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        READY = "ready", "Ready"
        EXECUTED = "executed", "Executed"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="query_plans",
    )
    natural_language = models.TextField(blank=True, default="")
    generated_sql = models.TextField()
    optimized_sql = models.TextField(blank=True, default="")
    plan_steps = models.JSONField(default=list, blank=True)
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.DRAFT)
    engine = models.CharField(max_length=32, default="duckdb")

    class Meta:
        db_table = "query_compute_plans"
        ordering = ["-created_at"]


class QueryExecution(TenantBaseModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="query_executions",
    )
    query_plan = models.ForeignKey(
        QueryPlan,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="executions",
    )
    job = models.ForeignKey(
        "jobs.Job",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="query_executions",
    )
    sql = models.TextField()
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    row_count = models.IntegerField(null=True, blank=True)
    result_preview = models.JSONField(default=list, blank=True)
    execution_ms = models.IntegerField(null=True, blank=True)
    engine = models.CharField(max_length=32, default="duckdb")
    error = models.TextField(blank=True, default="")
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "query_compute_executions"
        ordering = ["-created_at"]


class ComputeWorkerPool(TenantBaseModel):
    """Registry of compute worker capacity (metadata only — Celery owns workers)."""

    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    pool_name = models.CharField(max_length=128, default="default")
    max_concurrent = models.PositiveIntegerField(default=4)
    active_jobs = models.PositiveIntegerField(default=0)
    engine_capabilities = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "query_compute_worker_pools"
        ordering = ["pool_name"]
