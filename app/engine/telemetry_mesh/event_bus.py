"""Asynchronous Redis Stream event bus for telemetry."""
from __future__ import annotations

import redis.asyncio as redis

from app.engine.telemetry_mesh.models import TelemetryEvent


class RedisEventBus:
    """Publish validated telemetry events to organization-scoped Redis Streams."""

    def __init__(
        self,
        redis_url: str,
        *,
        client: redis.Redis | None = None,
    ) -> None:
        self._redis_url = redis_url
        self._client = client
        self._owns_client = client is None

    def _stream_name(self, organization_id) -> str:
        return f"spaceforge:telemetry:{organization_id}"

    async def _get_client(self) -> redis.Redis:
        if self._client is None:
            self._client = redis.from_url(self._redis_url, decode_responses=True)
            self._owns_client = True
        return self._client

    async def publish(self, event: TelemetryEvent) -> str:
        client = await self._get_client()
        stream = self._stream_name(event.organization_id)
        message_id = await client.xadd(
            stream,
            {"payload": event.model_dump_json()},
        )
        return str(message_id)

    async def close(self) -> None:
        if self._client is not None and self._owns_client:
            await self._client.aclose()
            self._client = None
