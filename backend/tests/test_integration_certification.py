"""Track 9.2 — End-to-end integration certification."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.conftest import api_data


@pytest.fixture
def pipeline_tenant(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "E2E Org"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "E2E WS"},
            format="json",
        )
    )
    csv_bytes = b"revenue,region\n10,West\n20,East\n30,West\n"
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile("e2e.csv", csv_bytes, content_type="text/csv"),
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
                "name": "E2E Dataset",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    profile = auth_client.post(f"/api/v1/datasets/{dataset['id']}/profile/")
    assert profile.status_code == status.HTTP_202_ACCEPTED
    return {"org": org, "workspace": ws, "dataset": api_data(profile)}


@pytest.mark.django_db
def test_e2e_upload_to_statistics(pipeline_tenant, auth_client):
    ds = pipeline_tenant["dataset"]
    stats = auth_client.get(f"/api/v1/datasets/{ds['id']}/statistics/")
    assert stats.status_code == status.HTTP_200_OK
    body = api_data(stats)
    assert body["profile_status"] == "ready"
    assert "revenue" in body["statistics"]["columns"]


@pytest.mark.django_db
def test_e2e_ai_to_export(pipeline_tenant, auth_client):
    org = pipeline_tenant["org"]
    ds = pipeline_tenant["dataset"]
    chat = auth_client.post(
        "/api/v1/ai/chat/",
        {"organization_id": org["id"], "dataset_id": ds["id"], "question": "Trend?"},
        format="json",
    )
    assert chat.status_code == status.HTTP_200_OK
    assert api_data(chat)["metadata"]["schema_version"] == "ai@v1"

    export = auth_client.get(f"/api/v1/datasets/{ds['id']}/export/")
    assert export.status_code == status.HTTP_200_OK
    assert api_data(export)["dataset_id"] == ds["id"]


@pytest.mark.django_db
def test_e2e_job_pipeline(pipeline_tenant, auth_client):
    org = pipeline_tenant["org"]
    ws = pipeline_tenant["workspace"]
    ds = pipeline_tenant["dataset"]
    job = auth_client.post(
        "/api/v1/jobs/",
        {
            "organization_id": org["id"],
            "workspace_id": ws["id"],
            "job_type": "dataset.pipeline",
            "payload": {"dataset_id": ds["id"], "horizon": 3},
            "timeout_seconds": 300,
        },
        format="json",
    )
    assert job.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
    data = api_data(job)
    assert data["status"] == "succeeded"
    assert data["result"]["outputs"]["forecast"]
