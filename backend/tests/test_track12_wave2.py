"""Track 12 Wave 2 — Business Rules, Analytics, Enterprise Intelligence."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.analytics.infrastructure.models import AnalyticsResult
from apps.business_rules.infrastructure.models import KPIResult
from apps.intelligence.infrastructure.models import ContextBundle, Recommendation
from tests.conftest import api_data


def _org_ws(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Wave2 Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    return org, ws


def _dataset_with_pipeline(auth_client, org, ws, csv: str):
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile("data.csv", csv.encode(), content_type="text/csv"),
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
                "name": "Wave2 Data",
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
    return dataset, job


@pytest.mark.django_db
def test_wave2_business_rules_evaluate(auth_client):
    org, ws = _org_ws(auth_client)
    csv = "name,email,amount\nAlice,alice@example.com,100\nBob,bob@example.com,200\n"
    dataset, _ = _dataset_with_pipeline(auth_client, org, ws, csv)

    kpi = api_data(
        auth_client.post(
            "/api/v1/business-rules/kpis/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "dataset_id": dataset["id"],
                "name": "Total Amount",
                "column_name": "amount",
                "aggregation": "sum",
                "target_value": 250,
            },
            format="json",
        )
    )
    assert kpi["name"] == "Total Amount"

    resp = auth_client.post(
        f"/api/v1/business-rules/datasets/{dataset['id']}/evaluate/", format="json"
    )
    assert resp.status_code == status.HTTP_202_ACCEPTED
    job = api_data(resp)["job"]
    assert job["status"] == "succeeded"
    assert job["result"]["kpis"]
    assert KPIResult.objects.filter(dataset_id=dataset["id"]).exists()


@pytest.mark.django_db
def test_wave2_analytics_compute(auth_client):
    org, ws = _org_ws(auth_client)
    csv = "date,amount\n2024-01-01,100\n2024-01-02,150\n2024-01-03,120\n"
    dataset, _ = _dataset_with_pipeline(auth_client, org, ws, csv)

    resp = auth_client.post(
        f"/api/v1/analytics/datasets/{dataset['id']}/compute/",
        {"operation": "forecast", "parameters": {"horizon": 3}},
        format="json",
    )
    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = api_data(resp)
    assert body["job"]["status"] == "succeeded"
    assert body["job"]["result"]["result"]["forecast"]

    stats = api_data(
        auth_client.get(f"/api/v1/analytics/datasets/{dataset['id']}/results/?operation=statistics")
    )
    assert stats["operation"] == "statistics"
    assert AnalyticsResult.objects.filter(dataset_id=dataset["id"]).exists()


@pytest.mark.django_db
def test_wave2_intelligence_enrich(auth_client):
    org, ws = _org_ws(auth_client)
    csv = "region,product,revenue\nNorth,A,100\nSouth,B,200\n"
    dataset, pipeline_job = _dataset_with_pipeline(auth_client, org, ws, csv)

    # Pipeline already runs intelligence enrich; verify artifacts
    assert pipeline_job["result"].get("intelligence")
    assert ContextBundle.objects.filter(dataset_id=dataset["id"]).exists()

    context = api_data(
        auth_client.get(f"/api/v1/intelligence/datasets/{dataset['id']}/context/")
    )
    assert context["bundle"]["row_count"] >= 2

    graph = api_data(auth_client.get(f"/api/v1/intelligence/datasets/{dataset['id']}/graph/"))
    assert len(graph["nodes"]) >= 3

    recs = api_data(
        auth_client.get(f"/api/v1/intelligence/datasets/{dataset['id']}/recommendations/")
    )
    assert len(recs) >= 1
    assert Recommendation.objects.filter(dataset_id=dataset["id"]).exists()

    glossary = api_data(
        auth_client.get(f"/api/v1/intelligence/glossary/?organization_id={org['id']}")
    )
    assert len(glossary) >= 1


@pytest.mark.django_db
def test_wave2_semantic_model(auth_client):
    org, ws = _org_ws(auth_client)
    csv = "amount,units\n10,2\n20,4\n"
    dataset, _ = _dataset_with_pipeline(auth_client, org, ws, csv)

    model = api_data(
        auth_client.post(
            "/api/v1/intelligence/semantic-models/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "dataset_id": dataset["id"],
                "name": "Sales Semantic",
            },
            format="json",
        )
    )
    assert model["name"] == "Sales Semantic"

    models = api_data(
        auth_client.get(
            f"/api/v1/intelligence/semantic-models/?organization_id={org['id']}&dataset_id={dataset['id']}"
        )
    )
    assert any(m["id"] == model["id"] for m in models)
