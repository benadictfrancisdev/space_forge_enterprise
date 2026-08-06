"""Track 8.3 — pagination and list optimization tests."""
from __future__ import annotations

import pytest
from rest_framework import status

from tests.conftest import api_data


@pytest.mark.django_db
def test_dataset_list_paginated(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Pag Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    for i in range(3):
        auth_client.post(
            "/api/v1/datasets/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": f"Dataset {i}",
            },
            format="json",
        )

    response = auth_client.get(
        f"/api/v1/datasets/?organization_id={org['id']}&page=1&page_size=2"
    )
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["success"] is True
    assert len(body["data"]) == 2
    assert body["meta"]["count"] == 3
    # List serializer omits heavy fields
    assert "schema" not in body["data"][0]
    assert "statistics" not in body["data"][0]


@pytest.mark.django_db
def test_audit_list_paginated(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Audit Co"}, format="json"))
    auth_client.post(
        "/api/v1/datasets/",
        {
            "organization_id": org["id"],
            "workspace_id": api_data(
                auth_client.post(
                    "/api/v1/workspaces/",
                    {"organization_id": org["id"], "name": "W"},
                    format="json",
                )
            )["id"],
            "name": "Audit DS",
        },
        format="json",
    )

    response = auth_client.get(
        f"/api/v1/audit/?organization_id={org['id']}&page=1&page_size=10"
    )
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["success"] is True
    assert isinstance(body["data"], list)
    assert body["meta"]["count"] >= 1
