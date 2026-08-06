"""Base connector plugin contract — mirrors ObjectStorageProvider pattern."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode


@dataclass(frozen=True)
class ConnectorCapabilities:
    supports_full_sync: bool = True
    supports_incremental_sync: bool = False
    supports_schema_discovery: bool = True
    supports_scheduled_sync: bool = False


@dataclass(frozen=True)
class TestResult:
    ok: bool
    message: str = ""
    details: dict[str, Any] | None = None


class BaseConnector(ABC):
    """Strategy plugin interface for enterprise data sources.

    Connectors answer: Can I connect? What schema exists? Give me the next batch.
    The platform owns credentials, jobs, datasets, audit, and retries.
    """

    @property
    @abstractmethod
    def connector_type(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def version(self) -> str:
        raise NotImplementedError

    @property
    @abstractmethod
    def capabilities(self) -> ConnectorCapabilities:
        raise NotImplementedError

    @abstractmethod
    def get_config_schema(self) -> dict[str, Any]:
        """JSON Schema for non-secret connection config (UI form builder)."""
        raise NotImplementedError

    @abstractmethod
    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        raise NotImplementedError

    @abstractmethod
    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        raise NotImplementedError

    @abstractmethod
    def extract(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
        cursor: SyncCursor,
        mode: SyncMode,
        batch_size: int = 100,
    ) -> ExtractBatch:
        raise NotImplementedError
