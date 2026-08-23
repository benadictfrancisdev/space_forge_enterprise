"""Unit tests for the Zero-Burn AI gateway."""
from __future__ import annotations

import hashlib

import fakeredis.aioredis
import pytest

from app.infrastructure.ai_gateway.models import GatewayRequest
from app.infrastructure.ai_gateway.router import (
    CACHE_PREFIX,
    CHEAP_MODEL,
    CHAT_TO_RULE_CONTENT,
    INCIDENT_PREDICT_CONTENT,
    PREMIUM_MODEL,
    AIGateway,
)


@pytest.fixture
async def fake_redis():
    client = fakeredis.aioredis.FakeRedis(decode_responses=True)
    yield client
    await client.aclose()


@pytest.fixture
async def gateway(fake_redis):
    return AIGateway(fake_redis)


@pytest.mark.asyncio
async def test_tier1_routes_to_cheap_model(gateway):
    request = GatewayRequest(
        prompt="Create a rule when API latency exceeds 500ms",
        tier=1,
        task_type="chat_to_rule",
    )

    response = await gateway.route_request(request)

    assert response.cached is False
    assert response.model_used == CHEAP_MODEL
    assert response.content == CHAT_TO_RULE_CONTENT


@pytest.mark.asyncio
async def test_tier3_routes_to_expensive_model(gateway):
    request = GatewayRequest(
        prompt="Predict blast radius for checkout outage",
        tier=3,
        task_type="incident_predict",
    )

    response = await gateway.route_request(request)

    assert response.cached is False
    assert response.model_used == PREMIUM_MODEL
    assert response.content == INCIDENT_PREDICT_CONTENT


@pytest.mark.asyncio
async def test_chat_to_rule_is_cached(gateway, fake_redis):
    prompt = "Alert me when database locks spike on users table"
    request = GatewayRequest(prompt=prompt, tier=1, task_type="chat_to_rule")

    first = await gateway.route_request(request)
    second = await gateway.route_request(request)

    assert first.cached is False
    assert first.model_used == CHEAP_MODEL
    assert second.cached is True
    assert second.model_used == "cache"
    assert second.content == first.content

    cache_key = f"{CACHE_PREFIX}{hashlib.sha256(prompt.encode('utf-8')).hexdigest()}"
    assert await fake_redis.get(cache_key) == CHAT_TO_RULE_CONTENT


@pytest.mark.asyncio
async def test_incident_is_not_cached(gateway, fake_redis):
    prompt = "Checkout API returning 503 across us-east-1"
    request = GatewayRequest(prompt=prompt, tier=3, task_type="incident_predict")

    first = await gateway.route_request(request)
    second = await gateway.route_request(request)

    assert first.cached is False
    assert second.cached is False
    assert first.model_used == PREMIUM_MODEL
    assert second.model_used == PREMIUM_MODEL
    assert first.content == INCIDENT_PREDICT_CONTENT
    assert second.content == INCIDENT_PREDICT_CONTENT

    cache_key = f"{CACHE_PREFIX}{hashlib.sha256(prompt.encode('utf-8')).hexdigest()}"
    assert await fake_redis.get(cache_key) is None
