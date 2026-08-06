"""Track 11.4 — schema discovery engine."""
from __future__ import annotations

import pytest
from rest_framework import status

from apps.integrations.infrastructure.models import SchemaSnapshot
from apps.jobs.infrastructure.models import Job
from tests.conftest import api_data


@pytest.mark.django_db
def test_discover_creates_versioned_snapshot_idempotent(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Schema Co"}, format="json"))
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
                "name": "Echo Schema",
                "connector_type": "platform.echo",
                "config": {"message": "schema", "row_count": 3},
            },
            format="json",
        )
    )
    assert conn["schema_version"] == 0

    discovered = auth_client.post(f"/api/v1/connections/{conn['id']}/discover/", {}, format="json")
    assert discovered.status_code == status.HTTP_202_ACCEPTED
    body = api_data(discovered)
    assert body["job"]["job_type"] == "connector.discover"
    assert body["job"]["status"] == Job.Status.SUCCEEDED
    assert body["job"]["result"]["ok"] is True
    assert body["job"]["result"]["changed"] is True
    assert body["connection"]["schema_version"] == 1
    assert body["schema"]["version"] == 1
    assert body["schema"]["tables"][0]["name"] == "echo_items"
    assert len(body["schema"]["tables"][0]["columns"]) == 3

    schema = api_data(auth_client.get(f"/api/v1/connections/{conn['id']}/schema/"))
    assert schema["version"] == 1
    assert schema["fingerprint"]
    assert SchemaSnapshot.objects.filter(connection_id=conn["id"]).count() == 1

    # Second discover with same remote schema — idempotent (no version bump)
    again = api_data(
        auth_client.post(f"/api/v1/connections/{conn['id']}/discover/", {}, format="json")
    )
    assert again["job"]["result"]["changed"] is False
    assert again["connection"]["schema_version"] == 1
    assert SchemaSnapshot.objects.filter(connection_id=conn["id"]).count() == 1

    # Config change that alters discovered schema → new version
    auth_client.patch(
        f"/api/v1/connections/{conn['id']}/",
        {"config": {"message": "schema", "row_count": 9}},
        format="json",
    )
    bumped = api_data(
        auth_client.post(f"/api/v1/connections/{conn['id']}/discover/", {}, format="json")
    )
    assert bumped["job"]["result"]["changed"] is True
    assert bumped["connection"]["schema_version"] == 2
    assert SchemaSnapshot.objects.filter(connection_id=conn["id"]).count() == 2

    v1 = api_data(auth_client.get(f"/api/v1/connections/{conn['id']}/schema/?version=1"))
    assert v1["version"] == 1
    assert v1["tables"][0]["row_estimate"] == 3

    v2 = api_data(auth_client.get(f"/api/v1/connections/{conn['id']}/schema/?version=2"))
    assert v2["version"] == 2
    assert v2["tables"][0]["row_estimate"] == 9


@pytest.mark.django_db
def test_schema_missing_before_discover(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Empty Schema"}, format="json"))
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
                "name": "No Schema Yet",
                "connector_type": "platform.echo",
                "config": {},
            },
            format="json",
        )
    )
    missing = auth_client.get(f"/api/v1/connections/{conn['id']}/schema/")
    assert missing.status_code == status.HTTP_404_NOT_FOUND
