"""Authentication application service."""
from __future__ import annotations

from django.conf import settings

from apps.core.exceptions import AuthenticationError
from apps.identity.application.providers import (
    SpaceForgeTokenService,
    get_identity_provider,
)
from apps.identity.application.sessions import SessionService
from apps.identity.infrastructure.models import User


class AuthService:
    def __init__(self):
        self.provider = get_identity_provider()
        self.tokens = SpaceForgeTokenService()
        self.sessions = SessionService()

    def authenticate_bearer(self, token: str) -> User:
        # Prefer SpaceForge access JWT (three segments). Dev/opaque tokens fall through.
        looks_like_jwt = token.count(".") == 2 and not token.startswith("dev:")
        if looks_like_jwt:
            claims = self.tokens.decode_access(token)
            user = User.objects.filter(id=claims["sub"], is_active=True).first()
            if not user:
                raise AuthenticationError("User not found")
            if user.status == User.Status.DISABLED:
                raise AuthenticationError("User is disabled")
            sid = claims.get("sid")
            if sid:
                self.sessions.assert_session_active(sid)
            return user

        # Dev/Firebase identity tokens — only when AUTH_MODE allows bridge
        allow_identity = (settings.AUTH_MODE or "dev").lower() in {"dev", "firebase"}
        if not allow_identity:
            raise AuthenticationError("Invalid access token")

        identity = self.provider.verify(token)
        user, _created = User.objects.get_or_create(
            email=identity.email.lower(),
            defaults={
                "firebase_uid": identity.subject if identity.provider == "firebase" else None,
                "display_name": identity.email.split("@")[0],
            },
        )
        if identity.provider == "firebase" and user.firebase_uid != identity.subject:
            user.firebase_uid = identity.subject
            user.save(update_fields=["firebase_uid", "updated_at"])
        if not user.is_active or user.status == User.Status.DISABLED:
            raise AuthenticationError("User is disabled")
        return user

    def resolve_identity_user(self, token: str) -> User:
        """Exchange path — verify external identity and upsert user."""
        identity = self.provider.verify(token)
        user, _created = User.objects.get_or_create(
            email=identity.email.lower(),
            defaults={
                "firebase_uid": identity.subject if identity.provider == "firebase" else None,
                "display_name": identity.email.split("@")[0],
            },
        )
        if identity.provider == "firebase" and user.firebase_uid != identity.subject:
            user.firebase_uid = identity.subject
            user.save(update_fields=["firebase_uid", "updated_at"])
        if not user.is_active or user.status == User.Status.DISABLED:
            raise AuthenticationError("User is disabled")
        return user

    def exchange(self, *, identity_token: str, request=None) -> dict:
        user = self.resolve_identity_user(identity_token)
        session, access, refresh = self.sessions.create_session(user=user, request=request)
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "Bearer",
            "expires_in": settings.JWT_ACCESS_TTL_SECONDS,
            "session_id": str(session.id),
            "user": user,
        }

    def refresh(self, *, refresh_token: str, request=None) -> dict:
        session, access, refresh = self.sessions.rotate_refresh(
            refresh_token=refresh_token, request=request
        )
        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "Bearer",
            "expires_in": settings.JWT_ACCESS_TTL_SECONDS,
            "session_id": str(session.id),
            "user": session.user,
        }

    def issue_access_token(self, user: User, organization_id: str | None = None) -> str:
        return self.tokens.issue(
            user_id=str(user.id),
            email=user.email,
            organization_id=organization_id,
        )
