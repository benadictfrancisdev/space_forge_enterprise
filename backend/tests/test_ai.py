from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.conftest import api_data


@pytest.mark.django_db
def test_ai_health_public(api_client):
    response = api_client.get("/api/v1/ai/health/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["status"] == "ok"
    assert "chat" in data["operations"]


@pytest.mark.django_db
def test_ai_chat_with_profiled_dataset(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "AI Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    csv_bytes = b"revenue,region\n100,West\n200,East\n"
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile("a.csv", csv_bytes, content_type="text/csv"),
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
                "name": "AI CSV",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    profile = auth_client.post(f"/api/v1/datasets/{dataset['id']}/profile/")
    assert profile.status_code == status.HTTP_202_ACCEPTED

    chat = auth_client.post(
        "/api/v1/ai/chat/",
        {
            "organization_id": org["id"],
            "dataset_id": dataset["id"],
            "question": "What stands out in revenue?",
        },
        format="json",
    )
    assert chat.status_code == status.HTTP_200_OK
    body = chat.json()
    assert body["success"] is True
    assert body["data"]["operation"] == "chat"
    result = body["data"]["result"]
    assert result.get("summary") or result.get("details", {}).get("answer")
    assert body["data"].get("answer") or result.get("details", {}).get("answer")
    assert body["data"]["metadata"]["prompt_version"] == "chat@v1"
    evaluation = body["data"]["evaluation"]
    assert evaluation["provider"] == "heuristic"
    assert evaluation["model"] == "spaceforge-heuristic-v1"
    assert "latency_ms" in evaluation
    assert "tokens" in evaluation
    assert "confidence" in evaluation
    assert "cost_usd" in evaluation


@pytest.mark.django_db
def test_ai_forecast_and_decisions(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "AI2"}, format="json"))
    forecast = auth_client.post(
        "/api/v1/ai/forecast/",
        {"organization_id": org["id"], "horizon": 3},
        format="json",
    )
    assert forecast.status_code == status.HTTP_200_OK
    forecast_data = api_data(forecast)
    forecast_points = (
        forecast_data.get("forecast")
        or forecast_data["result"]["details"]["forecast"]
    )
    assert len(forecast_points) == 3

    decisions = auth_client.post(
        "/api/v1/ai/decisions/",
        {"organization_id": org["id"]},
        format="json",
    )
    assert decisions.status_code == status.HTTP_200_OK
    decisions_data = api_data(decisions)
    assert (
        decisions_data.get("decisions")
        or decisions_data["result"]["details"]["decisions"]
        or decisions_data["result"]["recommendations"]
    )
