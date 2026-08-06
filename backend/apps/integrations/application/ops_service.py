"""Connector operations aggregation — health, sync history, failures (Track 11B.8)."""
from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Count, Sum
from django.utils import timezone

from apps.integrations.infrastructure.models import Connection, SyncRun


def _sync_run_queryset(
    *,
    organization_id,
    workspace_id=None,
    hours: int = 168,
):
    since = timezone.now() - timedelta(hours=hours)
    qs = SyncRun.objects.filter(
        organization_id=organization_id,
        created_at__gte=since,
    )
    if workspace_id:
        qs = qs.filter(workspace_id=workspace_id)
    return qs


def _connection_queryset(*, organization_id, workspace_id=None):
    qs = Connection.objects.filter(organization_id=organization_id)
    if workspace_id:
        qs = qs.filter(workspace_id=workspace_id)
    return qs


def _sync_stats(run_qs) -> dict[str, Any]:
    by_status = {
        row["status"]: row["count"]
        for row in run_qs.values("status").annotate(count=Count("id"))
    }
    succeeded = by_status.get(SyncRun.Status.SUCCEEDED, 0)
    failed = by_status.get(SyncRun.Status.FAILED, 0)
    total = sum(by_status.values())
    success_rate = round((succeeded / total) * 100, 2) if total else 100.0
    rows_loaded = (
        run_qs.filter(status=SyncRun.Status.SUCCEEDED).aggregate(total=Sum("rows_loaded"))["total"]
        or 0
    )
    return {
        "total": total,
        "succeeded": succeeded,
        "failed": failed,
        "running": by_status.get(SyncRun.Status.RUNNING, 0),
        "queued": by_status.get(SyncRun.Status.QUEUED, 0),
        "cancelled": by_status.get(SyncRun.Status.CANCELLED, 0),
        "success_rate_pct": success_rate,
        "rows_loaded_total": int(rows_loaded),
        "by_status": by_status,
    }


def _connection_dashboard_row(connection: Connection, run_qs) -> dict[str, Any]:
    conn_runs = run_qs.filter(connection_id=connection.id)
    stats = _sync_stats(conn_runs)
    last_success = (
        conn_runs.filter(status=SyncRun.Status.SUCCEEDED)
        .order_by("-finished_at", "-created_at")
        .first()
    )
    last_failure = (
        conn_runs.filter(status=SyncRun.Status.FAILED)
        .order_by("-finished_at", "-created_at")
        .first()
    )
    return {
        "connection_id": str(connection.id),
        "name": connection.name,
        "connector_type": connection.connector_type,
        "workspace_id": str(connection.workspace_id),
        "health_status": connection.health_status,
        "last_health_message": connection.last_health_message,
        "is_active": connection.is_active,
        "sync_schedule": connection.sync_schedule,
        "last_sync_at": connection.last_sync_at.isoformat() if connection.last_sync_at else None,
        "next_sync_at": connection.next_sync_at.isoformat() if connection.next_sync_at else None,
        "last_successful_sync_at": (
            last_success.finished_at.isoformat()
            if last_success and last_success.finished_at
            else None
        ),
        "last_failed_sync_at": (
            last_failure.finished_at.isoformat()
            if last_failure and last_failure.finished_at
            else None
        ),
        "last_error": (last_failure.error[:500] if last_failure and last_failure.error else ""),
        "sync_success_rate_pct": stats["success_rate_pct"],
        "sync_runs_total": stats["total"],
        "sync_runs_failed": stats["failed"],
        "rows_loaded_total": stats["rows_loaded_total"],
        "target_dataset_id": (
            str(connection.target_dataset_id) if connection.target_dataset_id else None
        ),
    }


def connectors_summary(
    *,
    organization_id,
    workspace_id=None,
    hours: int = 168,
) -> dict[str, Any]:
    conn_qs = _connection_queryset(organization_id=organization_id, workspace_id=workspace_id)
    run_qs = _sync_run_queryset(
        organization_id=organization_id,
        workspace_id=workspace_id,
        hours=hours,
    )

    by_health = {
        row["health_status"]: row["count"]
        for row in conn_qs.values("health_status").annotate(count=Count("id"))
    }
    by_connector_type = {
        row["connector_type"]: row["count"]
        for row in conn_qs.values("connector_type").annotate(count=Count("id"))
    }
    sync_stats = _sync_stats(run_qs)

    connections = [
        _connection_dashboard_row(connection, run_qs)
        for connection in conn_qs.order_by("-updated_at")
    ]

    unhealthy = by_health.get(Connection.HealthStatus.UNHEALTHY, 0)
    healthy = by_health.get(Connection.HealthStatus.HEALTHY, 0)

    return {
        "organization_id": str(organization_id),
        "workspace_id": str(workspace_id) if workspace_id else None,
        "window_hours": hours,
        "connections_total": conn_qs.count(),
        "connections_active": conn_qs.filter(is_active=True).count(),
        "connections_healthy": healthy,
        "connections_unhealthy": unhealthy,
        "by_health_status": by_health,
        "by_connector_type": by_connector_type,
        "sync": sync_stats,
        "connections": connections,
    }


def connector_failures(
    *,
    organization_id,
    workspace_id=None,
    hours: int = 168,
    limit: int = 20,
) -> list[dict[str, Any]]:
    run_qs = (
        _sync_run_queryset(
            organization_id=organization_id,
            workspace_id=workspace_id,
            hours=hours,
        )
        .filter(status=SyncRun.Status.FAILED)
        .select_related("connection")
        .order_by("-finished_at", "-created_at")[: max(1, min(limit, 100))]
    )
    failures: list[dict[str, Any]] = []
    for run in run_qs:
        failures.append(
            {
                "sync_run_id": str(run.id),
                "connection_id": str(run.connection_id),
                "connection_name": run.connection.name,
                "connector_type": run.connection.connector_type,
                "workspace_id": str(run.workspace_id),
                "mode": run.mode,
                "error": run.error[:500] if run.error else "",
                "started_at": run.started_at.isoformat() if run.started_at else None,
                "finished_at": run.finished_at.isoformat() if run.finished_at else None,
                "can_retry": run.connection.is_active,
            }
        )
    return failures
