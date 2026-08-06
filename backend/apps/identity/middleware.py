"""Resolve tenant context from headers after authentication."""
from __future__ import annotations

import logging
import uuid

logger = logging.getLogger("spaceforge.tenant")


class TenantContext:
    __slots__ = ("organization_id", "workspace_id")

    def __init__(self, organization_id=None, workspace_id=None):
        self.organization_id = organization_id
        self.workspace_id = workspace_id


class TenantContextMiddleware:
    HEADER_ORG = "HTTP_X_ORGANIZATION_ID"
    HEADER_WS = "HTTP_X_WORKSPACE_ID"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.tenant = TenantContext(
            organization_id=self._parse_uuid(request.META.get(self.HEADER_ORG)),
            workspace_id=self._parse_uuid(request.META.get(self.HEADER_WS)),
        )
        return self.get_response(request)

    @staticmethod
    def _parse_uuid(value: str | None):
        if not value:
            return None
        try:
            return uuid.UUID(str(value))
        except (ValueError, TypeError):
            return None
