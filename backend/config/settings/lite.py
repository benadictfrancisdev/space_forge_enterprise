"""Lite local settings — no Docker required (SQLite + locmem + memory storage).

Use for Windows host testing when Docker Desktop is unavailable:
  set DJANGO_SETTINGS_MODULE=config.settings.lite
  python manage.py migrate
  python manage.py seed_platform
  python manage.py runserver 8000
"""
from __future__ import annotations

from pathlib import Path

from .base import *  # noqa: F401,F403

DEBUG = True
SECRET_KEY = env("DJANGO_SECRET_KEY", "lite-dev-secret-key-spaceforge-local-32")  # noqa: F405
AUTH_MODE = env("AUTH_MODE", "dev")  # noqa: F405
JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", "lite-jwt-signing-key-spaceforge-32b")  # noqa: F405
STORAGE_BACKEND = "memory"
READY_REQUIRE_WORKER = False
CORS_ALLOWED_ORIGINS = env_list(  # noqa: F405
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:8080,http://localhost:5173,http://localhost:3000",
)

_db_path = Path(BASE_DIR) / "lite_db.sqlite3"  # noqa: F405
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(_db_path),
    }
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        "LOCATION": "spaceforge-lite",
    }
}

SESSION_ENGINE = "django.contrib.sessions.backends.cache"

CELERY_TASK_ALWAYS_EAGER = True
CELERY_TASK_EAGER_PROPAGATES = True

AI_SERVICE_MODE = "inline"
AI_SERVICE_URL = ""

LOG_FORMAT = "console"
