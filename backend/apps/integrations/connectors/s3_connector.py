"""aws_s3 — S3-compatible object storage file connector."""
from __future__ import annotations

from typing import Any

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._cloud_storage import (
    detect_file_type,
    download_s3_object_bytes,
    head_s3_object,
    parse_object_rows,
    resolve_s3_settings,
)
from apps.integrations.connectors._files import rows_to_schema, slice_rows
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_DEFAULT_TABLE = "s3_data"


class S3Connector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "aws_s3"

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
                "bucket": {"type": "string", "title": "Bucket"},
                "key": {"type": "string", "title": "Object key"},
                "region": {"type": "string", "default": "us-east-1", "title": "Region"},
                "endpoint_url": {
                    "type": "string",
                    "title": "Endpoint URL",
                    "description": "Optional S3-compatible endpoint (MinIO, etc.)",
                },
                "fileType": {
                    "type": "string",
                    "enum": ["csv", "json", "jsonl"],
                    "default": "csv",
                    "title": "File type",
                },
                "json_path": {
                    "type": "string",
                    "title": "JSON path",
                    "description": "Dot path for JSON arrays, e.g. data.items",
                },
                "table_name": {"type": "string", "default": _DEFAULT_TABLE, "title": "Logical table name"},
                "delimiter": {"type": "string", "default": ",", "title": "CSV delimiter"},
                "has_header": {"type": "boolean", "default": True, "title": "CSV header row"},
            },
            "required": ["bucket", "key"],
            "additionalProperties": True,
        }

    def _table_name(self, config: dict[str, Any]) -> str:
        explicit = str(config.get("table_name") or "").strip()
        if explicit:
            return explicit
        key = str(config.get("key") or config.get("object_key") or "").strip()
        if key:
            filename = key.rsplit("/", 1)[-1]
            if "." in filename:
                return filename.rsplit(".", 1)[0]
            return filename
        return _DEFAULT_TABLE

    def _load_rows(self, config: dict[str, Any], credentials: dict[str, Any]):
        raw = download_s3_object_bytes(config=config, credentials=credentials)
        return parse_object_rows(raw, config=config)

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        try:
            if config.get("inline_text") is not None or config.get("inline_b64"):
                headers, rows = self._load_rows(config, credentials)
            else:
                meta = head_s3_object(config=config, credentials=credentials)
                headers, rows = self._load_rows(config, credentials)
                _ = meta
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"S3 read failed: {exc}")

        settings = resolve_s3_settings(config, credentials)
        return TestResult(
            ok=True,
            message=f"S3 object readable ({len(rows)} rows, type={detect_file_type(config)})",
            details={
                "row_count": len(rows),
                "column_count": len(headers),
                "columns": headers,
                "bucket": settings.get("bucket"),
                "key": settings.get("key"),
                "file_type": detect_file_type(config),
            },
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        headers, rows = self._load_rows(config, credentials)
        return rows_to_schema(
            table_name=self._table_name(config),
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
        return ExtractBatch(
            rows=tuple(chunk),
            next_cursor=SyncCursor(state={"offset": next_offset}),
            has_more=has_more,
            table_name=self._table_name(config),
        )
