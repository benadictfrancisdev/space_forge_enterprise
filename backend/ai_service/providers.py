"""
Model providers — Track 5.2

React never sees provider names in request routing.
Django/FastAPI ModelRouter selects the provider.
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class ProviderResult:
    content: dict[str, Any]
    provider: str
    model: str
    tokens_prompt: int = 0
    tokens_completion: int = 0
    cost_usd: float = 0.0
    confidence: float | None = None


class BaseProvider(ABC):
    name: str = "base"

    @abstractmethod
    def is_available(self) -> bool:
        ...

    @abstractmethod
    def complete(self, operation: str, payload: dict[str, Any], *, system_hint: str = "") -> ProviderResult:
        ...


class HeuristicProvider(BaseProvider):
    """Always-available local compute (no external API keys)."""

    name = "heuristic"

    def is_available(self) -> bool:
        return True

    def complete(self, operation: str, payload: dict[str, Any], *, system_hint: str = "") -> ProviderResult:
        from ai_service.registry import REGISTRY

        content = REGISTRY.run(operation, payload)
        confidence = content.get("confidence")
        if isinstance(confidence, (int, float)) and confidence > 1:
            confidence = float(confidence) / 100.0
        return ProviderResult(
            content=content,
            provider=self.name,
            model="spaceforge-heuristic-v1",
            tokens_prompt=_estimate_tokens(str(payload)),
            tokens_completion=_estimate_tokens(str(content)),
            cost_usd=0.0,
            confidence=float(confidence) if confidence is not None else 0.55,
        )


class _EnvLLMProvider(BaseProvider):
    """
    Stub LLM provider shell — activates only when API key env is set.
    Until keys exist, is_available() is False and router skips to heuristic.
    """

    name = "llm"
    env_key: str = ""
    model_env: str = ""
    default_model: str = ""

    def is_available(self) -> bool:
        return bool(os.environ.get(self.env_key, "").strip())

    def complete(self, operation: str, payload: dict[str, Any], *, system_hint: str = "") -> ProviderResult:
        # Sprint 1: no live HTTP LLM wiring — fall through via raising so router uses heuristic.
        # Keys present means "configured for future Track 5 hardening".
        raise NotImplementedError(
            f"{self.name} provider is configured but live HTTP completion is deferred; "
            "use heuristic until LLM adapters are certified."
        )


class OpenAIProvider(_EnvLLMProvider):
    name = "gpt"
    env_key = "OPENAI_API_KEY"
    model_env = "OPENAI_MODEL"
    default_model = "gpt-4o-mini"


class AnthropicProvider(_EnvLLMProvider):
    name = "claude"
    env_key = "ANTHROPIC_API_KEY"
    model_env = "ANTHROPIC_MODEL"
    default_model = "claude-3-5-haiku-latest"


class GeminiProvider(_EnvLLMProvider):
    name = "gemini"
    env_key = "GEMINI_API_KEY"
    model_env = "GEMINI_MODEL"
    default_model = "gemini-1.5-flash"


class DeepSeekProvider(_EnvLLMProvider):
    name = "deepseek"
    env_key = "DEEPSEEK_API_KEY"
    model_env = "DEEPSEEK_MODEL"
    default_model = "deepseek-chat"


class LlamaProvider(_EnvLLMProvider):
    name = "llama"
    env_key = "LLAMA_API_KEY"
    model_env = "LLAMA_MODEL"
    default_model = "llama-3.1-70b"


def _estimate_tokens(text: str) -> int:
    # Rough 4 chars/token estimate for cost telemetry scaffolding
    return max(1, len(text) // 4) if text else 0


def default_providers() -> list[BaseProvider]:
    return [
        OpenAIProvider(),
        AnthropicProvider(),
        GeminiProvider(),
        DeepSeekProvider(),
        LlamaProvider(),
        HeuristicProvider(),
    ]
