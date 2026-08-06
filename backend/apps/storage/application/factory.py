"""Factory for object storage providers."""
from __future__ import annotations

from django.conf import settings

from apps.storage.domain.provider import ObjectStorageProvider
from apps.storage.infrastructure.memory import InMemoryObjectStorage
from apps.storage.infrastructure.s3 import S3ObjectStorage

_MEMORY_SINGLETON: InMemoryObjectStorage | None = None


def get_object_storage() -> ObjectStorageProvider:
    backend = (getattr(settings, "STORAGE_BACKEND", "s3") or "s3").lower()
    if backend in {"memory", "inmemory", "test"}:
        global _MEMORY_SINGLETON
        if _MEMORY_SINGLETON is None:
            _MEMORY_SINGLETON = InMemoryObjectStorage()
        return _MEMORY_SINGLETON
    return S3ObjectStorage()
