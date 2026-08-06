"""Unified API response envelope — Sprint 1 Track 3."""
from __future__ import annotations

from typing import Any

from apps.core.logging import get_trace_id


def success_envelope(
    data: Any = None,
    *,
    message: str = "",
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged_meta = {"trace_id": get_trace_id()}
    if meta:
        merged_meta.update(meta)
    return {
        "success": True,
        "data": data,
        "message": message or "",
        "errors": [],
        "meta": merged_meta,
    }


def error_envelope(
    message: str,
    *,
    code: str = "api_error",
    errors: list[dict[str, Any]] | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    merged_meta = {"trace_id": get_trace_id()}
    if meta:
        merged_meta.update(meta)
    detail_errors = errors or [{"code": code, "message": message}]
    return {
        "success": False,
        "data": None,
        "message": message,
        "errors": detail_errors,
        "meta": merged_meta,
    }


def is_envelope(payload: Any) -> bool:
    return isinstance(payload, dict) and "success" in payload and "data" in payload
