"""HTTP / inline client for the FastAPI AI compute service."""
from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger("spaceforge.ai")


def _ensure_ai_service_on_path() -> None:
    backend_root = Path(settings.BASE_DIR)
    root_str = str(backend_root)
    if root_str not in sys.path:
        sys.path.insert(0, root_str)


class AIComputeClient:
    def __init__(self):
        self.mode = (getattr(settings, "AI_SERVICE_MODE", "inline") or "inline").lower()
        self.base_url = (getattr(settings, "AI_SERVICE_URL", "") or "").rstrip("/")
        self.timeout = float(getattr(settings, "AI_SERVICE_TIMEOUT_SECONDS", 60) or 60)

    def compute(self, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        if self.mode == "http" and self.base_url:
            return self._http_compute(operation, payload)
        return self._inline_compute(operation, payload)

    def _inline_compute(self, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        _ensure_ai_service_on_path()
        from ai_service.gateway import run_gateway

        out = run_gateway(operation, payload)
        out["transport"] = "inline"
        return out

    def _http_compute(self, operation: str, payload: dict[str, Any]) -> dict[str, Any]:
        url = f"{self.base_url}/v1/compute/{operation}"
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(url, json=payload)
                response.raise_for_status()
                data = response.json()
                data["transport"] = "http"
                return data
        except httpx.HTTPError as exc:
            logger.warning("ai_http_failed_fallback_inline", extra={"error": str(exc)})
            out = self._inline_compute(operation, payload)
            out["transport"] = "inline_fallback"
            out["http_error"] = str(exc)
            return out

    def health(self) -> dict[str, Any]:
        if self.mode == "http" and self.base_url:
            try:
                with httpx.Client(timeout=5) as client:
                    response = client.get(f"{self.base_url}/health")
                    response.raise_for_status()
                    return response.json()
            except httpx.HTTPError as exc:
                return {"status": "unavailable", "error": str(exc)}
        _ensure_ai_service_on_path()
        from ai_service.gateway import list_operations, list_prompt_versions, list_providers

        return {
            "status": "ok",
            "service": "spaceforge-ai",
            "transport": "inline",
            "operations": list_operations(),
            "providers": list_providers(),
            "prompt_versions": list_prompt_versions(),
            "schema_version": "ai@v1",
        }
