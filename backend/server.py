"""ASGI entrypoint shim so supervisor's `uvicorn server:app` serves Django.

Preview/pod runs Django in lite mode (SQLite + locmem + in-memory storage,
eager Celery, inline AI compute) — no Docker/Postgres/Redis required.
"""
from __future__ import annotations

import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.lite")
os.environ.setdefault("AUTH_MODE", "dev")

from config.asgi import application as app  # noqa: E402

__all__ = ["app"]
