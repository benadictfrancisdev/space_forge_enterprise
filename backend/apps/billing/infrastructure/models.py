"""Billing foundation — plans and accounts only. No payment processing yet."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel, UUIDPrimaryKeyModel, TimeStampedModel


class Plan(UUIDPrimaryKeyModel, TimeStampedModel):
    code = models.CharField(max_length=64, unique=True)
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True, default="")
    monthly_credits = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "billing_plans"


class BillingAccount(TenantBaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        PAST_DUE = "past_due", "Past Due"
        CANCELLED = "cancelled", "Cancelled"

    plan = models.ForeignKey(Plan, on_delete=models.PROTECT, related_name="accounts")
    status = models.CharField(max_length=32, choices=Status.choices, default=Status.ACTIVE)
    credit_balance = models.IntegerField(default=0)
    external_customer_id = models.CharField(max_length=128, blank=True, default="")

    class Meta:
        db_table = "billing_accounts"
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_billing_account_per_org",
            )
        ]
