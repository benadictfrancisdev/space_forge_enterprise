"""Structured logging helpers."""
from __future__ import annotations

import json
import logging
from contextvars import ContextVar
from datetime import datetime, timezone

_trace_id: ContextVar[str] = ContextVar("trace_id", default="-")
_organization_id: ContextVar[str] = ContextVar("organization_id", default="")


def set_trace_id(trace_id: str) -> None:
    _trace_id.set(trace_id)


def get_trace_id() -> str:
    return _trace_id.get()


def set_organization_id(organization_id: str | None) -> None:
    _organization_id.set(str(organization_id or ""))


def get_organization_id() -> str:
    return _organization_id.get()


class TraceIdFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.trace_id = get_trace_id()
        return True


class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "trace_id": getattr(record, "trace_id", get_trace_id()),
        }
        for key in ("method", "path", "status_code", "duration_ms", "user_id", "organization_id", "operation"):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
            elif key == "organization_id" and get_organization_id():
                payload[key] = get_organization_id()
        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)
        return json.dumps(payload, default=str)
