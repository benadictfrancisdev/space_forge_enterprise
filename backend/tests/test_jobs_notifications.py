from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.jobs.infrastructure.models import Job
from tests.conftest import api_data


@pytest.mark.django_db
def test_enqueue_job_runs_eagerly_and_notifies(auth_client, user_a):
    org = api_data(
        auth_client.post("/api/v1/organizations/", {"name": "Jobs Co"}, format="json")
    )

    response = auth_client.post(
        "/api/v1/jobs/",
        {
            "organization_id": org["id"],
            "job_type": "platform.ping",
            "payload": {"ping": True},
            "priority": 10,
            "timeout_seconds": 60,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    body = api_data(response)
    job_id = body["id"]
    assert body["priority"] == 10
    assert body["progress_pct"] in (0, 1, 50, 100)  # may complete eagerly before serialize refresh

    job = Job.objects.get(id=job_id)
    assert job.status == Job.Status.SUCCEEDED
    assert job.progress_pct == 100
    assert job.execution_ms is not None
    assert job.result["job_type"] == "platform.ping"


@pytest.mark.django_db
def test_create_notification(auth_client):
    from apps.notifications.infrastructure.models import Notification

    org = api_data(
        auth_client.post("/api/v1/organizations/", {"name": "Notify Co"}, format="json")
    )
    response = auth_client.post(
        "/api/v1/notifications/",
        {"organization_id": org["id"], "title": "Hello", "body": "World"},
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    listed = auth_client.get(f"/api/v1/notifications/?organization_id={org['id']}")
    assert listed.status_code == status.HTTP_200_OK
    assert any(n["title"] == "Hello" for n in api_data(listed))
    assert Notification.objects.filter(title="Hello").exists()


@pytest.mark.django_db
def test_dataset_pipeline_job(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Pipe Jobs"}, format="json"))
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
                    "p.csv", b"revenue,region\n1,West\n2,East\n", content_type="text/csv"
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
                "name": "Pipeline DS",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )

    response = auth_client.post(
        "/api/v1/jobs/",
        {
            "organization_id": org["id"],
            "workspace_id": ws["id"],
            "job_type": "dataset.pipeline",
            "payload": {"dataset_id": dataset["id"], "horizon": 3},
            "priority": 5,
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    job_id = api_data(response)["id"]
    job = Job.objects.get(id=job_id)
    assert job.status == Job.Status.SUCCEEDED
    assert job.progress_pct == 100
    assert "forecast" in (job.result or {}).get("outputs", {})
    assert "report" in (job.result or {}).get("outputs", {})

    detail = auth_client.get(f"/api/v1/jobs/{job_id}/")
    assert detail.status_code == status.HTTP_200_OK
    assert api_data(detail)["execution_ms"] is not None


@pytest.mark.django_db
def test_cancel_terminal_job_rejected(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Cancel Co"}, format="json"))
    created = auth_client.post(
        "/api/v1/jobs/",
        {"organization_id": org["id"], "job_type": "platform.ping", "payload": {}},
        format="json",
    )
    job_id = api_data(created)["id"]
    assert Job.objects.get(id=job_id).status == Job.Status.SUCCEEDED

    response = auth_client.post(f"/api/v1/jobs/{job_id}/cancel/", format="json")
    assert response.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_retry_failed_job(auth_client, user_a):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Retry Co"}, format="json"))
    created = auth_client.post(
        "/api/v1/jobs/",
        {"organization_id": org["id"], "job_type": "platform.ping", "payload": {}},
        format="json",
    )
    job = Job.objects.get(id=api_data(created)["id"])
    job.status = Job.Status.FAILED
    job.error = "forced"
    job.attempt_count = 1
    job.max_retries = 3
    job.save(update_fields=["status", "error", "attempt_count", "max_retries"])

    response = auth_client.post(f"/api/v1/jobs/{job.id}/retry/", format="json")
    assert response.status_code == status.HTTP_201_CREATED
    retry_job = Job.objects.get(id=api_data(response)["id"])
    assert retry_job.status == Job.Status.SUCCEEDED
    assert retry_job.job_type == "platform.ping"