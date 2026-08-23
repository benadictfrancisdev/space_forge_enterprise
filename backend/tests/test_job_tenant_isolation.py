"""SF-001 — cross-tenant job payload IDOR defenses."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.core.exceptions import PermissionDeniedError
from apps.datasets.application.services import DatasetService
from apps.integrations.application.connection_service import ConnectionService
from apps.jobs.application.services import JobService, validate_job_payload
from apps.jobs.infrastructure.models import Job
from tests.conftest import api_data


def _org_with_workspace(auth_client, name: str):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": name}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    return org, ws


def _connection(auth_client, org, ws, name: str = "Echo Link"):
    return api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": name,
                "connector_type": "platform.echo",
                "config": {"message": "ping", "row_count": 2},
                "sync_schedule": "manual",
            },
            format="json",
        )
    )


def _dataset(auth_client, org, ws, name: str = "Tenant DS"):
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile(
                    "data.csv",
                    b"col\n1\n2\n",
                    content_type="text/csv",
                ),
            },
            format="multipart",
        )
    )
    return api_data(
        auth_client.post(
            "/api/v1/datasets/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": name,
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )


@pytest.mark.django_db
def test_enqueue_rejects_unsupported_job_type(auth_client):
    org, _ = _org_with_workspace(auth_client, "Job Allowlist Co")
    response = auth_client.post(
        "/api/v1/jobs/",
        {
            "organization_id": org["id"],
            "job_type": "malicious.cross_tenant",
            "payload": {},
        },
        format="json",
    )
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Unsupported job type" in response.json()["message"]


@pytest.mark.django_db
def test_enqueue_rejects_cross_tenant_connection_id(auth_client, auth_client_b):
    org_a, ws_a = _org_with_workspace(auth_client, "Conn A")
    org_b, _ = _org_with_workspace(auth_client_b, "Conn B")
    conn_a = _connection(auth_client, org_a, ws_a)

    response = auth_client_b.post(
        "/api/v1/jobs/",
        {
            "organization_id": org_b["id"],
            "job_type": "connector.test",
            "payload": {"connection_id": conn_a["id"]},
        },
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "does not belong to this organization" in response.json()["message"]


@pytest.mark.django_db
def test_enqueue_rejects_cross_tenant_dataset_id(auth_client, auth_client_b):
    org_a, ws_a = _org_with_workspace(auth_client, "Dataset A")
    org_b, _ = _org_with_workspace(auth_client_b, "Dataset B")
    dataset_a = _dataset(auth_client, org_a, ws_a)

    response = auth_client_b.post(
        "/api/v1/jobs/",
        {
            "organization_id": org_b["id"],
            "job_type": "dataset.profile",
            "payload": {"dataset_id": dataset_a["id"]},
        },
        format="json",
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "does not belong to this organization" in response.json()["message"]


@pytest.mark.django_db
def test_validate_job_payload_accepts_same_tenant_resources(auth_client, user_a):
    org, ws = _org_with_workspace(auth_client, "Valid Payload Co")
    dataset = _dataset(auth_client, org, ws)
    validate_job_payload(
        "dataset.profile",
        {"dataset_id": dataset["id"]},
        org["id"],
    )
    job = JobService().enqueue(
        organization_id=org["id"],
        user=user_a,
        job_type="dataset.profile",
        payload={"dataset_id": dataset["id"]},
    )
    assert job.status == Job.Status.SUCCEEDED


@pytest.mark.django_db
def test_worker_blocks_cross_tenant_connection_test(auth_client, auth_client_b):
    org_a, ws_a = _org_with_workspace(auth_client, "Worker Conn A")
    org_b, _ = _org_with_workspace(auth_client_b, "Worker Conn B")
    conn_a = _connection(auth_client, org_a, ws_a)

    with pytest.raises(PermissionDeniedError, match="Cross-tenant resource access blocked"):
        ConnectionService().run_test_for_job(
            connection_id=conn_a["id"],
            organization_id=org_b["id"],
        )


@pytest.mark.django_db
def test_worker_blocks_cross_tenant_dataset_profile(auth_client, auth_client_b):
    org_a, ws_a = _org_with_workspace(auth_client, "Worker DS A")
    org_b, _ = _org_with_workspace(auth_client_b, "Worker DS B")
    dataset_a = _dataset(auth_client, org_a, ws_a)

    with pytest.raises(PermissionDeniedError, match="Cross-tenant resource access blocked"):
        DatasetService().run_profile_now(
            dataset_id=dataset_a["id"],
            organization_id=org_b["id"],
        )


@pytest.mark.django_db
def test_worker_job_bypass_marks_failed_for_cross_tenant_profile(
    auth_client, auth_client_b, user_b
):
    org_a, ws_a = _org_with_workspace(auth_client, "Bypass A")
    org_b, _ = _org_with_workspace(auth_client_b, "Bypass B")
    dataset_a = _dataset(auth_client, org_a, ws_a)

    job = Job.objects.create(
        organization_id=org_b["id"],
        job_type="dataset.profile",
        payload={"dataset_id": dataset_a["id"]},
        status=Job.Status.QUEUED,
        max_retries=0,
        created_by=user_b,
        updated_by=user_b,
    )
    from workers.tasks import execute_platform_job

    result = execute_platform_job(str(job.id))
    job.refresh_from_db()
    assert result["ok"] is False
    assert job.status == Job.Status.FAILED
    assert "Cross-tenant resource access blocked" in (job.error or "")


@pytest.mark.django_db
def test_supported_ping_job_still_succeeds(auth_client):
    org, _ = _org_with_workspace(auth_client, "Ping Co")
    response = auth_client.post(
        "/api/v1/jobs/",
        {
            "organization_id": org["id"],
            "job_type": "platform.ping",
            "payload": {"ping": True},
        },
        format="json",
    )
    assert response.status_code == status.HTTP_201_CREATED
    job = Job.objects.get(id=api_data(response)["id"])
    assert job.status == Job.Status.SUCCEEDED
