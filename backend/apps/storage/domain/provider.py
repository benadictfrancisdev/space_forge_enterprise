"""Object storage provider abstraction — swap S3/MinIO/local without domain changes."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class StoredObject:
    key: str
    size_bytes: int
    content_type: str
    checksum_sha256: str
    metadata: dict[str, str]


class ObjectStorageProvider(ABC):
    """Provider interface for S3-compatible (and future) backends."""

    @abstractmethod
    def upload(
        self,
        *,
        key: str,
        body: bytes,
        content_type: str = "application/octet-stream",
        metadata: dict[str, str] | None = None,
    ) -> StoredObject:
        raise NotImplementedError

    @abstractmethod
    def download(self, *, key: str) -> bytes:
        raise NotImplementedError

    @abstractmethod
    def delete(self, *, key: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def exists(self, *, key: str) -> bool:
        raise NotImplementedError

    @abstractmethod
    def signed_url(self, *, key: str, expires_in: int = 3600, method: str = "get") -> str:
        raise NotImplementedError

    @abstractmethod
    def health_check(self) -> dict[str, Any]:
        raise NotImplementedError
