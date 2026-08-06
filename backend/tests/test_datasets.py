from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.datasets.infrastructure.models import Dataset
from tests.conftest import api_data


@pytest.mark.django_db
def test_create_dataset_metadata(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Data Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )

    response = auth_client.post(
        "/api/v1/datasets/",
        {
            "organization_id": org["id"],
            "workspace_id": ws["id"],
            "name": "Sales 2024",
            "description": "Metadata only",
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = response.json()
    assert body["success"] is True
    assert Dataset.objects.filter(name="Sales 2024", organization_id=org["id"]).exists()


@pytest.mark.django_db
def test_upload_bind_profile_statistics_pipeline(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Pipe Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )

    csv_bytes = b"revenue,region\n100,West\n200,East\n150,West\n"
    upload = auth_client.post(
        "/api/v1/storage/objects/",
        {
            "organization_id": str(org["id"]),
            "workspace_id": str(ws["id"]),
            "file": SimpleUploadedFile("sales.csv", csv_bytes, content_type="text/csv"),
        },
        format="multipart",
    )
    assert upload.status_code == status.HTTP_201_CREATED
    storage = api_data(upload)

    created = auth_client.post(
        "/api/v1/datasets/",
        {
            "organization_id": org["id"],
            "workspace_id": ws["id"],
            "name": "Sales CSV",
            "storage_object_id": storage["id"],
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    dataset = api_data(created)
    assert dataset["storage_object_id"] == storage["id"]

    profile = auth_client.post(f"/api/v1/datasets/{dataset['id']}/profile/")
    assert profile.status_code == status.HTTP_202_ACCEPTED
    profiled = api_data(profile)
    assert profiled["profile_status"] == "ready"
    assert profiled["row_count"] == 3

    stats = auth_client.get(f"/api/v1/datasets/{dataset['id']}/statistics/")
    assert stats.status_code == status.HTTP_200_OK
    stats_data = api_data(stats)
    assert stats_data["profile_status"] == "ready"
    assert "revenue" in stats_data["statistics"]["columns"]

    detail = auth_client.get(f"/api/v1/datasets/{dataset['id']}/")
    assert detail.status_code == status.HTTP_200_OK
    assert api_data(detail)["status"] == "ready"
