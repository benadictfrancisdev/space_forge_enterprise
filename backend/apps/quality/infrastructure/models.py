"""Data Quality Platform models — Track 12.3."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class QualityRun(TenantBaseModel):
    """Quality validation job run."""

    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        RUNNING = "running", "Running"
        PASSED = "passed", "Passed"
        FAILED = "failed", "Failed"
        WARNING = "warning", "Warning"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="quality_runs",
    )
    job = models.ForeignKey(
        "jobs.Job",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="quality_runs",
    )
    status = models.CharField(
        max_length=32,
        choices=Status.choices,
        default=Status.QUEUED,
        db_index=True,
    )
    score = models.FloatField(null=True, blank=True)
    checks_passed = models.PositiveIntegerField(default=0)
    checks_failed = models.PositiveIntegerField(default=0)
    checks_warning = models.PositiveIntegerField(default=0)
    error = models.TextField(blank=True, default="")
    finished_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "quality_runs"
        ordering = ["-created_at"]


class QualityReport(TenantBaseModel):
    """Detailed quality report for a run."""

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="quality_reports",
    )
    quality_run = models.OneToOneField(
        QualityRun,
        on_delete=models.CASCADE,
        related_name="report",
    )
    overall_score = models.FloatField(default=0.0)
    validation_results = models.JSONField(default=dict, blank=True)
    profiling_results = models.JSONField(default=dict, blank=True)
    duplicate_results = models.JSONField(default=dict, blank=True)
    missing_value_results = models.JSONField(default=dict, blank=True)
    schema_drift_results = models.JSONField(default=dict, blank=True)
    pii_results = models.JSONField(default=dict, blank=True)
    summary = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "quality_reports"
        ordering = ["-created_at"]
