"""Enterprise Services Platform — Track 12.10."""
from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, ValidationError
from apps.datasets.infrastructure.models import Dataset
from apps.enterprise_services.infrastructure.models import (
    FeatureFlag,
    LicenseEntitlement,
    NotificationChannel,
    OrgConfiguration,
    SearchIndexEntry,
    UsageMeterEvent,
    WebhookEndpoint,
)
from apps.integrations.infrastructure.models import Connection
from apps.intelligence.infrastructure.models import GlossaryTerm
from apps.organizations.application.services import OrganizationService
from apps.permissions.application.services import PermissionService

SEARCH_REINDEX_JOB = "enterprise_services.search_reindex"
METER_JOB = "enterprise_services.meter"


class EnterpriseServicesService:
    def __init__(self):
        self.orgs = OrganizationService()
        self.permissions = PermissionService()
        self.audit = AuditService()

    def get_configuration(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        config, _ = OrgConfiguration.objects.get_or_create(
            organization_id=org.id,
            defaults={"created_by": user, "updated_by": user},
        )
        return config

    @transaction.atomic
    def update_configuration(self, *, organization_id, user, **fields):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:write"
        )
        config, _ = OrgConfiguration.objects.get_or_create(
            organization_id=org.id,
            defaults={"created_by": user, "updated_by": user},
        )
        allowed = {
            "fiscal_year_start_month",
            "currency",
            "timezone",
            "industry_profile",
            "business_calendar",
            "settings",
        }
        for key, value in fields.items():
            if key in allowed and value is not None:
                setattr(config, key, value)
        config.updated_by = user
        config.save()
        self.audit.record(
            actor=user,
            action="enterprise.config.update",
            resource_type="org_configuration",
            resource_id=config.id,
            organization_id=org.id,
            after=fields,
        )
        return config

    def list_feature_flags(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        return FeatureFlag.objects.filter(organization_id=org.id)

    @transaction.atomic
    def upsert_feature_flag(
        self,
        *,
        organization_id,
        user,
        key: str,
        enabled: bool = False,
        rollout_pct: int = 100,
        description: str = "",
    ):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:write"
        )
        flag, _ = FeatureFlag.objects.update_or_create(
            organization_id=org.id,
            key=key,
            defaults={
                "enabled": enabled,
                "rollout_pct": rollout_pct,
                "description": description,
                "updated_by": user,
            },
        )
        if not flag.created_by_id:
            flag.created_by = user
            flag.save(update_fields=["created_by"])
        return flag

    def is_feature_enabled(self, *, organization_id, key: str) -> bool:
        flag = FeatureFlag.objects.filter(
            organization_id=organization_id, key=key, enabled=True
        ).first()
        return bool(flag)

    def search(
        self,
        *,
        organization_id,
        user,
        query: str,
        resource_type: str | None = None,
        limit: int = 25,
    ) -> list[SearchIndexEntry]:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        if not query.strip():
            return []
        qs = SearchIndexEntry.objects.filter(organization_id=org.id)
        if resource_type:
            qs = qs.filter(resource_type=resource_type)
        q_lower = query.lower()
        qs = qs.filter(
            Q(title__icontains=q_lower)
            | Q(body__icontains=q_lower)
            | Q(search_vector__icontains=q_lower)
        )
        return list(qs[:limit])

    @transaction.atomic
    def index_resource(
        self,
        *,
        organization_id,
        resource_type: str,
        resource_id,
        title: str,
        body: str = "",
        workspace_id=None,
        tags: list | None = None,
        actor=None,
    ):
        search_vector = f"{title} {body} {' '.join(tags or [])}".lower()
        entry, _ = SearchIndexEntry.objects.update_or_create(
            organization_id=organization_id,
            resource_type=resource_type,
            resource_id=resource_id,
            defaults={
                "workspace_id": workspace_id,
                "title": title,
                "body": body,
                "tags": tags or [],
                "search_vector": search_vector,
                "updated_by": actor,
            },
        )
        if actor and not entry.created_by_id:
            entry.created_by = actor
            entry.save(update_fields=["created_by"])
        return entry

    @transaction.atomic
    def reindex_organization(self, *, organization_id, actor=None) -> dict:
        indexed = 0
        for ds in Dataset.objects.filter(organization_id=organization_id):
            self.index_resource(
                organization_id=organization_id,
                resource_type=SearchIndexEntry.ResourceType.DATASET,
                resource_id=ds.id,
                title=ds.name,
                body=ds.description or "",
                workspace_id=ds.workspace_id,
                actor=actor,
            )
            indexed += 1

        for conn in Connection.objects.filter(organization_id=organization_id):
            self.index_resource(
                organization_id=organization_id,
                resource_type=SearchIndexEntry.ResourceType.CONNECTOR,
                resource_id=conn.id,
                title=conn.name,
                body=conn.connector_type,
                workspace_id=conn.workspace_id,
                actor=actor,
            )
            indexed += 1

        for term in GlossaryTerm.objects.filter(organization_id=organization_id):
            self.index_resource(
                organization_id=organization_id,
                resource_type=SearchIndexEntry.ResourceType.GLOSSARY,
                resource_id=term.id,
                title=term.term,
                body=term.definition or "",
                actor=actor,
            )
            indexed += 1

        from apps.ai_platform.infrastructure.models import AIMemory

        for mem in AIMemory.objects.filter(organization_id=organization_id)[:50]:
            self.index_resource(
                organization_id=organization_id,
                resource_type=SearchIndexEntry.ResourceType.AI_CONVERSATION,
                resource_id=mem.id,
                title=mem.session_key or "AI memory",
                body=mem.content or "",
                workspace_id=mem.workspace_id,
                actor=actor,
            )
            indexed += 1

        from apps.data_platform.infrastructure.models import CatalogEntry

        for cat in CatalogEntry.objects.filter(organization_id=organization_id)[:50]:
            self.index_resource(
                organization_id=organization_id,
                resource_type=SearchIndexEntry.ResourceType.REPORT,
                resource_id=cat.id,
                title=cat.display_name,
                body=cat.search_text or cat.description or "",
                workspace_id=cat.workspace_id,
                actor=actor,
            )
            indexed += 1

        return {"organization_id": str(organization_id), "indexed": indexed}

    @transaction.atomic
    def record_usage(
        self,
        *,
        organization_id,
        meter_type: str,
        quantity: Decimal = Decimal("1"),
        unit: str = "count",
        resource_type: str = "",
        resource_id=None,
        metadata: dict | None = None,
        actor=None,
    ) -> UsageMeterEvent:
        event = UsageMeterEvent.objects.create(
            organization_id=organization_id,
            meter_type=meter_type,
            quantity=quantity,
            unit=unit,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata or {},
            created_by=actor,
            updated_by=actor,
        )
        return event

    def usage_summary(self, *, organization_id, user) -> dict:
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        summary: dict[str, float] = {}
        for meter in UsageMeterEvent.MeterType.values:
            events = UsageMeterEvent.objects.filter(
                organization_id=org.id, meter_type=meter
            )
            total = sum(float(e.quantity) for e in events)
            summary[meter] = total
        return summary

    def list_entitlements(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        return LicenseEntitlement.objects.filter(organization_id=org.id)

    @transaction.atomic
    def seed_entitlements(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:write"
        )
        seeds = [
            (LicenseEntitlement.EntitlementType.SEAT, "seats", Decimal("10")),
            (LicenseEntitlement.EntitlementType.AI_QUOTA, "monthly_tokens", Decimal("100000")),
            (LicenseEntitlement.EntitlementType.USAGE, "storage_gb", Decimal("100")),
            (LicenseEntitlement.EntitlementType.FEATURE, "analytics_advanced", None),
        ]
        created = []
        for etype, key, limit_val in seeds:
            ent, was_created = LicenseEntitlement.objects.get_or_create(
                organization_id=org.id,
                entitlement_type=etype,
                key=key,
                defaults={
                    "limit_value": limit_val,
                    "created_by": user,
                    "updated_by": user,
                },
            )
            if was_created:
                created.append(ent)
        return created

    def check_ai_quota(self, *, organization_id, tokens: int = 1) -> bool:
        ent = LicenseEntitlement.objects.filter(
            organization_id=organization_id,
            entitlement_type=LicenseEntitlement.EntitlementType.AI_QUOTA,
            key="monthly_tokens",
            is_active=True,
        ).first()
        if not ent or not ent.limit_value:
            return True
        return float(ent.used_value) + tokens <= float(ent.limit_value)

    @transaction.atomic
    def consume_ai_quota(self, *, organization_id, tokens: int, actor=None):
        ent = LicenseEntitlement.objects.filter(
            organization_id=organization_id,
            entitlement_type=LicenseEntitlement.EntitlementType.AI_QUOTA,
            key="monthly_tokens",
        ).first()
        if ent:
            ent.used_value = Decimal(str(float(ent.used_value) + tokens))
            ent.updated_by = actor
            ent.save(update_fields=["used_value", "updated_by", "updated_at"])
        self.record_usage(
            organization_id=organization_id,
            meter_type=UsageMeterEvent.MeterType.AI,
            quantity=Decimal(str(tokens)),
            unit="tokens",
            actor=actor,
        )

    def list_webhooks(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        return WebhookEndpoint.objects.filter(organization_id=org.id)

    @transaction.atomic
    def create_webhook(self, *, organization_id, user, url: str, events: list | None = None):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:write"
        )
        return WebhookEndpoint.objects.create(
            organization_id=org.id,
            url=url,
            events=events or [],
            created_by=user,
            updated_by=user,
        )

    def list_notification_channels(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:read"
        )
        return NotificationChannel.objects.filter(organization_id=org.id)

    @transaction.atomic
    def seed_notification_channels(self, *, organization_id, user):
        org = self.orgs.get_for_user(organization_id=organization_id, user=user)
        self.permissions.require(
            user=user, organization_id=org.id, permission="enterprise:write"
        )
        channels = [
            NotificationChannel.Channel.IN_APP,
            NotificationChannel.Channel.EMAIL,
            NotificationChannel.Channel.WEBHOOK,
        ]
        created = []
        for ch in channels:
            nc, was_created = NotificationChannel.objects.get_or_create(
                organization_id=org.id,
                channel=ch,
                defaults={"created_by": user, "updated_by": user},
            )
            if was_created:
                created.append(nc)
        return created

    def dispatch_webhook_event(
        self,
        *,
        organization_id,
        event: str,
        payload: dict,
        actor=None,
    ) -> dict:
        """POST event payload to active webhook endpoints (best-effort)."""
        import httpx

        hooks = WebhookEndpoint.objects.filter(
            organization_id=organization_id,
            is_active=True,
        )
        delivered = []
        body = {"event": event, "payload": payload, "timestamp": timezone.now().isoformat()}
        for hook in hooks:
            events = hook.events or []
            if events and event not in events:
                continue
            try:
                httpx.post(hook.url, json=body, timeout=10.0)
                delivered.append(str(hook.id))
            except Exception:  # noqa: BLE001
                continue
        return {"event": event, "delivered": delivered}

    def run_search_reindex_for_job(self, job) -> dict:
        return self.reindex_organization(
            organization_id=job.organization_id,
            actor=job.created_by,
        )

    def run_meter_for_job(self, job) -> dict:
        payload = job.payload or {}
        event = self.record_usage(
            organization_id=job.organization_id,
            meter_type=payload.get("meter_type", UsageMeterEvent.MeterType.COMPUTE),
            quantity=Decimal(str(payload.get("quantity", 1))),
            unit=payload.get("unit", "count"),
            resource_type=payload.get("resource_type", ""),
            resource_id=payload.get("resource_id"),
            metadata=payload.get("metadata"),
            actor=job.created_by,
        )
        return {"event_id": str(event.id), "meter_type": event.meter_type}

    def run_wave4_for_organization(self, *, organization_id, actor=None) -> dict:
        config, _ = OrgConfiguration.objects.get_or_create(
            organization_id=organization_id,
            defaults={"created_by": actor, "updated_by": actor},
        )
        search = self.reindex_organization(organization_id=organization_id, actor=actor)
        if actor:
            self.seed_entitlements(organization_id=organization_id, user=actor)
            self.seed_notification_channels(organization_id=organization_id, user=actor)
        return {
            "configuration": {
                "currency": config.currency,
                "timezone": config.timezone,
            },
            "search": search,
        }
