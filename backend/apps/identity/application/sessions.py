"""Auth session lifecycle — refresh rotation, revocation, logout-all."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

import jwt
from django.conf import settings
from django.db import transaction
from django.utils import timezone as dj_timezone

from apps.audit.application.services import AuditService
from apps.core.exceptions import AuthenticationError, NotFoundError, ValidationError
from apps.identity.infrastructure.models import AuthSession, User


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def _client_meta(request) -> tuple[str, str | None, str]:
    if request is None:
        return "", None, ""
    ua = (request.META.get("HTTP_USER_AGENT") or "")[:512]
    ip = request.META.get("HTTP_X_FORWARDED_FOR", "").split(",")[0].strip() or request.META.get(
        "REMOTE_ADDR"
    )
    label = (request.data.get("device_label") if hasattr(request, "data") else None) or ""
    if not label and ua:
        label = ua[:80]
    return str(label)[:255], ip or None, ua


class SessionService:
    def __init__(self):
        self.audit = AuditService()

    def _issue_access(self, *, user: User, session: AuthSession) -> str:
        now = datetime.now(timezone.utc)
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "iat": now,
            "exp": now + timedelta(seconds=settings.JWT_ACCESS_TTL_SECONDS),
            "iss": "spaceforge",
            "typ": "access",
            "sid": str(session.id),
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)

    def _issue_refresh(self, *, user: User, session: AuthSession) -> str:
        now = datetime.now(timezone.utc)
        ttl = int(getattr(settings, "JWT_REFRESH_TTL_SECONDS", 60 * 60 * 24 * 14))
        payload = {
            "sub": str(user.id),
            "email": user.email,
            "iat": now,
            "exp": now + timedelta(seconds=ttl),
            "iss": "spaceforge",
            "typ": "refresh",
            "sid": str(session.id),
            "fid": str(session.family_id),
            "jti": str(uuid.uuid4()),
        }
        return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)

    def decode_refresh(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SIGNING_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"require": ["exp", "sub", "typ", "sid"]},
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid refresh token") from exc
        if payload.get("typ") != "refresh" or payload.get("iss") != "spaceforge":
            raise AuthenticationError("Invalid refresh token type")
        return payload

    @transaction.atomic
    def create_session(self, *, user: User, request=None) -> tuple[AuthSession, str, str]:
        label, ip, ua = _client_meta(request)
        ttl = int(getattr(settings, "JWT_REFRESH_TTL_SECONDS", 60 * 60 * 24 * 14))
        # Temporary hash until we issue refresh
        placeholder = _hash_token(secrets.token_urlsafe(32))
        session = AuthSession.objects.create(
            user=user,
            refresh_token_hash=placeholder,
            device_label=label,
            user_agent=ua,
            ip_address=ip,
            expires_at=dj_timezone.now() + timedelta(seconds=ttl),
            last_seen_at=dj_timezone.now(),
        )
        access = self._issue_access(user=user, session=session)
        refresh = self._issue_refresh(user=user, session=session)
        session.refresh_token_hash = _hash_token(refresh)
        session.save(update_fields=["refresh_token_hash"])
        user.mark_login()
        self.audit.record(
            actor=user,
            action="auth.login",
            resource_type="session",
            resource_id=str(session.id),
            metadata={"device_label": label, "ip": ip},
        )
        return session, access, refresh

    def assert_session_active(self, session_id: str) -> AuthSession:
        try:
            session = AuthSession.objects.select_related("user").get(id=session_id)
        except AuthSession.DoesNotExist as exc:
            raise AuthenticationError("Session not found") from exc
        if not session.is_active:
            raise AuthenticationError("Session revoked or expired")
        return session

    @transaction.atomic
    def rotate_refresh(self, *, refresh_token: str, request=None) -> tuple[AuthSession, str, str]:
        payload = self.decode_refresh(refresh_token)
        token_hash = _hash_token(refresh_token)
        try:
            session = AuthSession.objects.select_related("user").select_for_update().get(
                id=payload["sid"]
            )
        except AuthSession.DoesNotExist as exc:
            raise AuthenticationError("Session not found") from exc

        # Reuse detection — presented refresh does not match current hash
        if session.revoked_at is not None or session.refresh_token_hash != token_hash:
            AuthSession.objects.filter(family_id=session.family_id, revoked_at__isnull=True).update(
                revoked_at=dj_timezone.now(),
                revoke_reason="refresh_reuse",
            )
            self.audit.record(
                actor=session.user,
                action="auth.refresh_reuse",
                resource_type="session",
                resource_id=str(session.id),
                metadata={"family_id": str(session.family_id)},
            )
            raise AuthenticationError("Refresh token reuse detected — sessions revoked")

        if session.expires_at <= dj_timezone.now():
            session.revoked_at = dj_timezone.now()
            session.revoke_reason = "expired"
            session.save(update_fields=["revoked_at", "revoke_reason"])
            raise AuthenticationError("Refresh token expired")

        label, ip, ua = _client_meta(request)
        if label:
            session.device_label = label
        if ua:
            session.user_agent = ua
        if ip:
            session.ip_address = ip

        access = self._issue_access(user=session.user, session=session)
        refresh = self._issue_refresh(user=session.user, session=session)
        ttl = int(getattr(settings, "JWT_REFRESH_TTL_SECONDS", 60 * 60 * 24 * 14))
        session.refresh_token_hash = _hash_token(refresh)
        session.expires_at = dj_timezone.now() + timedelta(seconds=ttl)
        session.last_seen_at = dj_timezone.now()
        session.save(
            update_fields=[
                "refresh_token_hash",
                "expires_at",
                "last_seen_at",
                "device_label",
                "user_agent",
                "ip_address",
            ]
        )
        self.audit.record(
            actor=session.user,
            action="auth.refresh",
            resource_type="session",
            resource_id=str(session.id),
        )
        return session, access, refresh

    def revoke_session(self, *, session: AuthSession, reason: str = "logout", actor=None) -> None:
        if session.revoked_at:
            return
        session.revoked_at = dj_timezone.now()
        session.revoke_reason = reason
        session.save(update_fields=["revoked_at", "revoke_reason"])
        self.audit.record(
            actor=actor or session.user,
            action="auth.logout",
            resource_type="session",
            resource_id=str(session.id),
            metadata={"reason": reason},
        )

    def logout_current(self, *, user: User, session_id: str | None) -> None:
        if not session_id:
            raise ValidationError("No active session on token")
        try:
            session = AuthSession.objects.get(id=session_id, user=user)
        except AuthSession.DoesNotExist as exc:
            raise NotFoundError("Session not found") from exc
        self.revoke_session(session=session, reason="logout", actor=user)

    def logout_all(self, *, user: User) -> int:
        qs = AuthSession.objects.filter(user=user, revoked_at__isnull=True)
        count = qs.count()
        qs.update(revoked_at=dj_timezone.now(), revoke_reason="logout_all")
        self.audit.record(
            actor=user,
            action="auth.logout_all",
            resource_type="user",
            resource_id=str(user.id),
            after={"revoked_sessions": count},
        )
        return count

    def list_sessions(self, *, user: User):
        return AuthSession.objects.filter(user=user).order_by("-last_seen_at")
