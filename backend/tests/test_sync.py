"""Track 11.5 — synchronization engine."""
from __future__ import annotations

import pytest
from rest_framework import status

from apps.datasets.infrastructure.models import Dataset
from apps.integrations.infrastructure.models import Connection, SyncRun
from apps.jobs.infrastructure.models import Job
from tests.conftest import api_data


@pytest.mark.django_db
def test_full_sync_creates_dataset_and_sync_run(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Sync Co"}, format="json"))
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
                "name": "Echo Sync",
                "connector_type": "platform.echo",
                "config": {"message": "sync-me", "row_count": 4},
            },
            format="json",
        )
    )

    synced = auth_client.post(
        f"/api/v1/connections/{conn['id']}/sync/",
        {"mode": "full", "batch_size": 2},
        format="json",
    )
    assert synced.status_code == status.HTTP_202_ACCEPTED
    body = api_data(synced)
    assert body["job"]["job_type"] == "connector.sync"
    assert body["job"]["status"] == Job.Status.SUCCEEDED
    assert body["job"]["result"]["ok"] is True
    assert body["job"]["result"]["rows_loaded"] == 4
    assert body["sync_run"]["status"] == SyncRun.Status.SUCCEEDED
    assert body["sync_run"]["rows_loaded"] == 4
    assert body["connection"]["target_dataset_id"] is not None
    assert body["connection"]["last_sync_at"] is not None
    assert body["connection"]["schema_version"] >= 1  # auto-discover

    dataset = Dataset.objects.get(id=body["connection"]["target_dataset_id"])
    assert dataset.row_count == 4
    assert dataset.storage_object_id is not None

    runs = api_data(auth_client.get(f"/api/v1/connections/{conn['id']}/sync-runs/"))
    assert len(runs) >= 1
    assert runs[0]["rows_loaded"] == 4


@pytest.mark.django_db
def test_incremental_sync_resumes_cursor(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Inc Sync"}, format="json"))
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
                "name": "Echo Inc",
                "connector_type": "platform.echo",
                "config": {"message": "inc", "row_count": 5},
            },
            format="json",
        )
    )

    full = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "full"},
            format="json",
        )
    )
    assert full["job"]["result"]["rows_loaded"] == 5
    assert full["sync_run"]["cursor_state"].get("offset") == 5

    # Grow remote source; incremental should only pull new rows
    auth_client.patch(
        f"/api/v1/connections/{conn['id']}/",
        {"config": {"message": "inc", "row_count": 8}},
        format="json",
    )
    inc = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "incremental", "batch_size": 10},
            format="json",
        )
    )
    assert inc["job"]["result"]["rows_loaded"] == 3
    assert inc["sync_run"]["cursor_state"].get("offset") == 8
    assert SyncRun.objects.filter(connection_id=conn["id"]).count() == 2

    connection = Connection.objects.get(id=conn["id"])
    assert connection.target_dataset_id is not None
    dataset = Dataset.objects.get(id=connection.target_dataset_id)
    # Dataset reflects latest sync load (incremental batch size), not cumulative
    assert dataset.row_count == 3


@pytest.mark.django_db
def test_sync_unknown_connector_fails(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Bad Sync"}, format="json"))
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
                "name": "Missing Plugin",
                "connector_type": "snowflake",
                "config": {"account": "missing"},
            },
            format="json",
        )
    )
    synced = auth_client.post(
        f"/api/v1/connections/{conn['id']}/sync/",
        {"mode": "full"},
        format="json",
    )
    # Eager mode: job fails and may surface as 202 with failed job or 500 depending on propagate
    assert synced.status_code in {
        status.HTTP_202_ACCEPTED,
        status.HTTP_400_BAD_REQUEST,
        status.HTTP_500_INTERNAL_SERVER_ERROR,
    }
    if synced.status_code == status.HTTP_202_ACCEPTED:
        body = api_data(synced)
        assert body["job"]["status"] == Job.Status.FAILED
