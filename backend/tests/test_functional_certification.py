"""Track 9.1 — Functional certification (API-backed modules)."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.conftest import api_data

# Mirrors scripts/lib/track9-functional-matrix.mjs AI operations
AI_OPS = [
    "chat",
    "forecast",
    "scientist",
    "hypothesis",
    "nlp",
    "narrative",
    "anomaly",
    "decisions",
]

IBI_MODULES = [
    "churn",
    "inventory",
    "revenue_drop",
    "segmentation",
    "sales_performance",
]


@pytest.fixture
def cert_tenant(auth_client):
    """Org + workspace + profiled dataset for functional cert."""
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Cert Org"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Cert WS"},
            format="json",
        )
    )
    csv_bytes = b"revenue,region,units\n100,West,10\n200,East,20\n150,West,15\n"
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile("cert.csv", csv_bytes, content_type="text/csv"),
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
                "name": "Cert Dataset",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    profile = auth_client.post(f"/api/v1/datasets/{dataset['id']}/profile/")
    assert profile.status_code == status.HTTP_202_ACCEPTED
    profiled = api_data(profile)
    assert profiled["profile_status"] == "ready"
    return {"org": org, "workspace": ws, "dataset": profiled}


def _assert_ai_envelope(body: dict) -> None:
    assert body["success"] is True
    data = body["data"]
    assert data.get("operation")
    assert data.get("evaluation", {}).get("provider")
    meta = data.get("metadata") or {}
    assert meta.get("schema_version") == "ai@v1" or meta.get("prompt_version")

    result = data.get("result")
    if isinstance(result, dict):
        assert result.get("summary") or result.get("details")
    else:
        # Legacy: some ops may expose flat/string result until schema fully unified
        assert (
            data.get("summary")
            or data.get("answer")
            or isinstance(result, str)
            or data.get("headline")
        )


@pytest.mark.django_db
def test_functional_upload_pipeline(cert_tenant):
    ds = cert_tenant["dataset"]
    assert ds["row_count"] == 3
    assert ds["storage_object_id"]


@pytest.mark.django_db
def test_functional_statistics_endpoint(cert_tenant, auth_client):
    ds = cert_tenant["dataset"]
    resp = auth_client.get(f"/api/v1/datasets/{ds['id']}/statistics/")
    assert resp.status_code == status.HTTP_200_OK
    body = resp.json()
    assert body["success"] is True
    assert body["data"]["profile_status"] == "ready"
    assert "revenue" in body["data"]["statistics"]["columns"]


@pytest.mark.django_db
def test_functional_export_manifest(cert_tenant, auth_client):
    ds = cert_tenant["dataset"]
    resp = auth_client.get(f"/api/v1/datasets/{ds['id']}/export/")
    assert resp.status_code == status.HTTP_200_OK
    assert api_data(resp)["dataset_id"] == ds["id"]


@pytest.mark.django_db
def test_functional_system_status(auth_client):
    health = auth_client.get("/health/")
    assert health.status_code == status.HTTP_200_OK
    ai = auth_client.get("/api/v1/ai/health/")
    assert ai.status_code == status.HTTP_200_OK
    data = api_data(ai)
    assert data["status"] == "ok"
    assert "chat" in data["operations"]


@pytest.mark.django_db
@pytest.mark.parametrize("operation", AI_OPS)
def test_functional_ai_operations(cert_tenant, auth_client, operation):
    org = cert_tenant["org"]
    ds = cert_tenant["dataset"]
    payload = {
        "organization_id": org["id"],
        "dataset_id": ds["id"],
        "question": "What is the revenue trend?",
        "message": "Summarize",
        "query": "top region",
        "hypothesis": "Regions differ",
        "horizon": 5,
    }
    resp = auth_client.post(f"/api/v1/ai/{operation}/", payload, format="json")
    assert resp.status_code == status.HTTP_200_OK
    _assert_ai_envelope(resp.json())


@pytest.mark.django_db
@pytest.mark.parametrize("module", IBI_MODULES)
def test_functional_indian_intel_modules(cert_tenant, auth_client, module):
    org = cert_tenant["org"]
    ds = cert_tenant["dataset"]
    resp = auth_client.post(
        "/api/v1/ai/indian-intel/",
        {
            "organization_id": org["id"],
            "dataset_id": ds["id"],
            "module": module,
        },
        format="json",
    )
    assert resp.status_code == status.HTTP_200_OK
    _assert_ai_envelope(resp.json())
