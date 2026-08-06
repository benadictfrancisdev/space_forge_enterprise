from __future__ import annotations

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from apps.api.envelope import error_envelope
from apps.core.exceptions import DomainError


def _format_drf_errors(detail) -> tuple[str, list[dict]]:
    """Flatten DRF validation errors into envelope errors[]."""
    errors: list[dict] = []

    def walk(node, field: str | None = None):
        if isinstance(node, dict):
            for key, value in node.items():
                walk(value, field=str(key) if field is None else f"{field}.{key}")
        elif isinstance(node, list):
            for item in node:
                walk(item, field=field)
        else:
            errors.append(
                {
                    "code": "validation_error",
                    "message": str(node),
                    **({"field": field} if field else {}),
                }
            )

    if isinstance(detail, dict) and "detail" in detail and len(detail) == 1:
        message = str(detail["detail"])
        return message, [{"code": "api_error", "message": message}]

    walk(detail)
    if not errors:
        message = str(detail)
        return message, [{"code": "api_error", "message": message}]
    message = errors[0]["message"]
    return message, errors


def spaceforge_exception_handler(exc, context):
    if isinstance(exc, DomainError):
        return Response(
            error_envelope(exc.message, code=exc.code),
            status=exc.status_code,
        )

    response = exception_handler(exc, context)
    if response is not None:
        message, errors = _format_drf_errors(response.data)
        code = "validation_error" if response.status_code == 400 else "api_error"
        if response.status_code == 401:
            code = "unauthorized"
        elif response.status_code == 403:
            code = "forbidden"
        elif response.status_code == 404:
            code = "not_found"
        response.data = error_envelope(message, code=code, errors=errors)
        return response

    return Response(
        error_envelope("An unexpected error occurred", code="internal_error"),
        status=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )
