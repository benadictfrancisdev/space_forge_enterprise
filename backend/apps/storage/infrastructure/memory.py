"""In-memory storage provider for unit tests."""
from __future__ import annotations

import hashlib
from typing import Any

from apps.storage.domain.provider import ObjectStorageProvider, StoredObject


class InMemoryObjectStorage(ObjectStorageProvider):
    def __init__(self):
        self._objects: dict[str, tuple[bytes, str, dict[str, str]]] = {}

    def upload(
        self,
        *,
        key: str,
        body: bytes,
        content_type: str = "application/octet-stream",
        metadata: dict[str, str] | None = None,
    ) -> StoredObject:
        meta = metadata or {}
        self._objects[key] = (body, content_type, meta)
        return StoredObject(
            key=key,
            size_bytes=len(body),
            content_type=content_type,
            checksum_sha256=hashlib.sha256(body).hexdigest(),
            metadata=meta,
        )

    def download(self, *, key: str) -> bytes:
        if key not in self._objects:
            raise FileNotFoundError(key)
        return self._objects[key][0]

    def delete(self, *, key: str) -> None:
        self._objects.pop(key, None)

    def exists(self, *, key: str) -> bool:
        return key in self._objects

    def signed_url(self, *, key: str, expires_in: int = 3600, method: str = "get") -> str:
        return f"memory://{key}?expires_in={expires_in}&method={method}"

    def health_check(self) -> dict[str, Any]:
        return {"ok": True, "provider": "memory", "objects": len(self._objects)}
