"""Auth method identifiers for connector credentials."""
from __future__ import annotations

from enum import StrEnum


class AuthMethod(StrEnum):
    NONE = "none"
    PASSWORD = "password"
    API_KEY = "api_key"
    OAUTH2 = "oauth2"
    TOKEN = "token"
