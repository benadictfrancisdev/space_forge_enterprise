"""Identity providers — Firebase bridge + enterprise JWT."""
from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
import jwt
from django.conf import settings

from apps.core.exceptions import AuthenticationError

logger = logging.getLogger("spaceforge.identity")

_JWKS_CACHE: dict[str, Any] = {}


@dataclass(frozen=True)
class IdentityClaims:
    subject: str
    email: str
    provider: str
    raw: dict[str, Any]


class IdentityProvider(ABC):
    @abstractmethod
    def verify(self, token: str) -> IdentityClaims:
        raise NotImplementedError


class DevIdentityProvider(IdentityProvider):
    """
    Development / test provider.
    Accepts unsigned or HS256 tokens with claims: sub, email.
    Also accepts opaque tokens shaped as: dev:<user_id>:<email>
    """

    def verify(self, token: str) -> IdentityClaims:
        if token.startswith("dev:"):
            parts = token.split(":", 2)
            if len(parts) != 3:
                raise AuthenticationError("Invalid dev token format")
            _, subject, email = parts
            return IdentityClaims(subject=subject, email=email, provider="dev", raw={})

        try:
            payload = jwt.decode(
                token,
                settings.JWT_SIGNING_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"verify_aud": False},
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid token") from exc

        email = payload.get("email")
        subject = payload.get("sub") or payload.get("user_id")
        if not email or not subject:
            raise AuthenticationError("Token missing required claims")
        return IdentityClaims(subject=str(subject), email=str(email), provider="dev", raw=payload)


class FirebaseIdentityProvider(IdentityProvider):
    """Verifies Firebase ID tokens via Google JWKS."""

    JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"

    def verify(self, token: str) -> IdentityClaims:
        project_id = settings.FIREBASE_PROJECT_ID
        if not project_id:
            raise AuthenticationError("FIREBASE_PROJECT_ID is not configured")

        try:
            header = jwt.get_unverified_header(token)
            kid = header.get("kid")
            key = self._get_key(kid)
            payload = jwt.decode(
                token,
                key=key,
                algorithms=["RS256"],
                audience=project_id,
                issuer=f"https://securetoken.google.com/{project_id}",
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid Firebase token") from exc

        email = payload.get("email")
        subject = payload.get("sub") or payload.get("user_id")
        if not email or not subject:
            raise AuthenticationError("Firebase token missing email/sub")
        return IdentityClaims(subject=str(subject), email=str(email), provider="firebase", raw=payload)

    def _get_key(self, kid: str | None):
        if not kid:
            raise AuthenticationError("Firebase token missing kid")
        jwks = self._fetch_jwks()
        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == kid:
                return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
        _JWKS_CACHE.clear()
        jwks = self._fetch_jwks()
        for key_data in jwks.get("keys", []):
            if key_data.get("kid") == kid:
                return jwt.algorithms.RSAAlgorithm.from_jwk(key_data)
        raise AuthenticationError("Firebase signing key not found")

    def _fetch_jwks(self) -> dict[str, Any]:
        if "jwks" in _JWKS_CACHE:
            return _JWKS_CACHE["jwks"]
        response = httpx.get(self.JWKS_URL, timeout=10.0)
        response.raise_for_status()
        data = response.json()
        _JWKS_CACHE["jwks"] = data
        return data


class SpaceForgeTokenService:
    """Issues short-lived SpaceForge access JWTs after identity verification."""

    def issue(self, *, user_id: str, email: str, organization_id: str | None = None) -> str:
        """Legacy helper — prefer SessionService for enterprise sessions."""
        now = datetime.now(timezone.utc)
        payload: dict[str, Any] = {
            "sub": str(user_id),
            "email": email,
            "iat": now,
            "exp": now + timedelta(seconds=settings.JWT_ACCESS_TTL_SECONDS),
            "iss": "spaceforge",
            "typ": "access",
        }
        if organization_id:
            payload["org_id"] = str(organization_id)
        return jwt.encode(payload, settings.JWT_SIGNING_KEY, algorithm=settings.JWT_ALGORITHM)

    def decode_access(self, token: str) -> dict[str, Any]:
        try:
            payload = jwt.decode(
                token,
                settings.JWT_SIGNING_KEY,
                algorithms=[settings.JWT_ALGORITHM],
                options={"require": ["exp", "sub", "email"]},
            )
        except jwt.PyJWTError as exc:
            raise AuthenticationError("Invalid access token") from exc
        if payload.get("iss") and payload.get("iss") != "spaceforge":
            raise AuthenticationError("Invalid access token issuer")
        if payload.get("typ") and payload.get("typ") != "access":
            raise AuthenticationError("Token is not an access token")
        return payload


def get_identity_provider() -> IdentityProvider:
    mode = (settings.AUTH_MODE or "dev").lower()
    if mode == "firebase":
        return FirebaseIdentityProvider()
    return DevIdentityProvider()
