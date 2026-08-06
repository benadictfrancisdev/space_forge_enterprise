"""Operations aggregation — jobs, AI, alerts (Track 10)."""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Avg, Count
from django.utils import timezone

from apps.ai.application.client import AIComputeClient
from apps.audit.infrastructure.models import AuditLog
from apps.core import metrics
from apps.jobs.infrastructure.models import Job
from apps.platform.application.health import run_readiness_checks


def platform_health_detail() -> dict[str, Any]:
    readiness = run_readiness_checks()
    ai_health = AIComputeClient().health()
    return {
        "status": "ok" if readiness["ok"] and ai_health.get("status") == "ok" else "degraded",
        "readiness": readiness,
        "ai": {
            "status": ai_health.get("status"),
            "transport": ai_health.get("transport"),
            "operations": ai_health.get("operations") or [],
            "schema_version": ai_health.get("schema_version"),
        },
    }


def jobs_summary(*, organization_id) -> dict[str, Any]:
    qs = Job.objects.filter(organization_id=organization_id)
    by_status = {row["status"]: row["count"] for row in qs.values("status").annotate(count=Count("id"))}
    queued = by_status.get(Job.Status.QUEUED, 0)
    running = by_status.get(Job.Status.RUNNING, 0)
    failed = by_status.get(Job.Status.FAILED, 0)
    succeeded = by_status.get(Job.Status.SUCCEEDED, 0)
    total = sum(by_status.values())
    avg_ms = qs.filter(execution_ms__isnull=False).aggregate(avg=Avg("execution_ms"))["avg"]
    success_rate = round((succeeded / total) * 100, 2) if total else 100.0
    return {
        "organization_id": str(organization_id),
        "total": total,
        "queued": queued,
        "running": running,
        "failed": failed,
        "succeeded": succeeded,
        "success_rate_pct": success_rate,
        "avg_execution_ms": round(float(avg_ms), 2) if avg_ms is not None else None,
        "by_status": by_status,
    }


def ai_ops_summary(*, organization_id, hours: int = 24) -> dict[str, Any]:
    since = timezone.now() - timedelta(hours=hours)
    logs = AuditLog.objects.filter(
        organization_id=organization_id,
        action__startswith="ai.",
        created_at__gte=since,
    )
    total = logs.count()
    by_operation: dict[str, int] = {}
    by_provider: dict[str, int] = {}
    latencies: list[int] = []
    costs: list[float] = []
    fallback_count = 0

    for log in logs.only("action", "after"):
        after = log.after or {}
        op = after.get("operation") or log.action.replace("ai.", "", 1)
        by_operation[op] = by_operation.get(op, 0) + 1
        provider = after.get("provider") or "unknown"
        by_provider[provider] = by_provider.get(provider, 0) + 1
        if after.get("latency_ms") is not None:
            latencies.append(int(after["latency_ms"]))
        if after.get("cost_usd") is not None:
            costs.append(float(after["cost_usd"]))
        transport = after.get("transport") or ""
        if "fallback" in transport:
            fallback_count += 1

    avg_latency = round(sum(latencies) / len(latencies), 2) if latencies else None
    total_cost = round(sum(costs), 6) if costs else 0.0
    return {
        "organization_id": str(organization_id),
        "window_hours": hours,
        "invocations": total,
        "avg_latency_ms": avg_latency,
        "total_cost_usd": total_cost,
        "fallback_count": fallback_count,
        "by_operation": by_operation,
        "by_provider": by_provider,
    }


def evaluate_alerts(*, organization_id) -> list[dict[str, Any]]:
    alerts: list[dict[str, Any]] = []
    readiness = run_readiness_checks()
    if not readiness["ok"]:
        alerts.append(
            {
                "severity": "critical",
                "name": "platform_not_ready",
                "message": "One or more platform dependencies are unhealthy",
                "checks": readiness["checks"],
            }
        )

    jobs = jobs_summary(organization_id=organization_id)
    if jobs["queued"] > 50:
        alerts.append(
            {
                "severity": "warning",
                "name": "queue_backlog",
                "message": f"Job queue depth is {jobs['queued']}",
                "threshold": 50,
                "value": jobs["queued"],
            }
        )
    if jobs["failed"] > 0 and jobs["success_rate_pct"] < 90:
        alerts.append(
            {
                "severity": "warning",
                "name": "job_failure_rate",
                "message": f"Job success rate is {jobs['success_rate_pct']}%",
                "value": jobs["success_rate_pct"],
            }
        )

    snap = metrics.snapshot()
    unhandled = sum(v for k, v in snap["counters"].items() if "http_unhandled_errors_total" in k)
    if unhandled > 0:
        alerts.append(
            {
                "severity": "critical",
                "name": "unhandled_errors",
                "message": f"Unhandled HTTP errors detected: {unhandled}",
                "value": unhandled,
            }
        )

    ai = AIComputeClient().health()
    if ai.get("status") != "ok":
        alerts.append(
            {
                "severity": "critical",
                "name": "ai_service_unavailable",
                "message": "AI compute service is not healthy",
                "detail": ai,
            }
        )

    return alerts


def ops_summary(*, organization_id) -> dict[str, Any]:
    from apps.integrations.application.ops_service import connectors_summary

    return {
        "organization_id": str(organization_id),
        "platform": platform_health_detail(),
        "jobs": jobs_summary(organization_id=organization_id),
        "ai": ai_ops_summary(organization_id=organization_id),
        "connectors": connectors_summary(organization_id=organization_id),
        "alerts": evaluate_alerts(organization_id=organization_id),
        "metrics": metrics.snapshot(),
    }
