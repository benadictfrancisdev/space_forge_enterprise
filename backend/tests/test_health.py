from __future__ import annotations

import pytest
from rest_framework import status

from workers.tasks import worker_heartbeat


@pytest.mark.django_db
def test_health_endpoint(api_client):
    response = api_client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["status"] == "ok"
    assert "X-Request-ID" in response.headers


@pytest.mark.django_db
def test_ready_endpoint(api_client):
    worker_heartbeat()
    response = api_client.get("/health/ready/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"]["ok"] is True
    assert body["checks"]["redis"]["ok"] is True
    assert body["checks"]["storage"]["ok"] is True
