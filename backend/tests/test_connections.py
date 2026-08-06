"""Track 11.3 — connection registry + connector.test job."""
from __future__ import annotations

import pytest
from rest_framework import status

from apps.integrations.infrastructure.models import Connection
from apps.jobs.infrastructure.models import Job
from tests.conftest import api_data


@pytest.mark.django_db
def test_connection_crud_and_echo_test_job(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Conn Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )

    created = auth_client.post(
        "/api/v1/connections/",
        {
            "organization_id": org["id"],
            "workspace_id": ws["id"],
            "name": "Echo Link",
            "connector_type": "platform.echo",
            "config": {"message": "ping", "row_count": 2},
            "sync_schedule": "manual",
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    conn = api_data(created)
    assert conn["connector_type"] == "platform.echo"
    assert conn["health_status"] == "unknown"
    assert "secrets" not in created.content.decode()

    listed = auth_client.get(
        f"/api/v1/connections/?organization_id={org['id']}&workspace_id={ws['id']}"
    )
    assert listed.status_code == status.HTTP_200_OK
    assert len(api_data(listed)) == 1

    tested = auth_client.post(f"/api/v1/connections/{conn['id']}/test/", {}, format="json")
    assert tested.status_code == status.HTTP_202_ACCEPTED
    body = api_data(tested)
    assert body["job"]["job_type"] == "connector.test"
    assert body["job"]["status"] == Job.Status.SUCCEEDED
    assert body["job"]["result"]["ok"] is True
    assert body["connection"]["health_status"] == Connection.HealthStatus.HEALTHY

    refreshed = api_data(auth_client.get(f"/api/v1/connections/{conn['id']}/"))
    assert refreshed["health_status"] == "healthy"
    assert refreshed["last_tested_at"] is not None

    catalog = auth_client.get("/api/v1/connectors/")
    assert catalog.status_code == status.HTTP_200_OK
    types = api_data(catalog)
    assert any(t["connector_type"] == "platform.echo" for t in types)

    draft = auth_client.post(
        "/api/v1/connectors/test/",
        {
            "organization_id": org["id"],
            "connector_type": "platform.echo",
            "config": {"message": "draft"},
            "credentials": {},
        },
        format="json",
    )
    assert draft.status_code == status.HTTP_200_OK
    assert api_data(draft)["ok"] is True

    missing = auth_client.post(
        "/api/v1/connectors/test/",
        {
            "organization_id": org["id"],
            "connector_type": "snowflake",
            "config": {"account": "missing"},
        },
        format="json",
    )
    assert missing.status_code == status.HTTP_200_OK
    assert api_data(missing)["ok"] is False

    deleted = auth_client.delete(f"/api/v1/connections/{conn['id']}/")
    assert deleted.status_code == status.HTTP_204_NO_CONTENT
    assert not Connection.objects.filter(id=conn["id"]).exists()


@pytest.mark.django_db
def test_connection_with_secrets_and_tenant_isolation(auth_client, auth_client_b):
    org_a = api_data(auth_client.post("/api/v1/organizations/", {"name": "A"}, format="json"))
    ws_a = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org_a["id"], "name": "Main"},
            format="json",
        )
    )
    org_b = api_data(auth_client_b.post("/api/v1/organizations/", {"name": "B"}, format="json"))

    created = auth_client.post(
        "/api/v1/connections/",
        {
            "organization_id": org_a["id"],
            "workspace_id": ws_a["id"],
            "name": "Secret Echo",
            "connector_type": "platform.echo",
            "config": {"message": "secured"},
            "secrets": {"token": "super-secret-token"},
            "auth_method": "token",
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    conn = api_data(created)
    assert conn["credential_id"] is not None
    assert "super-secret-token" not in created.content.decode()

    hijack = auth_client_b.get(f"/api/v1/connections/{conn['id']}/")
    assert hijack.status_code == status.HTTP_403_FORBIDDEN

    list_hijack = auth_client_b.get(f"/api/v1/connections/?organization_id={org_a['id']}")
    assert list_hijack.status_code == status.HTTP_403_FORBIDDEN
    _ = org_b
