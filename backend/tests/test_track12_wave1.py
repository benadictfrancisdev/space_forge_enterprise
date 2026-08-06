"""Track 12 Wave 1 — Enterprise Data Platform, Metadata, Quality."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.data_platform.infrastructure.models import CatalogEntry, LayerArtifact, PipelineLayer
from apps.metadata.infrastructure.models import ColumnMetadata, SchemaRegistryEntry
from apps.quality.infrastructure.models import QualityReport, QualityRun
from tests.conftest import api_data


def _org_and_workspace(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Track12 Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    return org, ws


def _upload_csv(auth_client, org, ws, name: str, content: str):
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile(name, content.encode("utf-8"), content_type="text/csv"),
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
                "name": "Sales Data",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    return dataset, storage


@pytest.mark.django_db
def test_data_platform_pipeline_landing_to_gold(auth_client):
    org, ws = _org_and_workspace(auth_client)
    csv = "name,email,amount\nAlice,alice@example.com,100\nBob,bob@example.com,200\n"
    dataset, _ = _upload_csv(auth_client, org, ws, "sales.csv", csv)

    resp = auth_client.post(f"/api/v1/data-platform/datasets/{dataset['id']}/pipeline/", format="json")
    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = api_data(resp)
    assert body["job"]["job_type"] == "data_platform.pipeline"
    assert body["job"]["status"] == "succeeded"
    assert body["job"]["result"]["ok"] is True
    assert "gold" in body["job"]["result"]["layers_completed"]

    layers = api_data(auth_client.get(f"/api/v1/data-platform/datasets/{dataset['id']}/layers/"))
    layer_names = {item["layer"] for item in layers}
    assert layer_names == {
        PipelineLayer.LANDING,
        PipelineLayer.BRONZE,
        PipelineLayer.SILVER,
        PipelineLayer.GOLD,
    }

    catalog = api_data(auth_client.get(f"/api/v1/data-platform/datasets/{dataset['id']}/catalog/"))
    assert catalog["current_layer"] == PipelineLayer.GOLD
    assert catalog["dataset_id"] == dataset["id"]

    lineage = api_data(auth_client.get(f"/api/v1/data-platform/datasets/{dataset['id']}/lineage/"))
    assert len(lineage) >= 1

    assert LayerArtifact.objects.filter(dataset_id=dataset["id"], layer=PipelineLayer.GOLD).exists()
    assert CatalogEntry.objects.filter(dataset_id=dataset["id"]).exists()


@pytest.mark.django_db
def test_metadata_extract_after_pipeline(auth_client):
    org, ws = _org_and_workspace(auth_client)
    csv = "name,email,amount\nAlice,alice@example.com,100\n"
    dataset, _ = _upload_csv(auth_client, org, ws, "meta.csv", csv)
    auth_client.post(f"/api/v1/data-platform/datasets/{dataset['id']}/pipeline/", format="json")

    cols = api_data(auth_client.get(f"/api/v1/metadata/datasets/{dataset['id']}/columns/"))
    assert len(cols) == 3
    col_names = {c["column_name"] for c in cols}
    assert col_names == {"name", "email", "amount"}
    email_col = next(c for c in cols if c["column_name"] == "email")
    assert email_col["pii_detected"] is True

    registry = api_data(
        auth_client.get(f"/api/v1/metadata/datasets/{dataset['id']}/schema-registry/")
    )
    assert len(registry) >= 1
    assert registry[0]["is_current"] is True

    tag_resp = auth_client.post(
        f"/api/v1/metadata/datasets/{dataset['id']}/tags/",
        {"tag": "finance", "category": "domain"},
        format="json",
    )
    assert tag_resp.status_code == status.HTTP_201_CREATED
    tags = api_data(auth_client.get(f"/api/v1/metadata/datasets/{dataset['id']}/tags/"))
    assert any(t["tag"] == "finance" for t in tags)

    assert ColumnMetadata.objects.filter(dataset_id=dataset["id"]).count() == 3
    assert SchemaRegistryEntry.objects.filter(dataset_id=dataset["id"]).exists()


@pytest.mark.django_db
def test_quality_validate_produces_report(auth_client):
    org, ws = _org_and_workspace(auth_client)
    csv = "name,email,amount\nAlice,alice@example.com,100\nBob,bob@example.com,200\n"
    dataset, _ = _upload_csv(auth_client, org, ws, "quality.csv", csv)
    auth_client.post(f"/api/v1/data-platform/datasets/{dataset['id']}/pipeline/", format="json")

    resp = auth_client.post(f"/api/v1/quality/datasets/{dataset['id']}/validate/", format="json")
    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = api_data(resp)
    assert body["job"]["job_type"] == "quality.validate"
    assert body["job"]["status"] == "succeeded"

    report = api_data(auth_client.get(f"/api/v1/quality/datasets/{dataset['id']}/report/"))
    assert report["overall_score"] > 0
    assert report["validation_results"]["passed"] >= 1
    assert report["duplicate_results"]["total_rows"] == 2
    assert report["pii_results"]["pii_count"] >= 1

    runs = api_data(auth_client.get(f"/api/v1/quality/datasets/{dataset['id']}/runs/"))
    assert len(runs) >= 1
    assert QualityReport.objects.filter(dataset_id=dataset["id"]).exists()
    assert QualityRun.objects.filter(dataset_id=dataset["id"]).exists()


@pytest.mark.django_db
def test_catalog_list(auth_client):
    org, ws = _org_and_workspace(auth_client)
    csv = "a,b\n1,2\n"
    dataset, _ = _upload_csv(auth_client, org, ws, "cat.csv", csv)
    auth_client.post(f"/api/v1/data-platform/datasets/{dataset['id']}/pipeline/", format="json")

    entries = api_data(
        auth_client.get(
            f"/api/v1/data-platform/catalog/?organization_id={org['id']}&workspace_id={ws['id']}"
        )
    )
    assert len(entries) >= 1
    assert entries[0]["display_name"] == "Sales Data"
