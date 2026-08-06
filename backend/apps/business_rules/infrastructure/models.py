"""Business Rules Platform models — Track 12.4."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class KPIDefinition(TenantBaseModel):
    class Aggregation(models.TextChoices):
        COUNT = "count", "Count"
        SUM = "sum", "Sum"
        MEAN = "mean", "Mean"
        MIN = "min", "Min"
        MAX = "max", "Max"

    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="kpi_definitions",
    )
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    column_name = models.CharField(max_length=255, blank=True, default="")
    aggregation = models.CharField(
        max_length=16,
        choices=Aggregation.choices,
        default=Aggregation.COUNT,
    )
    target_value = models.FloatField(null=True, blank=True)
    unit = models.CharField(max_length=64, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "business_rules_kpi_definitions"
        ordering = ["name"]


class KPIResult(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    kpi = models.ForeignKey(KPIDefinition, on_delete=models.CASCADE, related_name="results")
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="kpi_results",
    )
    value = models.FloatField()
    target_value = models.FloatField(null=True, blank=True)
    variance_pct = models.FloatField(null=True, blank=True)
    status = models.CharField(max_length=32, default="computed")
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "business_rules_kpi_results"
        ordering = ["-created_at"]


class BusinessRule(TenantBaseModel):
    class RuleType(models.TextChoices):
        VALIDATION = "validation", "Validation"
        THRESHOLD = "threshold", "Threshold"
        POLICY = "policy", "Policy"

    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    rule_type = models.CharField(
        max_length=32,
        choices=RuleType.choices,
        default=RuleType.THRESHOLD,
    )
    condition = models.JSONField(default=dict)
    severity = models.CharField(max_length=32, default="medium")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "business_rules_rules"
        ordering = ["name"]


class RuleEvaluation(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    rule = models.ForeignKey(BusinessRule, on_delete=models.CASCADE, related_name="evaluations")
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="rule_evaluations",
    )
    passed = models.BooleanField(default=False)
    result = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "business_rules_evaluations"
        ordering = ["-created_at"]


class Policy(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    policy_type = models.CharField(max_length=64, default="data_access")
    rules = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "business_rules_policies"
        ordering = ["name"]


class PolicyEvaluation(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    policy = models.ForeignKey(Policy, on_delete=models.CASCADE, related_name="evaluations")
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="policy_evaluations",
    )
    compliant = models.BooleanField(default=False)
    violations = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = "business_rules_policy_evaluations"
        ordering = ["-created_at"]


class FinancialSnapshot(TenantBaseModel):
    workspace_id = models.UUIDField(db_index=True)
    dataset = models.ForeignKey(
        "datasets.Dataset",
        on_delete=models.CASCADE,
        related_name="financial_snapshots",
    )
    metrics = models.JSONField(default=dict, blank=True)
    currency = models.CharField(max_length=16, blank=True, default="USD")

    class Meta:
        db_table = "business_rules_financial_snapshots"
        ordering = ["-created_at"]
