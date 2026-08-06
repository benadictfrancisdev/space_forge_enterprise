"""Test settings — SQLite, eager Celery, locmem cache, in-memory storage."""
from __future__ import annotations

from .base import *  # noqa: F401,F403

DEBUG = True
SECRET_KEY = "test-secret-key-spaceforge-phase-011"
AUTH_MODE = "dev"
JWT_SIGNING_KEY = "test-jwt-signing-key-spaceforge-32b"
STORAGE_BACKEND = "memory"
READY_REQUIRE_WORKER = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "spaceforge-test",
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

AI_SERVICE_MODE = "inline"
AI_SERVICE_URL = ""

PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Track 7 — avoid throttle noise in unit tests
REST_FRAMEWORK = {
    **REST_FRAMEWORK,  # noqa: F405
    "DEFAULT_THROTTLE_CLASSES": [],
    "DEFAULT_THROTTLE_RATES": {},
}

S3_ENDPOINT_URL = "http://localhost:9000"
S3_BUCKET = "test-bucket"

MIDDLEWARE = [m for m in MIDDLEWARE if "WhiteNoise" not in m]  # noqa: F405
LOG_FORMAT = "console"
