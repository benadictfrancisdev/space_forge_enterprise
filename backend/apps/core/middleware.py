"""Request tracing, structured logging, and error boundary middleware."""
from __future__ import annotations

import logging
import time
import uuid

from django.http import JsonResponse

from apps.core import metrics
from apps.core.logging import get_trace_id, set_trace_id, set_organization_id

logger = logging.getLogger("spaceforge.request")


class TraceIdMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        trace_id = (
            request.headers.get("X-Request-ID")
            or request.headers.get("X-Trace-ID")
            or str(uuid.uuid4())
        )
        request.trace_id = trace_id
        request.META["HTTP_X_TRACE_ID"] = trace_id
        set_trace_id(trace_id)
        response = self.get_response(request)
        response["X-Request-ID"] = trace_id
        response["X-Trace-ID"] = trace_id
        return response


class RequestLoggingMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        started = time.perf_counter()
        org_id = self._resolve_organization_id(request)
        if org_id:
            set_organization_id(org_id)
        response = self.get_response(request)
        duration_ms = round((time.perf_counter() - started) * 1000, 2)
        metrics.incr("http_requests_total", method=request.method, status=response.status_code)
        metrics.gauge("http_request_duration_ms", duration_ms, path=request.path)
        logger.info(
            "request_completed",
            extra={
                "method": request.method,
                "path": request.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
                "user_id": str(getattr(getattr(request, "user", None), "id", "") or ""),
                "organization_id": org_id or "",
            },
        )
        return response

    @staticmethod
    def _resolve_organization_id(request) -> str:
        tenant = getattr(request, "tenant", None)
        if tenant and getattr(tenant, "organization_id", None):
            return str(tenant.organization_id)
        query_org = request.GET.get("organization_id")
        if query_org:
            return str(query_org)
        return ""


class SecurityHeadersMiddleware:
    """Enterprise security headers (Track 7)."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.setdefault("X-Content-Type-Options", "nosniff")
        response.setdefault("X-Frame-Options", "DENY")
        response.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        response.setdefault(
            "Permissions-Policy",
            "geolocation=(), microphone=(), camera=()",
        )
        response.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        # API responses are JSON — avoid caching authenticated payloads
        if request.path.startswith("/api/"):
            response.setdefault("Cache-Control", "no-store")
        return response


class ErrorHandlingMiddleware:
    """Catch unexpected exceptions and return structured JSON with trace id."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            return self.get_response(request)
        except Exception:
            logger.exception("unhandled_exception", extra={"path": getattr(request, "path", "")})
            metrics.incr("http_unhandled_errors_total")
            return JsonResponse(
                {
                    "error": {
                        "code": "internal_error",
                        "message": "An unexpected error occurred",
                        "trace_id": getattr(request, "trace_id", get_trace_id()),
                    }
                },
                status=500,
            )
