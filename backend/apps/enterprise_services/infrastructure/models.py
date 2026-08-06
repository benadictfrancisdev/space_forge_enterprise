"""Enterprise Services Platform models — Track 12.10."""
from __future__ import annotations

from django.db import models

from apps.core.models import TenantBaseModel


class OrgConfiguration(TenantBaseModel):
    """Organization-level configuration."""

    fiscal_year_start_month = models.PositiveSmallIntegerField(default=1)
    currency = models.CharField(max_length=8, default="USD")
    timezone = models.CharField(max_length=64, default="UTC")
    industry_profile = models.CharField(max_length=128, blank=True, default="")
    business_calendar = models.JSONField(default=dict, blank=True)
    settings = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "enterprise_org_config"
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_enterprise_org_config_alive",
            ),
        ]


class FeatureFlag(TenantBaseModel):
    """Tenant-scoped feature flag for beta/enterprise rollout."""

    key = models.CharField(max_length=128)
    description = models.CharField(max_length=255, blank=True, default="")
    enabled = models.BooleanField(default=False)
    rollout_pct = models.PositiveSmallIntegerField(default=100)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "enterprise_feature_flags"
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "key"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_enterprise_flag_key_alive",
            ),
        ]


class SearchIndexEntry(TenantBaseModel):
    """Global enterprise search index entry."""

    class ResourceType(models.TextChoices):
        DATASET = "dataset", "Dataset"
        REPORT = "report", "Report"
        DASHBOARD = "dashboard", "Dashboard"
        CONNECTOR = "connector", "Connector"
        AI_CONVERSATION = "ai_conversation", "AI Conversation"
        GLOSSARY = "glossary", "Glossary"
        METRIC = "metric", "Metric"

    resource_type = models.CharField(max_length=32, choices=ResourceType.choices)
    resource_id = models.UUIDField(db_index=True)
    workspace_id = models.UUIDField(null=True, blank=True, db_index=True)
    title = models.CharField(max_length=512)
    body = models.TextField(blank=True, default="")
    tags = models.JSONField(default=list, blank=True)
    search_vector = models.TextField(blank=True, default="")

    class Meta:
        db_table = "enterprise_search_index"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["organization_id", "resource_type"], name="idx_es_search_type"),
        ]


class UsageMeterEvent(TenantBaseModel):
    """Usage metering for billing foundation."""

    class MeterType(models.TextChoices):
        AI = "ai", "AI"
        CONNECTOR = "connector", "Connector"
        STORAGE = "storage", "Storage"
        COMPUTE = "compute", "Compute"

    meter_type = models.CharField(max_length=32, choices=MeterType.choices)
    quantity = models.DecimalField(max_digits=18, decimal_places=4, default=1)
    unit = models.CharField(max_length=32, default="count")
    resource_type = models.CharField(max_length=64, blank=True, default="")
    resource_id = models.UUIDField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "enterprise_usage_events"
        ordering = ["-created_at"]


class LicenseEntitlement(TenantBaseModel):
    """Enterprise licensing entitlements."""

    class EntitlementType(models.TextChoices):
        SEAT = "seat", "Seat License"
        USAGE = "usage", "Usage License"
        AI_QUOTA = "ai_quota", "AI Quota"
        FEATURE = "feature", "Feature Entitlement"

    entitlement_type = models.CharField(max_length=32, choices=EntitlementType.choices)
    key = models.CharField(max_length=128)
    limit_value = models.DecimalField(max_digits=18, decimal_places=4, null=True, blank=True)
    used_value = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    is_active = models.BooleanField(default=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "enterprise_license_entitlements"
        constraints = [
            models.UniqueConstraint(
                fields=["organization_id", "entitlement_type", "key"],
                condition=models.Q(deleted_at__isnull=True),
                name="uniq_enterprise_entitlement_alive",
            ),
        ]


class WebhookEndpoint(TenantBaseModel):
    """Webhook delivery endpoint for notifications platform."""

    url = models.URLField(max_length=2048)
    events = models.JSONField(default=list, blank=True)
    secret = models.CharField(max_length=128, blank=True, default="")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "enterprise_webhook_endpoints"


class NotificationChannel(TenantBaseModel):
    """Notification channel preference."""

    class Channel(models.TextChoices):
        EMAIL = "email", "Email"
        IN_APP = "in_app", "In-App"
        SLACK = "slack", "Slack"
        TEAMS = "teams", "Teams"
        WEBHOOK = "webhook", "Webhook"

    channel = models.CharField(max_length=32, choices=Channel.choices)
    config = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "enterprise_notification_channels"
