from __future__ import annotations

import pytest
from django.core.cache import cache
from rest_framework import status

from apps.platform.application.health import WORKER_HEARTBEAT_KEY
from apps.storage.application.factory import get_object_storage
from workers.tasks import platform_ping, worker_heartbeat


@pytest.mark.django_db
def test_health_endpoint(api_client):
    response = api_client.get("/health/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "ok"
    assert "X-Request-ID" in response.headers
    assert "X-Trace-ID" in response.headers


@pytest.mark.django_db
def test_ready_endpoint_with_memory_storage(api_client):
    worker_heartbeat()
    response = api_client.get("/health/ready/")
    assert response.status_code == status.HTTP_200_OK
    body = response.json()
    assert body["status"] == "ready"
    assert body["checks"]["database"]["ok"] is True
    assert body["checks"]["redis"]["ok"] is True
    assert body["checks"]["storage"]["ok"] is True


@pytest.mark.django_db
def test_storage_abstraction_upload_download_delete_signed_url():
    provider = get_object_storage()
    stored = provider.upload(
        key="cert/hello.txt",
        body=b"hello-spaceforge",
        content_type="text/plain",
        metadata={"phase": "0.1.1"},
    )
    assert stored.size_bytes == 16
    assert provider.exists(key="cert/hello.txt")
    assert provider.download(key="cert/hello.txt") == b"hello-spaceforge"
    url = provider.signed_url(key="cert/hello.txt", expires_in=60)
    assert "cert/hello.txt" in url
    provider.delete(key="cert/hello.txt")
    assert provider.exists(key="cert/hello.txt") is False


@pytest.mark.django_db
def test_celery_platform_ping_and_heartbeat():
    result = platform_ping.delay("certify").get(timeout=5)
    assert result["ok"] is True
    assert result["message"] == "certify"
    hb = worker_heartbeat.delay().get(timeout=5)
    assert "heartbeat" in hb
    assert cache.get(WORKER_HEARTBEAT_KEY)


@pytest.mark.django_db
def test_redis_cache_roundtrip():
    cache.set("certification:key", {"ok": True}, timeout=30)
    assert cache.get("certification:key") == {"ok": True}
