"""DRF authentication class."""
from __future__ import annotations

from rest_framework import authentication, exceptions

from apps.core.exceptions import AuthenticationError
from apps.identity.application.services import AuthService
from apps.identity.application.providers import SpaceForgeTokenService


class SpaceForgeAuthentication(authentication.BaseAuthentication):
    keyword = "Bearer"

    def authenticate(self, request):
        header = authentication.get_authorization_header(request).decode("utf-8")
        if not header:
            return None
        parts = header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None
        token = parts[1]
        try:
            user = AuthService().authenticate_bearer(token)
        except AuthenticationError as exc:
            raise exceptions.AuthenticationFailed(str(exc)) from exc

        claims = None
        try:
            claims = SpaceForgeTokenService().decode_access(token)
            request.auth_session_id = claims.get("sid")
        except Exception:  # noqa: BLE001
            request.auth_session_id = None
        return (user, claims or token)

    def authenticate_header(self, request):
        return self.keyword
