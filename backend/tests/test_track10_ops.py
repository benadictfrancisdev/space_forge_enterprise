"""Track 10 — Observability & operations certification."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.core import metrics
from tests.conftest import api_data


@pytest.mark.django_db
def test_metrics_endpoint(api_client):
    metrics.incr("test_counter_total", suite="track10")
    response = api_client.get("/metrics")
    assert response.status_code == status.HTTP_200_OK
    assert "text/plain" in response["Content-Type"]
    assert "http_requests_total" in response.content.decode() or "test_counter_total" in response.content.decode()


@pytest.mark.django_db
def test_ops_platform_health_public(api_client):
    response = api_client.get("/api/v1/ops/platform-health/")
    assert response.status_code == status.HTTP_200_OK
    data = api_data(response)
    assert data["readiness"]["checks"]["database"]["ok"] is True
    assert data["ai"]["status"] == "ok"


@pytest.mark.django_db
def test_ops_summary_requires_org(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Ops Org"}, format="json"))
    response = auth_client.get(f"/api/v1/ops/summary/?organization_id={org['id']}")
    assert response.status_code == status.HTTP_200_OK
    data = api_data(response)
    assert data["organization_id"] == str(org["id"])
    assert "jobs" in data
    assert "ai" in data
    assert "alerts" in data


@pytest.mark.django_db
def test_ops_jobs_and_ai_summary(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Ops Jobs"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Ops WS"},
            format="json",
        )
    )
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile("ops.csv", b"a,b\n1,2\n3,4\n", content_type="text/csv"),
            },
            format="multipart",
        )
    )
    dataset = api_data(
        auth_client.post(
            "/api/v1/datasets/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": "Ops DS",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    auth_client.post(f"/api/v1/datasets/{dataset['id']}/profile/")
    auth_client.post(
        "/api/v1/ai/chat/",
        {
            "organization_id": org["id"],
            "dataset_id": dataset["id"],
            "question": "ops test",
        },
        format="json",
    )

    jobs = api_data(auth_client.get(f"/api/v1/ops/jobs/summary/?organization_id={org['id']}"))
    assert jobs["total"] >= 0
    assert "success_rate_pct" in jobs

    ai = api_data(auth_client.get(f"/api/v1/ops/ai/summary/?organization_id={org['id']}"))
    assert ai["invocations"] >= 1
    assert "chat" in ai["by_operation"]

    alerts = api_data(auth_client.get(f"/api/v1/ops/alerts/?organization_id={org['id']}"))
    assert isinstance(alerts["alerts"], list)
