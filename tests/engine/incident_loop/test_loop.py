"""Unit tests for the autonomous incident loop."""
from __future__ import annotations

from unittest.mock import AsyncMock
from uuid import UUID

import fakeredis.aioredis
import pytest

from app.engine.incident_loop.cause_generator import CauseGenerator
from app.engine.incident_loop.models import IncidentContext
from app.engine.incident_loop.orchestrator import IncidentOrchestrator
from app.engine.incident_loop.predict_engine import PredictEngine
from app.infrastructure.ai_gateway.models import GatewayRequest, GatewayResponse
from app.infrastructure.ai_gateway.router import AIGateway, INCIDENT_PREDICT_CONTENT

ORG_ID = UUID("22222222-2222-4222-8222-222222222222")


@pytest.fixture
def incident_context() -> IncidentContext:
    return IncidentContext(
        organization_id=ORG_ID,
        breached_rule_id="checkout-latency-guard",
        metric_name="api.latency",
        metric_value=742.0,
    )


@pytest.mark.asyncio
async def test_cause_generator_formats_markdown(incident_context):
    cause_md = await CauseGenerator().generate_cause(incident_context)

    assert cause_md.startswith("# CAUSE DOCUMENT")
    assert "**Breach:** api.latency reached 742.0" in cause_md
    assert "database write-lock on `users` table" in cause_md
    assert "`fix: update payment router` (a3f9b2c)" in cause_md


@pytest.mark.asyncio
async def test_predict_engine_calls_gateway():
    mock_gateway = AsyncMock(spec=AIGateway)
    cause_md = "# CAUSE DOCUMENT\n**Breach:** api.latency reached 742.0"
    mock_gateway.route_request.return_value = GatewayResponse(
        content=INCIDENT_PREDICT_CONTENT,
        model_used="claude-3-5-sonnet-20240620",
        cached=False,
    )

    engine = PredictEngine(mock_gateway)
    prediction = await engine.generate_prediction(cause_md, tier=3)

    assert prediction == INCIDENT_PREDICT_CONTENT
    mock_gateway.route_request.assert_awaited_once()
    request = mock_gateway.route_request.await_args.args[0]
    assert isinstance(request, GatewayRequest)
    assert request.task_type == "incident_predict"
    assert request.tier == 3
    assert cause_md in request.prompt
    assert request.prompt.startswith(
        "Analyze this cause document and predict the blast radius:"
    )


@pytest.mark.asyncio
async def test_orchestrator_pipeline(incident_context):
    fake_redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
    gateway = AIGateway(fake_redis)
    orchestrator = IncidentOrchestrator(
        cause_gen=CauseGenerator(),
        predict_gen=PredictEngine(gateway),
    )

    artifacts = await orchestrator.handle_breach(incident_context, tier=2)

    assert artifacts.ticket_id.startswith("INC-")
    assert len(artifacts.ticket_id) == len("INC-") + 6
    assert artifacts.cause_markdown.startswith("# CAUSE DOCUMENT")
    assert "**Breach:** api.latency reached 742.0" in artifacts.cause_markdown
    assert artifacts.predict_markdown == INCIDENT_PREDICT_CONTENT
    assert "Blast radius: High" in artifacts.predict_markdown

    await fake_redis.aclose()
