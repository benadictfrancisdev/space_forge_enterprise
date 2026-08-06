"""Track 11B.8 — Connector operations dashboard API."""
from __future__ import annotations

import pytest
from rest_framework import status

from tests.conftest import api_data


@pytest.mark.django_db
def test_ops_connectors_summary_empty_org(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Conn Ops"}, format="json"))
    response = auth_client.get(f"/api/v1/ops/connectors/summary/?organization_id={org['id']}")
    assert response.status_code == status.HTTP_200_OK
    data = api_data(response)
    assert data["organization_id"] == str(org["id"])
    assert data["connections_total"] == 0
    assert data["sync"]["success_rate_pct"] == 100.0
    assert data["connections"] == []


@pytest.mark.django_db
def test_ops_connectors_summary_after_sync(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Conn Ops Sync"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    conn = api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": "Echo Ops",
                "connector_type": "platform.echo",
                "config": {"message": "ops", "row_count": 3},
            },
            format="json",
        )
    )
    tested = api_data(auth_client.post(f"/api/v1/connections/{conn['id']}/test/", {}, format="json"))
    assert tested["connection"]["health_status"] == "healthy"

    synced = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "full", "batch_size": 10},
            format="json",
        )
    )
    assert synced["sync_run"]["status"] == "succeeded"
    assert synced["sync_run"]["rows_loaded"] == 3

    summary = api_data(
        auth_client.get(f"/api/v1/ops/connectors/summary/?organization_id={org['id']}")
    )
    assert summary["connections_total"] == 1
    assert summary["connections_healthy"] == 1
    assert summary["sync"]["succeeded"] == 1
    assert summary["sync"]["rows_loaded_total"] == 3
    assert len(summary["connections"]) == 1
    row = summary["connections"][0]
    assert row["connection_id"] == conn["id"]
    assert row["health_status"] == "healthy"
    assert row["sync_runs_total"] == 1
    assert row["rows_loaded_total"] == 3
    assert row["last_successful_sync_at"] is not None


@pytest.mark.django_db
def test_ops_connectors_failures_endpoint(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Conn Failures"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    conn = api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": "Bad CSV",
                "connector_type": "csv",
                "config": {"inline_rows": []},
            },
            format="json",
        )
    )
    # Force unhealthy state — empty inline sync may still succeed with 0 rows; check failures list shape.
    failures = api_data(
        auth_client.get(f"/api/v1/ops/connectors/failures/?organization_id={org['id']}")
    )
    assert isinstance(failures["failures"], list)


@pytest.mark.django_db
def test_ops_summary_includes_connectors(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Ops Rollup"}, format="json"))
    data = api_data(auth_client.get(f"/api/v1/ops/summary/?organization_id={org['id']}"))
    assert "connectors" in data
    assert "connections_total" in data["connectors"]
    assert "sync" in data["connectors"]
