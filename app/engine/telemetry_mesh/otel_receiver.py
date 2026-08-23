"""FastAPI OpenTelemetry-style telemetry ingestion router."""
from __future__ import annotations

import os
from typing import Annotated

from fastapi import APIRouter, Depends, FastAPI, status
from pydantic import BaseModel

from app.engine.telemetry_mesh.event_bus import RedisEventBus
from app.engine.telemetry_mesh.models import TelemetryEvent

telemetry_router = APIRouter(tags=["telemetry"])


class IngestResponse(BaseModel):
    event_id: str
    message_id: str
    status: str = "accepted"


def _default_redis_url() -> str:
    return os.environ.get("REDIS_URL", "redis://localhost:6379/0")


def get_event_bus() -> RedisEventBus:
    return RedisEventBus(_default_redis_url())


@telemetry_router.post(
    "/ingest",
    status_code=status.HTTP_202_ACCEPTED,
    response_model=IngestResponse,
)
async def ingest_telemetry(
    event: TelemetryEvent,
    bus: Annotated[RedisEventBus, Depends(get_event_bus)],
) -> IngestResponse:
    message_id = await bus.publish(event)
    return IngestResponse(event_id=str(event.event_id), message_id=message_id)


def create_telemetry_app() -> FastAPI:
    app = FastAPI(title="SpaceForge Telemetry Mesh")
    app.include_router(telemetry_router)
    return app
