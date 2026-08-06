"""platform.echo — certification stub with no network I/O."""
from __future__ import annotations

from typing import Any

from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import (
    DiscoveredColumn,
    DiscoveredSchema,
    DiscoveredTable,
)
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_ECHO_TABLE = "echo_items"
_DEFAULT_ROW_COUNT = 5


class EchoConnector(BaseConnector):
    """Deterministic fake source for framework / job lifecycle certification."""

    @property
    def connector_type(self) -> str:
        return "platform.echo"

    @property
    def version(self) -> str:
        return "1.0.0"

    @property
    def capabilities(self) -> ConnectorCapabilities:
        return ConnectorCapabilities(
            supports_full_sync=True,
            supports_incremental_sync=True,
            supports_schema_discovery=True,
            supports_scheduled_sync=False,
        )

    def get_config_schema(self) -> dict[str, Any]:
        return {
            "type": "object",
            "properties": {
                "message": {
                    "type": "string",
                    "title": "Echo message",
                    "default": "hello",
                },
                "row_count": {
                    "type": "integer",
                    "title": "Fake row count",
                    "minimum": 0,
                    "maximum": 1000,
                    "default": _DEFAULT_ROW_COUNT,
                },
            },
            "additionalProperties": False,
        }

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        _ = credentials
        message = str(config.get("message") or "hello")
        return TestResult(
            ok=True,
            message="Echo connector reachable",
            details={"echo": message},
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        _ = credentials
        row_count = int(config.get("row_count", _DEFAULT_ROW_COUNT))
        table = DiscoveredTable(
            name=_ECHO_TABLE,
            columns=(
                DiscoveredColumn(name="id", data_type="integer", nullable=False, is_primary_key=True),
                DiscoveredColumn(name="message", data_type="string", nullable=False),
                DiscoveredColumn(name="seq", data_type="integer", nullable=False),
            ),
            primary_key=("id",),
            row_estimate=row_count,
        )
        return DiscoveredSchema(tables=(table,), metadata={"connector": self.connector_type})

    def extract(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
        cursor: SyncCursor,
        mode: SyncMode,
        batch_size: int = 100,
    ) -> ExtractBatch:
        _ = credentials
        _ = mode
        total = int(config.get("row_count", _DEFAULT_ROW_COUNT))
        message = str(config.get("message") or "hello")
        offset = int(cursor.state.get("offset", 0))
        if batch_size < 1:
            batch_size = 1

        end = min(offset + batch_size, total)
        rows = tuple(
            {"id": i + 1, "message": message, "seq": i}
            for i in range(offset, end)
        )
        next_offset = end
        has_more = next_offset < total
        return ExtractBatch(
            rows=rows,
            next_cursor=SyncCursor(state={"offset": next_offset}),
            has_more=has_more,
            table_name=_ECHO_TABLE,
        )
