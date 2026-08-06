"""
Infrastructure integration tests — require Docker Compose services.

Run:
  docker compose up -d --build
  RUN_INFRA_TESTS=1 pytest tests/test_infra_integration.py -m infra
"""
from __future__ import annotations

import os

import pytest
import redis
from django.conf import settings
from django.core.cache import cache
from django.db import connection

from apps.storage.infrastructure.s3 import S3ObjectStorage
from workers.tasks import platform_ping, worker_heartbeat

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_INFRA_TESTS") != "1",
    reason="Set RUN_INFRA_TESTS=1 with Compose services running",
)


@pytest.mark.django_db
def test_postgres_vendor_and_migrations():
    assert connection.vendor == "postgresql"
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT COUNT(*) FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = 'organizations'
            """
        )
        assert cursor.fetchone()[0] == 1


@pytest.mark.django_db
def test_redis_broker_and_cache():
    cache.set("infra:redis", "ok", timeout=10)
    assert cache.get("infra:redis") == "ok"
    client = redis.from_url(settings.REDIS_URL)
    assert client.ping() is True


@pytest.mark.django_db
def test_s3_minio_roundtrip():
    storage = S3ObjectStorage()
    key = "infra/certification.bin"
    storage.upload(key=key, body=b"infra-bytes", content_type="application/octet-stream")
    assert storage.exists(key=key)
    assert storage.download(key=key) == b"infra-bytes"
    assert "http" in storage.signed_url(key=key)
    storage.delete(key=key)


@pytest.mark.django_db
def test_celery_executes_against_broker():
    # Requires CELERY_TASK_ALWAYS_EAGER=false and a live worker.
    if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
        pytest.skip("eager mode — covered by unit tests")
    worker_heartbeat.delay().get(timeout=30)
    result = platform_ping.delay("infra").get(timeout=30)
    assert result["ok"] is True
