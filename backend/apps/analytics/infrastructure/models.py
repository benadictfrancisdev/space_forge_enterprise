"""Analytics Platform models — Track 12.5."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class AnalyticsRun(TenantBaseModel):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    class Operation(models.TextChoices):
        STATISTICS = "statistics", "Statistics"
        FORECAST = "forecast", "Forecast"
        ANOMALY = "anomaly", "Anomaly Detection"
        TIMESERIES = "timeseries", "Time Series"
        FEATURES = "features", "Feature Engineering"
        ML = "ml", "Machine Learning"
        OPTIMIZATION = "optimization", "Optimization"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="analytics_runs",
    )
    job = models.ForeignKey(
        "jobs.Job",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="analytics_runs",
    )
    operation = models.CharField(max_length=32, choices=Operation.choices, db_index=True)
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    parameters = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, default="")
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "analytics_runs"
        ordering = ["-created_at"]


class AnalyticsResult(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="analytics_results",
    )
    analytics_run = models.OneToOneField(
        AnalyticsRun,
        on_delete=models.CASCADE,
        related_name="result",
    )
    operation = models.CharField(max_length=32)
    result = models.JSONField(default=dict, blank=True)
    method = models.CharField(max_length=128, blank=True, default="")
    confidence = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = "analytics_results"
        ordering = ["-created_at"]
