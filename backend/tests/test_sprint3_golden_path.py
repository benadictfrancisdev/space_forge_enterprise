"""Sprint 3 — Golden path: upload → pipeline → executive → decision → report."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from tests.conftest import api_data


def _golden_tenant(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "S3 Golden"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile(
                    "golden.csv",
                    b"stage,amount,revenue\nLead,100,1000\nSales,200,2000\nPayment,150,1800\n",
                    content_type="text/csv",
                ),
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
                "name": "Golden Dataset",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    pipeline = auth_client.post(
        f"/api/v1/data-platform/datasets/{dataset['id']}/pipeline/", format="json"
    )
    assert pipeline.status_code == status.HTTP_202_ACCEPTED
    job = api_data(pipeline)["job"]
    assert job["status"] == "succeeded"
    return org, ws, dataset


@pytest.mark.django_db
def test_sprint3_golden_path(auth_client):
    _, _, dataset = _golden_tenant(auth_client)
    ds_id = dataset["id"]

    bundle = api_data(
        auth_client.get(f"/api/v1/applications/executive/bundle/?dataset_id={ds_id}")
    )
    assert bundle.get("dataset_id") == ds_id
    assert "kpis" in bundle

    decision = api_data(
        auth_client.post(
            "/api/v1/applications/decisions/",
            {"dataset_id": ds_id, "problem": "Why did revenue change?"},
            format="json",
        )
    )
    assert decision.get("decision_support")
    assert decision.get("reasoning_chain")

    report = api_data(
        auth_client.post(
            "/api/v1/applications/reporting/generate/",
            {"dataset_id": ds_id, "report_type": "executive"},
            format="json",
        )
    )
    assert report.get("markdown")
    assert report.get("html")
