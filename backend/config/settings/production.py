"""Production settings."""
from __future__ import annotations

from .base import *  # noqa: F401,F403

DEBUG = False
LOG_FORMAT = "json"
READY_REQUIRE_WORKER = True

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_SSL_REDIRECT = True

# Fail closed if secret is still a known insecure default
_INSECURE = {
    "insecure-dev-key",
    "dev-secret-key-spaceforge-phase-0-1",
    "change-me-in-production-use-long-random-string",
}
if SECRET_KEY in _INSECURE:  # noqa: F405
    raise RuntimeError("DJANGO_SECRET_KEY must be set to a strong value in production")

if JWT_SIGNING_KEY in _INSECURE or JWT_SIGNING_KEY == SECRET_KEY == "insecure-dev-key":  # noqa: F405
    # Allow JWT to equal SECRET_KEY only when SECRET_KEY itself is strong
    pass

_weak_jwt = {
    "dev-jwt-signing-key-spaceforge-phase01-change-me",
    "change-me",
    "spaceforge",
}
if JWT_SIGNING_KEY in _weak_jwt or len(str(JWT_SIGNING_KEY)) < 32:  # noqa: F405
    raise RuntimeError("JWT_SIGNING_KEY must be a strong value (≥32 chars) in production")

if S3_SECRET_KEY in {"spaceforgesecret", "changeme", ""}:  # noqa: F405
    raise RuntimeError("S3_SECRET_KEY must be set to a strong value in production")

# Prefer a dedicated credential key in production (falls back to SECRET_KEY)
if not env("CREDENTIAL_ENCRYPTION_KEY", ""):  # noqa: F405
    import warnings

    warnings.warn(
        "CREDENTIAL_ENCRYPTION_KEY unset — using DJANGO_SECRET_KEY for credential encryption",
        RuntimeWarning,
        stacklevel=1,
    )
