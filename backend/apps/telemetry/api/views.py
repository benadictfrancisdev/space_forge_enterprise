from __future__ import annotations

import math
from datetime import datetime, timezone as dt_timezone

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.telemetry.ast_rules import validate_rule
from apps.telemetry.demo import create_demo_incidents, ingest_demo_events
from apps.telemetry.models import Incident, TelemetryEvent, TelemetryRule


def _org(request):
    """Resolve organization id from body, query param, or X-Organization-ID header."""
    val = (
        (request.data.get("organization_id") if hasattr(request, "data") and isinstance(request.data, dict) else None)
        or request.query_params.get("organization_id")
        or getattr(getattr(request, "tenant", None), "organization_id", None)
    )
    return str(val) if val else None


def _bad(msg):
    return Response(
        {"error": {"code": "validation_error", "message": msg}},
        status=status.HTTP_400_BAD_REQUEST,
    )


def _percentile(sorted_vals, p):
    if not sorted_vals:
        return None
    k = (len(sorted_vals) - 1) * p
    f = math.floor(k)
    c = math.ceil(k)
    if f == c:
        return round(sorted_vals[int(k)], 2)
    return round(sorted_vals[f] * (c - k) + sorted_vals[c] * (k - f), 2)


# ---------------- Rules Engine ----------------
class RuleValidateView(APIView):
    def post(self, request):
        source = request.data.get("source") or request.data.get("source_md") or ""
        return Response(validate_rule(source, request.data.get("condition")))


class RuleDeployView(APIView):
    def post(self, request):
        org = _org(request)
        if not org:
            return _bad("organization_id is required")
        source = request.data.get("source") or request.data.get("source_md") or ""
        result = validate_rule(source, request.data.get("condition"))
        if not result["valid"]:
            return Response(
                {"error": {"code": "invalid_rule", "message": "Rule failed validation", "detail": result}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        rule = TelemetryRule.objects.create(
            organization_id=org,
            workspace_id=getattr(getattr(request, "tenant", None), "workspace_id", None),
            name=request.data.get("name") or "Untitled Rule",
            source_md=source,
            condition=result["condition"],
            entities=result["entities"],
            status="deployed",
        )
        return Response(
            {
                "rule_id": str(rule.id),
                "name": rule.name,
                "status": rule.status,
                "condition": rule.condition,
                "bound_entities": rule.entities,
            },
            status=status.HTTP_201_CREATED,
        )


class RuleListView(APIView):
    def get(self, request):
        org = _org(request)
        qs = TelemetryRule.objects.all()
        if org:
            qs = qs.filter(organization_id=org)
        return Response(
            [
                {
                    "id": str(r.id),
                    "name": r.name,
                    "status": r.status,
                    "condition": r.condition,
                    "entities": r.entities,
                    "created_at": r.created_at.isoformat(),
                }
                for r in qs[:100]
            ]
        )


# ---------------- Entity Graph ----------------
class GraphEntitiesView(APIView):
    STATIC_MODULES = ["payments", "checkout", "auth", "inventory", "search", "notifications"]

    def get(self, request):
        org = _org(request)
        q = (request.query_params.get("query") or "").lower().strip()
        entities: list[dict] = []

        ev = TelemetryEvent.objects.all()
        if org:
            ev = ev.filter(organization_id=org)
        metrics = sorted({m for m in ev.values_list("metric", flat=True) if m})
        modules = sorted({m for m in ev.values_list("module", flat=True) if m}) or self.STATIC_MODULES
        for m in metrics:
            entities.append({"type": "metric", "name": m, "label": m})
        for m in modules:
            entities.append({"type": "module", "name": m, "label": m})

        # connectors (best-effort — integrations app)
        try:
            from apps.integrations.infrastructure.models import Connection

            conns = Connection.objects.all()
            if org:
                conns = conns.filter(organization_id=org)
            for c in conns[:50]:
                entities.append({"type": "connector", "name": c.name, "label": c.name})
        except Exception:  # noqa: BLE001
            pass

        # datasets (best-effort)
        try:
            from apps.datasets.infrastructure.models import Dataset

            ds = Dataset.objects.all()
            if org:
                ds = ds.filter(organization_id=org)
            for d in ds[:50]:
                entities.append({"type": "dataset", "name": d.name, "label": d.name})
        except Exception:  # noqa: BLE001
            pass

        if q:
            entities = [e for e in entities if q in e["name"].lower()]
        return Response(entities[:50])


# ---------------- Event Engine ----------------
class EventIngestView(APIView):
    def post(self, request):
        org = _org(request)
        if not org:
            return _bad("organization_id is required (header X-Organization-ID or body)")
        events = request.data.get("events")
        if events is None and request.data.get("metric"):
            events = [request.data]
        if not isinstance(events, list) or not events:
            # allow a demo-fill shortcut
            if request.data.get("demo"):
                inserted = ingest_demo_events(org, int(request.data.get("count") or 180))
                return Response({"inserted": inserted, "demo": True}, status=status.HTTP_201_CREATED)
            return _bad("events (non-empty array) is required")
        rows = []
        for e in events:
            try:
                rows.append(
                    TelemetryEvent(
                        organization_id=org,
                        metric=str(e.get("metric") or ""),
                        module=str(e.get("module") or ""),
                        value=float(e.get("value") or e.get("latency_ms") or 0),
                        latency_ms=float(e.get("latency_ms") or e.get("value") or 0),
                        status=str(e.get("status") or "ok"),
                        metadata=e.get("metadata") or {},
                    )
                )
            except (TypeError, ValueError):
                continue
        TelemetryEvent.objects.bulk_create(rows)
        return Response({"inserted": len(rows)}, status=status.HTTP_201_CREATED)


class EventQueryView(APIView):
    def get(self, request):
        org = _org(request)
        if not org:
            return _bad("organization_id is required")
        qs = TelemetryEvent.objects.filter(organization_id=org)
        metric = request.query_params.get("metric")
        module = request.query_params.get("module")
        if metric:
            qs = qs.filter(metric=metric)
        if module:
            qs = qs.filter(module=module)
        for param, field in (("from", "occurred_at__gte"), ("to", "occurred_at__lte")):
            raw = request.query_params.get(param)
            if raw:
                try:
                    qs = qs.filter(**{field: datetime.fromisoformat(raw.replace("Z", "+00:00"))})
                except ValueError:
                    pass
        limit = min(int(request.query_params.get("limit") or 100), 500)
        rows = qs.order_by("-occurred_at")[:limit]
        return Response(
            [
                {
                    "id": str(r.id),
                    "metric": r.metric,
                    "module": r.module,
                    "value": r.value,
                    "latency_ms": r.latency_ms,
                    "status": r.status,
                    "occurred_at": r.occurred_at.isoformat(),
                    "metadata": r.metadata,
                }
                for r in rows
            ]
        )


class EventStatsView(APIView):
    def get(self, request):
        org = _org(request)
        if not org:
            return _bad("organization_id is required")
        qs = TelemetryEvent.objects.filter(organization_id=org)
        total = qs.count()
        if total == 0:
            return Response(
                {
                    "total_events": 0,
                    "p50_ms": None,
                    "p90_ms": None,
                    "p99_ms": None,
                    "events_per_second": 0,
                    "error_rate": 0,
                }
            )
        latencies = sorted(qs.values_list("latency_ms", flat=True))
        errors = qs.filter(status="error").count()
        times = list(qs.values_list("occurred_at", flat=True))
        span = (max(times) - min(times)).total_seconds() or 1
        return Response(
            {
                "total_events": total,
                "p50_ms": _percentile(latencies, 0.50),
                "p90_ms": _percentile(latencies, 0.90),
                "p99_ms": _percentile(latencies, 0.99),
                "events_per_second": round(total / span, 2),
                "error_rate": round(errors / total * 100, 2),
            }
        )


# ---------------- Incidents ----------------
def _incident_dict(inc: Incident) -> dict:
    return {
        "id": str(inc.id),
        "ticket_id": inc.ticket_id,
        "title": inc.title,
        "severity": inc.severity,
        "status": inc.status,
        "created_at": inc.created_at.isoformat(),
    }


class IncidentListView(APIView):
    def get(self, request):
        org = _org(request)
        qs = Incident.objects.all()
        if org:
            qs = qs.filter(organization_id=org)
        return Response([_incident_dict(i) for i in qs[:100]])


class IncidentArtifactsView(APIView):
    def get(self, request, ticket_id=None):
        inc = Incident.objects.filter(id=ticket_id).first() or Incident.objects.filter(ticket_id=ticket_id).first()
        if not inc:
            return Response(
                {"error": {"code": "not_found", "message": "Incident not found"}},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(
            {
                **_incident_dict(inc),
                "cause_md": inc.cause_md,
                "predict_md": inc.predict_md,
                "blast_radius": inc.blast_radius,
            }
        )


class IncidentGenerateDemoView(APIView):
    """Populate the current tenant with demo telemetry + incidents for instant exploration."""

    def post(self, request):
        org = _org(request)
        if not org:
            return _bad("organization_id is required")
        Incident.objects.filter(organization_id=org).delete()
        TelemetryEvent.objects.filter(organization_id=org).delete()
        events = ingest_demo_events(org, int(request.data.get("events") or 180))
        incidents = create_demo_incidents(org)
        return Response(
            {"events_ingested": events, "incidents_created": incidents},
            status=status.HTTP_201_CREATED,
        )
