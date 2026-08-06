"""Track 7 — DRF rate limiting scopes."""
from __future__ import annotations

from rest_framework.settings import api_settings
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class _SafeRateMixin:
    def get_rate(self):
        rates = getattr(api_settings, "DEFAULT_THROTTLE_RATES", {}) or {}
        if self.scope not in rates:
            return None
        return rates[self.scope]


class AuthExchangeThrottle(_SafeRateMixin, AnonRateThrottle):
    scope = "auth_exchange"


class AuthRefreshThrottle(_SafeRateMixin, AnonRateThrottle):
    scope = "auth_refresh"


class AIComputeThrottle(_SafeRateMixin, UserRateThrottle):
    scope = "ai_compute"


class UploadThrottle(_SafeRateMixin, UserRateThrottle):
    scope = "upload"


class BurstUserThrottle(_SafeRateMixin, UserRateThrottle):
    scope = "burst"
