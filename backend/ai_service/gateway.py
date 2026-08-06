"""
AI Gateway — Track 5.1 + 5.4 + 8.2 standard envelope.

Single entry used by FastAPI and Django inline mode.
"""
from __future__ import annotations

import time
from typing import Any

from ai_service.context import build_ai_context, context_hash
from ai_service.prompts.registry import PROMPT_REGISTRY
from ai_service.registry import REGISTRY
from ai_service.router import ModelRouter
from ai_service.schemas import build_standard_response

# Import side-effect: register operations
from ai_service import operations as _operations  # noqa: F401


def run_gateway(
    operation: str,
    payload: dict[str, Any] | None = None,
    *,
    preferred_provider: str | None = None,
) -> dict[str, Any]:
    started = time.perf_counter()
    op = (operation or "").strip().lower().replace("_", "-")
    body = build_ai_context(dict(payload or {}))
    preferred = preferred_provider or body.pop("preferred_provider", None)

    context = body.get("context") or {}
    try:
        prompt_spec = PROMPT_REGISTRY.get(op)
        rendered_prompt = PROMPT_REGISTRY.render_user(op, context, body)
        body["_prompt"] = {
            "version": prompt_spec.version_tag,
            "system": prompt_spec.system,
            "user": rendered_prompt,
        }
    except KeyError:
        body["_prompt"] = {"version": f"{op}@unversioned", "system": "", "user": ""}

    result = ModelRouter().route(op, body, preferred=preferred)
    latency_ms = int((time.perf_counter() - started) * 1000)

    confidence = result.confidence
    if confidence is None:
        conf_raw = result.content.get("confidence")
        if isinstance(conf_raw, (int, float)):
            confidence = float(conf_raw) / 100.0 if conf_raw > 1 else float(conf_raw)
        else:
            try:
                confidence = REGISTRY.get(op).default_confidence
            except KeyError:
                confidence = 0.5

    tokens_total = result.tokens_prompt + result.tokens_completion
    evaluation = {
        "provider": result.provider,
        "model": result.model,
        "latency_ms": latency_ms,
        "tokens": {
            "prompt": result.tokens_prompt,
            "completion": result.tokens_completion,
            "total": tokens_total,
        },
        "confidence": round(float(confidence), 4),
        "cost_usd": round(float(result.cost_usd), 6),
    }

    metadata = {
        "prompt_version": body["_prompt"].get("version"),
        "context_hash": context_hash(context),
        "quality_flags": context.get("quality_flags") or [],
    }

    return build_standard_response(
        operation=op,
        raw_content=result.content,
        evaluation=evaluation,
        metadata=metadata,
        model=result.model,
        latency_ms=latency_ms,
        transport=body.get("transport", "inline"),
    )


def list_operations() -> list[str]:
    return REGISTRY.list_operations()


def list_providers() -> list[dict[str, Any]]:
    from ai_service.providers import default_providers

    return [
        {"name": p.name, "available": p.is_available()}
        for p in default_providers()
    ]


def list_prompt_versions() -> dict[str, str]:
    return PROMPT_REGISTRY.list_versions()
