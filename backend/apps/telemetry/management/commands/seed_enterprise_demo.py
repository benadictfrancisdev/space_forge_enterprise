import uuid

from django.core.management.base import BaseCommand

from apps.telemetry.demo import create_demo_incidents, ingest_demo_events
from apps.telemetry.models import Incident, TelemetryEvent, TelemetryRule

DEMO_TENANTS = [
    ("org_fintech", "FinTech Payments", uuid.UUID("11111111-1111-1111-1111-111111111111")),
    ("org_retail", "E-Commerce Storefront", uuid.UUID("22222222-2222-2222-2222-222222222222")),
    ("org_cloud", "Cloud Infrastructure", uuid.UUID("33333333-3333-3333-3333-333333333333")),
]

CONNECTORS = {
    "org_fintech": ["Stripe Webhooks", "PostgreSQL Slow-Query Stream"],
    "org_retail": ["Shopify Orders", "PostgreSQL Slow-Query Stream"],
    "org_cloud": ["AWS CloudWatch OTel", "Redis Streams"],
}


class Command(BaseCommand):
    help = "Seed 3 demo tenants with connectors, telemetry and 5 incidents each"

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete existing demo data first")

    def handle(self, *args, **options):
        org_ids = [t[2] for t in DEMO_TENANTS]
        if options.get("reset"):
            TelemetryEvent.objects.filter(organization_id__in=org_ids).delete()
            Incident.objects.filter(organization_id__in=org_ids).delete()
            TelemetryRule.objects.filter(organization_id__in=org_ids).delete()

        for slug, name, org_id in DEMO_TENANTS:
            # Best-effort: create real Organization row if the schema allows.
            try:
                from apps.organizations.infrastructure.models import Organization

                Organization.objects.get_or_create(
                    id=org_id, defaults={"name": name, "slug": slug, "status": "active"}
                )
            except Exception:  # noqa: BLE001
                pass

            # Sample rule
            TelemetryRule.objects.get_or_create(
                organization_id=org_id,
                name=f"{name} — Latency Guard",
                defaults={
                    "source_md": f"# {name} Latency Guard\n@module payments\n@metric payments.latency_ms\n\nWHEN payments.latency_ms > 500 THEN alert\n",
                    "condition": "payments.latency_ms > 500",
                    "entities": [
                        {"type": "module", "name": "payments"},
                        {"type": "metric", "name": "payments.latency_ms"},
                    ],
                    "status": "deployed",
                },
            )

            if not TelemetryEvent.objects.filter(organization_id=org_id).exists():
                n = ingest_demo_events(org_id, 200)
            else:
                n = TelemetryEvent.objects.filter(organization_id=org_id).count()

            if not Incident.objects.filter(organization_id=org_id).exists():
                create_demo_incidents(org_id, start=1001)

            self.stdout.write(
                self.style.SUCCESS(
                    f"{slug} [{org_id}] connectors={CONNECTORS[slug]} events={n} incidents=5"
                )
            )

        self.stdout.write(self.style.SUCCESS("seed_enterprise_demo complete"))
