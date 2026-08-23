"""Tiered AI routing with Redis-backed prompt caching."""
from __future__ import annotations

import hashlib

from app.infrastructure.ai_gateway.models import GatewayRequest, GatewayResponse

CACHE_PREFIX = "spaceforge:aicache:"
CACHE_TTL_SECONDS = 86_400

CHEAP_MODEL = "gpt-4o-mini"
PREMIUM_MODEL = "claude-3-5-sonnet-20240620"

CHAT_TO_RULE_CONTENT = "WHEN @metric:mock > 0 THEN trigger @module:mock"
INCIDENT_PREDICT_CONTENT = "# PREDICT DOC\nBlast radius: High"


class AIGateway:
    """Route AI requests by subscription tier and cache casual rule generation."""

    def __init__(self, redis_client) -> None:
        self._redis = redis_client

    def _cache_key(self, prompt: str) -> str:
        digest = hashlib.sha256(prompt.encode("utf-8")).hexdigest()
        return f"{CACHE_PREFIX}{digest}"

    def _select_model(self, tier: int) -> str:
        if tier == 1:
            return CHEAP_MODEL
        return PREMIUM_MODEL

    async def _mock_llm_execute(self, request: GatewayRequest, model: str) -> str:
        _ = model
        if request.task_type == "chat_to_rule":
            return CHAT_TO_RULE_CONTENT
        return INCIDENT_PREDICT_CONTENT

    async def route_request(self, request: GatewayRequest) -> GatewayResponse:
        if request.task_type == "chat_to_rule":
            cache_key = self._cache_key(request.prompt)
            cached_content = await self._redis.get(cache_key)
            if cached_content is not None:
                return GatewayResponse(
                    content=cached_content,
                    model_used="cache",
                    cached=True,
                )

        model = self._select_model(request.tier)
        content = await self._mock_llm_execute(request, model)

        if request.task_type == "chat_to_rule":
            cache_key = self._cache_key(request.prompt)
            await self._redis.set(cache_key, content, ex=CACHE_TTL_SECONDS)

        return GatewayResponse(
            content=content,
            model_used=model,
            cached=False,
        )
