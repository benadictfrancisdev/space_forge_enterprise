"""Base Django settings for SpaceForge Enterprise Backend."""
from __future__ import annotations

import os
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from corsheaders.defaults import default_headers

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def env(key: str, default: str | None = None) -> str | None:
    return os.environ.get(key, default)


def env_bool(key: str, default: bool = False) -> bool:
    value = os.environ.get(key)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def env_list(key: str, default: str = "") -> list[str]:
    raw = os.environ.get(key, default)
    return [item.strip() for item in raw.split(",") if item.strip()]


SECRET_KEY = env("DJANGO_SECRET_KEY", "insecure-dev-key")
DEBUG = env_bool("DJANGO_DEBUG", False)
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party
    "rest_framework",
    "django_filters",
    "corsheaders",
    "drf_spectacular",
    "django_celery_beat",
    "django_celery_results",
    # Domains
    "apps.core",
    "apps.identity",
    "apps.organizations",
    "apps.workspaces",
    "apps.memberships",
    "apps.permissions",
    "apps.storage",
    "apps.datasets",
    "apps.notifications",
    "apps.jobs",
    "apps.events",
    "apps.audit",
    "apps.billing",
    "apps.platform",
    "apps.api",
    "apps.ai",
    "apps.integrations",
    "apps.data_platform",
    "apps.metadata",
    "apps.quality",
    "apps.business_rules",
    "apps.analytics",
    "apps.intelligence",
    "apps.ai_platform",
    "apps.query_compute",
    "apps.governance",
    "apps.enterprise_services",
    "apps.enterprise_applications",
    "apps.telemetry",
]

MIDDLEWARE = [
    "apps.core.middleware.TraceIdMiddleware",
    "apps.core.middleware.ErrorHandlingMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "apps.core.middleware.SecurityHeadersMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "apps.identity.middleware.TenantContextMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "apps.core.middleware.RequestLoggingMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

# Database
_database_url = env("DATABASE_URL", f"sqlite:///{BASE_DIR / 'db.sqlite3'}")
_parsed = urlparse(_database_url or "")
if _parsed.scheme.startswith("postgres"):
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": _parsed.path.lstrip("/") or "spaceforge",
            "USER": _parsed.username or "",
            "PASSWORD": _parsed.password or "",
            "HOST": _parsed.hostname or "",
            "PORT": str(_parsed.port or 5432),
            "CONN_MAX_AGE": 60,
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }

AUTH_USER_MODEL = "identity.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS: list = []
# Avoid WhiteNoise warning when staticfiles/ is absent in local/test.
WHITENOISE_AUTOREFRESH = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = env_list(
    "DJANGO_CORS_ALLOWED_ORIGINS",
    "http://localhost:8080,http://localhost:5173,http://localhost:3000",
)
CORS_ALLOW_CREDENTIALS = True

CORS_ALLOW_HEADERS = (
    *default_headers,
    "x-organization-id",
    "x-workspace-id",
    "x-platform-retry-401",
)

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "apps.identity.authentication.SpaceForgeAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "apps.api.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
        "rest_framework.filters.OrderingFilter",
        "rest_framework.filters.SearchFilter",
    ],
    "DEFAULT_PAGINATION_CLASS": "apps.api.pagination.StandardPagination",
    "PAGE_SIZE": 25,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "EXCEPTION_HANDLER": "apps.api.exceptions.spaceforge_exception_handler",
    "DEFAULT_RENDERER_CLASSES": [
        "apps.api.renderers.EnvelopeJSONRenderer",
    ],
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "120/min",
        "user": "600/min",
        "burst": "120/min",
        "auth_exchange": "20/min",
        "auth_refresh": "60/min",
        "ai_compute": "60/min",
        "upload": "30/min",
    },
}

SPECTACULAR_SETTINGS = {
    "TITLE": "SpaceForge Enterprise API",
    "DESCRIPTION": "Phase 0.1 Backend Foundation",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

# Auth / JWT
AUTH_MODE = env("AUTH_MODE", "dev")  # dev | firebase
FIREBASE_PROJECT_ID = env("FIREBASE_PROJECT_ID", "")
JWT_SIGNING_KEY = env("JWT_SIGNING_KEY", SECRET_KEY) or SECRET_KEY
if len(JWT_SIGNING_KEY) < 32:
    JWT_SIGNING_KEY = (JWT_SIGNING_KEY + "spaceforge-padding-key-32b")[:48]
JWT_ACCESS_TTL_SECONDS = int(env("JWT_ACCESS_TTL_SECONDS", "3600") or "3600")
JWT_REFRESH_TTL_SECONDS = int(env("JWT_REFRESH_TTL_SECONDS", str(60 * 60 * 24 * 14)) or str(60 * 60 * 24 * 14))
JWT_ALGORITHM = "HS256"

# Credential encryption (Track 11.2) — falls back to SECRET_KEY when unset
CREDENTIAL_ENCRYPTION_KEY = env("CREDENTIAL_ENCRYPTION_KEY", "") or SECRET_KEY

# Upload / request size limits (Track 7)
DATA_UPLOAD_MAX_MEMORY_SIZE = int(env("DATA_UPLOAD_MAX_MEMORY_SIZE", str(25 * 1024 * 1024)) or str(25 * 1024 * 1024))
FILE_UPLOAD_MAX_MEMORY_SIZE = int(env("FILE_UPLOAD_MAX_MEMORY_SIZE", str(25 * 1024 * 1024)) or str(25 * 1024 * 1024))
DATA_UPLOAD_MAX_NUMBER_FIELDS = int(env("DATA_UPLOAD_MAX_NUMBER_FIELDS", "1000") or "1000")

# Redis / Celery
REDIS_URL = env("REDIS_URL", "redis://localhost:6379/0")
CELERY_BROKER_URL = env("CELERY_BROKER_URL", "redis://localhost:6379/1")
CELERY_RESULT_BACKEND = env("CELERY_RESULT_BACKEND", REDIS_URL)
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"
CELERY_TIMEZONE = TIME_ZONE
CELERY_TASK_TRACK_STARTED = True
CELERY_RESULT_EXTENDED = True
CELERY_TASK_ACKS_LATE = True
CELERY_WORKER_PREFETCH_MULTIPLIER = 1
CELERY_TASK_DEFAULT_RETRY_DELAY = 30
CELERY_TASK_SOFT_TIME_LIMIT = 300
CELERY_TASK_TIME_LIMIT = 360
CELERY_BEAT_SCHEDULE = {
    "worker-heartbeat-every-30s": {
        "task": "workers.worker_heartbeat",
        "schedule": 30.0,
    },
    "publish-outbox-every-60s": {
        "task": "workers.publish_outbox_events",
        "schedule": 60.0,
    },
    "executive-brief-schedules-hourly": {
        "task": "workers.run_scheduled_executive_briefs",
        "schedule": 3600.0,
    },
    "scheduled-reports-hourly": {
        "task": "workers.run_scheduled_reports",
        "schedule": 3600.0,
    },
}

CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.redis.RedisCache",
        "LOCATION": REDIS_URL,
    }
}

# Cache-backed sessions for horizontal scale readiness
SESSION_ENGINE = "django.contrib.sessions.backends.cache"
SESSION_CACHE_ALIAS = "default"

# Object storage
STORAGE_BACKEND = env("STORAGE_BACKEND", "s3")  # s3 | memory
S3_ENDPOINT_URL = env("S3_ENDPOINT_URL", "http://localhost:9000")
S3_ACCESS_KEY = env("S3_ACCESS_KEY", "spaceforge")
S3_SECRET_KEY = env("S3_SECRET_KEY", "spaceforgesecret")
S3_BUCKET = env("S3_BUCKET", "spaceforge")
S3_REGION = env("S3_REGION", "us-east-1")
S3_USE_SSL = env_bool("S3_USE_SSL", False)

# Readiness: require Celery worker heartbeat (disable for api-only local)
READY_REQUIRE_WORKER = env_bool("READY_REQUIRE_WORKER", True)

# Track 5 — AI compute service (FastAPI). inline = import engines; http = call AI_SERVICE_URL
AI_SERVICE_MODE = env("AI_SERVICE_MODE", "inline")  # inline | http
AI_SERVICE_URL = env("AI_SERVICE_URL", "http://localhost:8100")
AI_SERVICE_TIMEOUT_SECONDS = int(env("AI_SERVICE_TIMEOUT_SECONDS", "60") or "60")

# Logging
LOG_LEVEL = env("LOG_LEVEL", "INFO")
LOG_FORMAT = env("LOG_FORMAT", "json")

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "json": {
            "()": "apps.core.logging.JSONFormatter",
        },
        "console": {
            "format": "%(asctime)s %(levelname)s [%(name)s] [trace=%(trace_id)s] %(message)s",
        },
    },
    "filters": {
        "trace_id": {
            "()": "apps.core.logging.TraceIdFilter",
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "json" if LOG_FORMAT == "json" else "console",
            "filters": ["trace_id"],
        },
    },
    "root": {
        "handlers": ["console"],
        "level": LOG_LEVEL,
    },
    "loggers": {
        "django.request": {"level": "WARNING", "propagate": True},
        "spaceforge": {"level": LOG_LEVEL, "propagate": False, "handlers": ["console"]},
    },
}
