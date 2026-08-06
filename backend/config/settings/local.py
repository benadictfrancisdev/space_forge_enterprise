"""Local development settings."""
from __future__ import annotations

from .base import *  # noqa: F401,F403

DEBUG = True
LOG_FORMAT = env("LOG_FORMAT", "console")  # noqa: F405
READY_REQUIRE_WORKER = env_bool("READY_REQUIRE_WORKER", False)  # noqa: F405
