"""Track 12 Wave 3 — AI Platform and Query & Compute."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.ai_platform.infrastructure.models import AIObservabilityEvent, EmbeddingRecord
from apps.query_compute.infrastructure.models import QueryExecution, QueryPlan
from tests.conftest import api_data


def _full_pipeline(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Wave3 Co"}, format="json"))
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
                    "sales.csv",
                    b"name,email,amount\nAlice,alice@example.com,100\nBob,bob@example.com,200\n",
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
                "name": "Wave3 Data",
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
    return org, ws, dataset, job


@pytest.mark.django_db
def test_ai_platform_reason_over_verified(auth_client):
    org, ws, dataset, _ = _full_pipeline(auth_client)

    resp = auth_client.post(
        f"/api/v1/ai-platform/datasets/{dataset['id']}/reason/",
        {"operation": "narrative", "question": "Summarize this dataset"},
        format="json",
    )
    assert resp.status_code == status.HTTP_202_ACCEPTED
    job = api_data(resp)["job"]
    assert job["status"] == "succeeded"
    assert job["result"].get("guardrails", {}).get("passed") is True
    assert AIObservabilityEvent.objects.filter(dataset_id=dataset["id"]).exists()


@pytest.mark.django_db
def test_ai_platform_embed_and_rag(auth_client):
    _, _, dataset, _ = _full_pipeline(auth_client)

    embed = auth_client.post(f"/api/v1/ai-platform/datasets/{dataset['id']}/embed/", format="json")
    assert embed.status_code == status.HTTP_202_ACCEPTED
    embed_job = api_data(embed)["job"]
    assert embed_job["status"] == "succeeded"
    assert EmbeddingRecord.objects.filter(dataset_id=dataset["id"]).exists()

    rag = auth_client.post(
        f"/api/v1/ai-platform/datasets/{dataset['id']}/rag/",
        {"query": "What is the total amount?"},
        format="json",
    )
    assert rag.status_code == status.HTTP_202_ACCEPTED
    rag_job = api_data(rag)["job"]
    assert rag_job["status"] == "succeeded"
    assert rag_job["result"].get("retrieved_chunks")


@pytest.mark.django_db
def test_query_compute_generate_and_execute(auth_client):
    org, _, dataset, _ = _full_pipeline(auth_client)

    plan_resp = auth_client.post(
        f"/api/v1/query-compute/datasets/{dataset['id']}/generate-sql/",
        {"natural_language": "count all rows"},
        format="json",
    )
    assert plan_resp.status_code == status.HTTP_201_CREATED
    plan = api_data(plan_resp)
    assert "COUNT" in plan["generated_sql"].upper()
    assert QueryPlan.objects.filter(dataset_id=dataset["id"]).exists()

    exec_resp = auth_client.post(
        f"/api/v1/query-compute/datasets/{dataset['id']}/execute/",
        {"sql": plan["optimized_sql"]},
        format="json",
    )
    assert exec_resp.status_code == status.HTTP_202_ACCEPTED
    body = api_data(exec_resp)
    assert body["job"]["status"] == "succeeded"
    result = body["job"]["result"]
    assert result["row_count"] >= 1
    if result.get("preview"):
        assert result["preview"][0].get("row_count") == 2
    assert QueryExecution.objects.filter(dataset_id=dataset["id"]).exists()

    pools = api_data(
        auth_client.get(f"/api/v1/query-compute/worker-pools/?organization_id={org['id']}")
    )
    assert len(pools) >= 1


@pytest.mark.django_db
def test_full_pipeline_includes_wave3(auth_client):
    _, _, dataset, job = _full_pipeline(auth_client)
    assert job["result"].get("ai_reasoning")
    assert job["result"].get("query_compute")
    qc = job["result"]["query_compute"]
    if qc.get("preview") and "row_count" in (qc["preview"][0] or {}):
        assert qc["preview"][0]["row_count"] == 2
    else:
        assert qc.get("row_count", 0) >= 1
