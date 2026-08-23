"""Shared demo-data generators (used by seed command + generate-demo endpoint)."""
from __future__ import annotations

import random
import uuid
from datetime import timedelta

from django.utils import timezone

from apps.telemetry.models import Incident, TelemetryEvent

MODULES = ["payments", "checkout", "auth", "inventory", "search", "notifications"]
METRICS = {
    "payments": "payments.latency_ms",
    "checkout": "checkout.latency_ms",
    "auth": "auth.latency_ms",
    "inventory": "inventory.query_ms",
    "search": "search.latency_ms",
    "notifications": "notify.delivery_ms",
}


def ingest_demo_events(organization_id, n: int = 180) -> int:
    now = timezone.now()
    rows = []
    for i in range(n):
        module = random.choice(MODULES)
        base = random.gauss(180, 60)
        spike = random.random() < 0.08
        latency = max(5.0, base + (random.uniform(400, 900) if spike else 0))
        is_error = spike and random.random() < 0.5
        rows.append(
            TelemetryEvent(
                id=uuid.uuid4(),
                organization_id=organization_id,
                metric=METRICS[module],
                module=module,
                value=round(latency, 2),
                latency_ms=round(latency, 2),
                status="error" if is_error else "ok",
                occurred_at=now - timedelta(seconds=random.randint(0, 3600)),
                metadata={"region": random.choice(["us-east", "eu-west", "ap-south"])},
            )
        )
    TelemetryEvent.objects.bulk_create(rows)
    return len(rows)


_INCIDENT_TEMPLATES = [
    ("payments", "critical", "Payment latency breach on checkout.latency_ms"),
    ("auth", "high", "Auth token refresh error spike"),
    ("inventory", "medium", "Inventory query slowdown under load"),
    ("search", "high", "Search P99 latency SLO breach"),
    ("notifications", "low", "Delayed notification delivery"),
]


def _cause_md(ticket, module) -> str:
    return (
        f"# CAUSE-{ticket}\n\n"
        f"## Correlated Root Cause — `@{module}`\n\n"
        f"- **DB lock contention** detected on `{module}_write` (avg wait 340ms)\n"
        f"- **Git commit** `a1b9f3c` (\"optimize {module} batch flush\") deployed 12m before breach\n"
        f"- Connection pool saturation: 98/100 active\n\n"
        f"> Deterministic correlation confidence: 0.87\n"
    )


def _predict_md(ticket, severity) -> str:
    revenue = {"critical": "$42,000", "high": "$18,500", "medium": "$6,200", "low": "$800"}[severity]
    tenants = {"critical": 320, "high": 140, "medium": 48, "low": 9}[severity]
    return (
        f"# PREDICT-{ticket}\n\n"
        f"## Blast Radius Forecast\n\n"
        f"- **Projected revenue at risk (next 60m):** {revenue}\n"
        f"- **Tenants impacted:** {tenants}\n"
        f"- **Recommended action:** roll back last deploy + scale write replicas\n"
    )


def create_demo_incidents(organization_id, start: int = 1001) -> int:
    created = 0
    for idx, (module, severity, title) in enumerate(_INCIDENT_TEMPLATES):
        ticket = f"INC-{start + idx}"
        Incident.objects.create(
            id=uuid.uuid4(),
            organization_id=organization_id,
            ticket_id=ticket,
            title=title,
            severity=severity,
            status=random.choice(["open", "investigating", "resolved"]),
            cause_md=_cause_md(ticket, module),
            predict_md=_predict_md(ticket, severity),
            blast_radius={
                "nodes": [
                    {"id": module, "type": "module"},
                    {"id": f"{module}_db", "type": "database"},
                    {"id": "revenue", "type": "kpi"},
                ],
                "links": [
                    {"source": module, "target": f"{module}_db"},
                    {"source": f"{module}_db", "target": "revenue"},
                ],
            },
        )
        created += 1
    return created
