"""Platform dependency probes for readiness."""
from __future__ import annotations

import logging
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import connection

logger = logging.getLogger("spaceforge.health")

WORKER_HEARTBEAT_KEY = "spaceforge:worker:heartbeat"


def check_database() -> dict[str, Any]:
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        return {"ok": True, "vendor": connection.vendor}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


def check_redis() -> dict[str, Any]:
    try:
        cache.set("spaceforge:ready_probe", "1", timeout=5)
        ok = cache.get("spaceforge:ready_probe") == "1"
        return {"ok": bool(ok), "backend": settings.CACHES["default"]["BACKEND"]}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


def check_storage() -> dict[str, Any]:
    try:
        from apps.storage.application.factory import get_object_storage

        return get_object_storage().health_check()
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


def check_worker() -> dict[str, Any]:
    try:
        if getattr(settings, "CELERY_TASK_ALWAYS_EAGER", False):
            return {"ok": True, "mode": "eager"}
        heartbeat = cache.get(WORKER_HEARTBEAT_KEY)
        if heartbeat:
            return {"ok": True, "heartbeat": heartbeat}
        return {"ok": False, "error": "no_worker_heartbeat"}
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


def run_readiness_checks() -> dict[str, Any]:
    checks = {
        "database": check_database(),
        "redis": check_redis(),
        "storage": check_storage(),
        "worker": check_worker(),
    }
    required = ["database", "redis", "storage"]
    if getattr(settings, "READY_REQUIRE_WORKER", True) and not getattr(
        settings, "CELERY_TASK_ALWAYS_EAGER", False
    ):
        required.append("worker")
    ok = all(checks[name].get("ok") for name in required)
    return {"ok": ok, "checks": checks, "required": required}
