"""Enterprise application config models — Track 13 (orchestration only)."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class JourneyDefinition(TenantBaseModel):
    """Business journey template — stages stored as JSON."""

    class JourneyType(models.TextChoices):
        CUSTOMER = "customer", "Customer"
        EMPLOYEE = "employee", "Employee"
        ORDER = "order", "Order"
        TICKET = "ticket", "Ticket"
        CUSTOM = "custom", "Custom"

    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    journey_type = models.CharField(
        max_length=32,
        choices=JourneyType.choices,
        default=JourneyType.CUSTOMER,
    )
    industry = models.CharField(max_length=64, blank=True, default="")
    dataset = models.ForeignKey(
        "datasets.Dataset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="journeys",
    )
    stage_column = models.CharField(max_length=128, blank=True, default="")
    stages = models.JSONField(default=list, blank=True)
    is_template = models.BooleanField(default=False)
    description = models.TextField(blank=True, default="")
    owner_department = models.CharField(max_length=128, blank=True, default="")
    time_column = models.CharField(max_length=128, blank=True, default="")
    entity_column = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        db_table = "enterprise_app_journeys"
        ordering = ["name"]


class ReportTemplate(TenantBaseModel):
    class ReportType(models.TextChoices):
        BOARD = "board", "Board"
        EXECUTIVE = "executive", "Executive"
        DEPARTMENT = "department", "Department"
        FINANCIAL = "financial", "Financial"
        COMPLIANCE = "compliance", "Compliance"
        OPERATIONAL = "operational", "Operational"

    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    name = models.CharField(max_length=255)
    report_type = models.CharField(max_length=32, choices=ReportType.choices)
    sections = models.JSONField(default=list, blank=True)
    schedule = models.CharField(max_length=32, blank=True, default="manual")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "enterprise_app_report_templates"
        ordering = ["name"]


class DecisionCase(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="decision_cases",
    )
    problem = models.TextField()
    status = models.CharField(max_length=32, default="open")
    result_bundle = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "enterprise_app_decision_cases"
        ordering = ["-created_at"]


class ExecutiveBriefSchedule(TenantBaseModel):
    """Scheduled executive brief delivery."""

    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="brief_schedules",
    )
    frequency = models.CharField(max_length=16, choices=Frequency.choices, default=Frequency.DAILY)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "enterprise_app_brief_schedules"


class ScheduledReport(TenantBaseModel):
    """Scheduled enterprise report delivery."""

    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="scheduled_reports",
    )
    report_type = models.CharField(max_length=32, default=ReportTemplate.ReportType.EXECUTIVE)
    frequency = models.CharField(max_length=16, choices=Frequency.choices, default=Frequency.DAILY)
    is_active = models.BooleanField(default=True)
    last_run_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "enterprise_app_scheduled_reports"
