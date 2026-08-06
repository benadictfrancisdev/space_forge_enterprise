"""
Model Router — Track 5.2

Selects a provider without exposing routing to React.
Preference order can be overridden via AI_PROVIDER_ORDER env
(e.g. "gpt,claude,gemini,heuristic").
"""
from __future__ import annotations

import logging
import os
from typing import Any

from ai_service.providers import BaseProvider, HeuristicProvider, ProviderResult, default_providers

logger = logging.getLogger("spaceforge.ai.router")


class ModelRouter:
    def __init__(self, providers: list[BaseProvider] | None = None):
        self.providers = providers or default_providers()

    def _order(self) -> list[BaseProvider]:
        raw = (os.environ.get("AI_PROVIDER_ORDER") or "").strip()
        if not raw:
            # Prefer configured LLMs first, heuristic last
            return sorted(
                self.providers,
                key=lambda p: (0 if p.name != "heuristic" and p.is_available() else 1, p.name),
            )
        wanted = [x.strip().lower() for x in raw.split(",") if x.strip()]
        by_name = {p.name: p for p in self.providers}
        ordered = [by_name[n] for n in wanted if n in by_name]
        for p in self.providers:
            if p not in ordered:
                ordered.append(p)
        return ordered

    def route(
        self,
        operation: str,
        payload: dict[str, Any],
        *,
        preferred: str | None = None,
    ) -> ProviderResult:
        order = self._order()
        if preferred:
            preferred = preferred.lower()
            order = sorted(order, key=lambda p: 0 if p.name == preferred else 1)

        errors: list[str] = []
        for provider in order:
            if not provider.is_available():
                continue
            try:
                return provider.complete(operation, payload)
            except NotImplementedError as exc:
                errors.append(f"{provider.name}: {exc}")
                continue
            except Exception as exc:  # noqa: BLE001
                logger.warning("provider_failed", extra={"provider": provider.name, "error": str(exc)})
                errors.append(f"{provider.name}: {exc}")
                continue

        # Absolute fallback
        return HeuristicProvider().complete(operation, payload)
