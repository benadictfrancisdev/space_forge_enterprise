"""Track 9.4 — Database certification."""
from __future__ import annotations

import pytest
from rest_framework import status

from tests.conftest import api_data


@pytest.mark.django_db
def test_database_pagination_bulk(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "DB Cert"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "DB WS"},
            format="json",
        )
    )
    for i in range(6):
        auth_client.post(
            "/api/v1/datasets/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": f"Bulk {i}",
            },
            format="json",
        )

    page1 = auth_client.get(f"/api/v1/datasets/?organization_id={org['id']}&page=1&page_size=3")
    assert page1.status_code == status.HTTP_200_OK
    body = page1.json()
    assert body["success"] is True
    assert len(body["data"]) == 3
    assert body["meta"]["count"] >= 6
    assert "schema" not in body["data"][0]


@pytest.mark.django_db
def test_database_audit_pagination(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Audit DB"}, format="json"))
    auth_client.post(
        "/api/v1/datasets/",
        {"organization_id": org["id"], "workspace_id": api_data(
            auth_client.post(
                "/api/v1/workspaces/",
                {"organization_id": org["id"], "name": "A"},
                format="json",
            )
        )["id"], "name": "Trigger audit"},
        format="json",
    )
    resp = auth_client.get(f"/api/v1/audit/?organization_id={org['id']}&page=1&page_size=5")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.json()["meta"]["count"] >= 1
