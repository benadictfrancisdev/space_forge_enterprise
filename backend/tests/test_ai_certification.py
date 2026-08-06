"""Track 9.3 — AI platform certification (strict envelope)."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.conftest import api_data

OPS = ["chat", "forecast", "scientist", "hypothesis", "nlp", "narrative", "anomaly", "decisions"]


@pytest.fixture
def ai_dataset(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "AI Cert"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "AI WS"},
            format="json",
        )
    )
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile("ai.csv", b"a,b\n1,2\n3,4\n", content_type="text/csv"),
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
                "name": "AI Cert DS",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    auth_client.post(f"/api/v1/datasets/{dataset['id']}/profile/")
    dataset = api_data(auth_client.get(f"/api/v1/datasets/{dataset['id']}/"))
    return {"org": org, "dataset": dataset}


def _strict_envelope(resp) -> None:
    body = resp.json()
    assert body["success"] is True
    data = body["data"]
    assert isinstance(data["result"], dict)
    assert data["result"].get("summary") or data["result"].get("details")
    assert data["metadata"]["schema_version"] == "ai@v1"
    assert data["evaluation"]["provider"]
    assert isinstance(data["evaluation"]["confidence"], (int, float))


@pytest.mark.django_db
@pytest.mark.parametrize("operation", OPS)
def test_ai_strict_envelope(ai_dataset, auth_client, operation):
    org = ai_dataset["org"]
    ds = ai_dataset["dataset"]
    resp = auth_client.post(
        f"/api/v1/ai/{operation}/",
        {
            "organization_id": org["id"],
            "dataset_id": ds["id"],
            "question": "cert",
            "hypothesis": "test",
            "horizon": 3,
        },
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK
    _strict_envelope(resp)


@pytest.mark.django_db
def test_hypothesis_result_not_string(ai_dataset, auth_client):
    """Regression: raw_content must not overwrite envelope result (Track 9.3)."""
    org = ai_dataset["org"]
    ds = ai_dataset["dataset"]
    resp = auth_client.post(
        "/api/v1/ai/hypothesis/",
        {"organization_id": org["id"], "dataset_id": ds["id"], "hypothesis": "a != b"},
        format="json",
    )
    data = api_data(resp)
    assert isinstance(data["result"], dict)
