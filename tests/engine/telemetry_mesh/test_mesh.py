"""Unit tests for the SpaceForge V2 telemetry mesh."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from uuid import UUID, uuid4

import fakeredis.aioredis
import pytest
from httpx import ASGITransport, AsyncClient
from pydantic import ValidationError

from app.engine.telemetry_mesh.event_bus import RedisEventBus
from app.engine.telemetry_mesh.models import TelemetryEvent
from app.engine.telemetry_mesh.otel_receiver import create_telemetry_app, get_event_bus

ORG_ID = UUID("11111111-1111-4111-8111-111111111111")


@pytest.mark.asyncio
async def test_telemetry_event_validation():
    event = TelemetryEvent(
        organization_id=ORG_ID,
        source="postgres",
        metric_name="db.locks",
        value=12.5,
        metadata={"table": "users"},
    )
    assert event.event_id is not None
    assert event.timestamp.tzinfo is not None

    with pytest.raises(ValidationError):
        TelemetryEvent(
            organization_id=ORG_ID,
            source="postgres",
            metric_name="db.locks",
            value="not-a-float",
        )

    with pytest.raises(ValidationError):
        TelemetryEvent(
            organization_id="not-a-uuid",
            source="postgres",
            metric_name="db.locks",
            value=1.0,
        )


@pytest.mark.asyncio
async def test_redis_event_bus_publish():
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    bus = RedisEventBus("redis://localhost:6379/0", client=fake_redis)
    event = TelemetryEvent(
        organization_id=ORG_ID,
        source="custom_api",
        metric_name="api.latency",
        value=742.0,
        metadata={"endpoint": "/api/v1/checkout"},
        timestamp=datetime(2026, 8, 23, 12, 0, tzinfo=timezone.utc),
    )

    message_id = await bus.publish(event)

    assert message_id
    stream = f"spaceforge:telemetry:{ORG_ID}"
    entries = await fake_redis.xrange(stream)
    assert len(entries) == 1
    _, fields = entries[0]
    stored = json.loads(fields["payload"])
    assert stored["metric_name"] == "api.latency"
    assert stored["value"] == 742.0
    assert stored["organization_id"] == str(ORG_ID)
    assert stored["metadata"]["endpoint"] == "/api/v1/checkout"

    await bus.close()


@pytest.mark.asyncio
async def test_otel_receiver_endpoint():
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    bus = RedisEventBus("redis://localhost:6379/0", client=fake_redis)
    app = create_telemetry_app()
    app.dependency_overrides[get_event_bus] = lambda: bus

    event_id = str(uuid4())
    payload = {
        "event_id": event_id,
        "organization_id": str(ORG_ID),
        "source": "stripe",
        "metric_name": "api.latency",
        "value": 600.0,
        "metadata": {"region": "us-east-1"},
        "timestamp": "2026-08-23T12:00:00+00:00",
    }

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post("/ingest", json=payload)

    assert response.status_code == 202
    body = response.json()
    assert body["event_id"] == event_id
    assert body["status"] == "accepted"
    assert body["message_id"]

    stream = f"spaceforge:telemetry:{ORG_ID}"
    entries = await fake_redis.xrange(stream)
    assert len(entries) == 1

    await bus.close()
