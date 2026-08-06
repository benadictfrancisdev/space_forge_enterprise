from __future__ import annotations

from django.http import JsonResponse
from django.views import View

from apps.core.logging import get_trace_id
from apps.platform.application.health import run_readiness_checks


class HealthView(View):
    """Liveness — process is up."""

    def get(self, request):
        return JsonResponse(
            {
                "status": "ok",
                "service": "spaceforge-api",
                "trace_id": getattr(request, "trace_id", get_trace_id()),
            }
        )


class ReadyView(View):
    """Readiness — database, redis, storage, worker."""

    def get(self, request):
        result = run_readiness_checks()
        return JsonResponse(
            {
                "status": "ready" if result["ok"] else "not_ready",
                "checks": result["checks"],
                "trace_id": getattr(request, "trace_id", get_trace_id()),
            },
            status=200 if result["ok"] else 503,
        )
