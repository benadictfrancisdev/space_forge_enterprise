"""csv — file-backed connector (storage object or inline test payload)."""
from __future__ import annotations

from typing import Any

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import (
    as_bool,
    load_bytes,
    parse_csv_rows,
    rows_to_schema,
    slice_rows,
)
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_DEFAULT_TABLE = "csv_data"


class CsvConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "csv"

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
                "storage_object_id": {
                    "type": "string",
                    "format": "uuid",
                    "title": "Storage object ID",
                    "description": "Uploaded CSV file in SpaceForge storage",
                },
                "has_header": {"type": "boolean", "default": True, "title": "First row is header"},
                "delimiter": {"type": "string", "default": ",", "title": "Delimiter"},
                "encoding": {"type": "string", "default": "utf-8", "title": "Encoding"},
                "table_name": {"type": "string", "default": _DEFAULT_TABLE, "title": "Logical table name"},
            },
            "additionalProperties": True,
        }

    def _load_rows(self, config: dict[str, Any], credentials: dict[str, Any]):
        raw = load_bytes(config=config, credentials=credentials)
        encoding = str(config.get("encoding") or "utf-8")
        delimiter = str(config.get("delimiter") or ",")
        has_header = as_bool(config.get("has_header"), True)
        if len(delimiter) != 1:
            raise ValidationError("delimiter must be a single character")
        return parse_csv_rows(
            raw, encoding=encoding, delimiter=delimiter, has_header=has_header
        )

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        try:
            headers, rows = self._load_rows(config, credentials)
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"CSV read failed: {exc}")
        return TestResult(
            ok=True,
            message=f"CSV readable ({len(rows)} data rows, {len(headers)} columns)",
            details={"row_count": len(rows), "column_count": len(headers), "columns": headers},
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        headers, rows = self._load_rows(config, credentials)
        table_name = str(config.get("table_name") or _DEFAULT_TABLE)
        return rows_to_schema(
            table_name=table_name,
            headers=headers,
            sample_rows=rows[:50],
            row_estimate=len(rows),
        )

    def extract(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
        cursor: SyncCursor,
        mode: SyncMode,
        batch_size: int = 100,
    ) -> ExtractBatch:
        _ = mode
        headers, rows = self._load_rows(config, credentials)
        _ = headers
        offset = int(cursor.state.get("offset", 0))
        chunk, next_offset, has_more = slice_rows(rows, offset=offset, batch_size=batch_size)
        table_name = str(config.get("table_name") or _DEFAULT_TABLE)
        return ExtractBatch(
            rows=tuple(chunk),
            next_cursor=SyncCursor(state={"offset": next_offset}),
            has_more=has_more,
            table_name=table_name,
        )
