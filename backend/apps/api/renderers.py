"""DRF renderer that wraps all /api responses in the unified envelope."""
from __future__ import annotations

from rest_framework.renderers import JSONRenderer

from apps.api.envelope import error_envelope, is_envelope, success_envelope


class EnvelopeJSONRenderer(JSONRenderer):
    """
    Success bodies become:
      { success, data, message, errors, meta }
    Paginated DRF dicts ({count, next, previous, results}) map results → data
    and pagination fields → meta.
    """

    def render(self, data, accepted_media_type=None, renderer_context=None):
        renderer_context = renderer_context or {}
        request = renderer_context.get("request")
        response = renderer_context.get("response")
        path = getattr(request, "path", "") if request else ""

        # OpenAPI schema / browsable exceptions — do not wrap
        if path.startswith("/api/schema") or path.startswith("/api/docs"):
            return super().render(data, accepted_media_type, renderer_context)

        if is_envelope(data):
            return super().render(data, accepted_media_type, renderer_context)

        status_code = getattr(response, "status_code", 200) if response else 200

        # Legacy { error: { code, message } } — do not confuse with Job.error string field
        err_obj = data.get("error") if isinstance(data, dict) else None
        if (
            isinstance(data, dict)
            and "success" not in data
            and isinstance(err_obj, dict)
            and ("code" in err_obj or "message" in err_obj)
        ):
            message = err_obj.get("message", "Request failed")
            if not isinstance(message, str):
                message = str(message)
            wrapped = error_envelope(
                message,
                code=err_obj.get("code") or f"http_{status_code}",
                meta={"trace_id": err_obj.get("trace_id")} if err_obj.get("trace_id") else None,
            )
            return super().render(wrapped, accepted_media_type, renderer_context)

        if status_code >= 400:
            message = "Request failed"
            if isinstance(data, dict) and "detail" in data:
                message = str(data["detail"])
            elif isinstance(data, str):
                message = data
            wrapped = error_envelope(message, code=f"http_{status_code}")
            return super().render(wrapped, accepted_media_type, renderer_context)

        meta: dict = {}
        payload = data
        if isinstance(data, dict) and "results" in data:
            payload = data.get("results")
            for key in ("count", "next", "previous", "page", "page_size"):
                if key in data:
                    meta[key] = data[key]

        wrapped = success_envelope(payload, meta=meta or None)
        return super().render(wrapped, accepted_media_type, renderer_context)
