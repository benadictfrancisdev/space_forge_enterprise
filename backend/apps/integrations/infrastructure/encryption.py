"""Fernet encryption for credential secret payloads."""
from __future__ import annotations

import base64
import hashlib
import json
from typing import Any

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings

from apps.core.exceptions import ValidationError

CURRENT_KEY_VERSION = 1


def _derive_fernet_key(secret: str) -> bytes:
    """Derive a url-safe 32-byte Fernet key from an arbitrary secret string."""
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _fernet() -> Fernet:
    raw = getattr(settings, "CREDENTIAL_ENCRYPTION_KEY", None) or settings.SECRET_KEY
    if not raw:
        raise ValidationError("Credential encryption key is not configured")
    return Fernet(_derive_fernet_key(str(raw)))


def encrypt_payload(payload: dict[str, Any]) -> bytes:
    if not isinstance(payload, dict):
        raise ValidationError("Credential payload must be an object")
    if not payload:
        raise ValidationError("Credential payload must not be empty")
    return _fernet().encrypt(json.dumps(payload, separators=(",", ":")).encode("utf-8"))


def decrypt_payload(blob: bytes) -> dict[str, Any]:
    if not blob:
        raise ValidationError("Credential payload is missing")
    try:
        raw = _fernet().decrypt(bytes(blob))
    except InvalidToken as exc:
        raise ValidationError("Credential payload could not be decrypted") from exc
    data = json.loads(raw.decode("utf-8"))
    if not isinstance(data, dict):
        raise ValidationError("Decrypted credential payload is invalid")
    return data
