"""Track 9.8 — Reliability certification."""
from __future__ import annotations

import pytest
from rest_framework import status

from tests.conftest import api_data


@pytest.mark.django_db
def test_reliability_invalid_dataset_create(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Rel"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "R"},
            format="json",
        )
    )
    resp = auth_client.post(
        "/api/v1/datasets/",
        {"organization_id": org["id"], "workspace_id": ws["id"]},
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_reliability_missing_dataset(auth_client):
    resp = auth_client.get("/api/v1/datasets/00000000-0000-0000-0000-000000000099/")
    assert resp.status_code == status.HTTP_404_NOT_FOUND


@pytest.mark.django_db
def test_reliability_invalid_ai_operation(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Rel2"}, format="json"))
    resp = auth_client.post(
        "/api/v1/ai/not-valid/",
        {"organization_id": org["id"]},
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_reliability_unauthenticated(api_client):
    resp = api_client.get("/api/v1/organizations/")
    assert resp.status_code == status.HTTP_401_UNAUTHORIZED
