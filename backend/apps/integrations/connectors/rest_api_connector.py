"""rest_api — JSON REST/HTTP API connector."""
from __future__ import annotations

from typing import Any

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import slice_rows
from apps.integrations.connectors._http import (
    json_path_key,
    navigate_json_path,
    request_json,
    rows_to_discovered_schema,
)
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_DEFAULT_TABLE = "rest_data"


class RestApiConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "rest_api"

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
                "url": {
                    "type": "string",
                    "format": "uri",
                    "title": "API URL",
                },
                "method": {
                    "type": "string",
                    "enum": ["GET", "POST"],
                    "default": "GET",
                    "title": "HTTP method",
                },
                "headers": {
                    "type": "object",
                    "title": "Extra headers",
                    "description": "JSON object or string",
                },
                "body": {
                    "type": "string",
                    "title": "Request body (POST)",
                },
                "json_path": {
                    "type": "string",
                    "title": "Path to data array",
                    "description": "Dot-separated path, e.g. data.items",
                },
                "table_name": {
                    "type": "string",
                    "default": _DEFAULT_TABLE,
                    "title": "Logical table name",
                },
                "pagination_style": {
                    "type": "string",
                    "enum": ["none", "offset"],
                    "default": "none",
                    "title": "Pagination",
                },
                "offset_param": {
                    "type": "string",
                    "default": "offset",
                    "title": "Offset query param",
                },
                "limit_param": {
                    "type": "string",
                    "default": "limit",
                    "title": "Limit query param",
                },
                "auth_style": {
                    "type": "string",
                    "enum": ["bearer", "header"],
                    "default": "bearer",
                    "title": "API key style",
                },
            },
            "additionalProperties": True,
        }

    def _table_name(self, config: dict[str, Any]) -> str:
        return str(config.get("table_name") or _DEFAULT_TABLE)

    def _load_rows(
        self,
        config: dict[str, Any],
        credentials: dict[str, Any],
        *,
        offset: int | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        pagination_style = str(config.get("pagination_style") or "none").lower()
        query_params: dict[str, Any] = {}
        if pagination_style == "offset" and limit is not None:
            offset_param = str(config.get("offset_param") or "offset")
            limit_param = str(config.get("limit_param") or "limit")
            query_params[offset_param] = offset or 0
            query_params[limit_param] = limit

        payload = request_json(
            config=config,
            credentials=credentials,
            query_params=query_params,
        )
        return navigate_json_path(payload, json_path_key(config))

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        try:
            rows = self._load_rows(config, credentials, offset=0, limit=1)
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"REST request failed: {exc}")

        columns = list(rows[0].keys()) if rows else []
        return TestResult(
            ok=True,
            message=f"REST API reachable ({len(rows)} sample row(s))",
            details={
                "row_count": len(rows),
                "columns": columns,
            },
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        rows = self._load_rows(config, credentials)
        return rows_to_discovered_schema(table_name=self._table_name(config), rows=rows)

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
        pagination_style = str(config.get("pagination_style") or "none").lower()
        table_name = self._table_name(config)

        if pagination_style == "offset":
            offset = int(cursor.state.get("offset", 0))
            rows = self._load_rows(
                config,
                credentials,
                offset=offset,
                limit=batch_size,
            )
            has_more = len(rows) >= batch_size
            next_offset = offset + len(rows)
            return ExtractBatch(
                rows=tuple(rows),
                next_cursor=SyncCursor(state={"offset": next_offset}),
                has_more=has_more,
                table_name=table_name,
            )

        offset = int(cursor.state.get("offset", 0))
        all_rows = self._load_rows(config, credentials)
        chunk, next_offset, has_more = slice_rows(all_rows, offset=offset, batch_size=batch_size)
        return ExtractBatch(
            rows=tuple(chunk),
            next_cursor=SyncCursor(state={"offset": next_offset}),
            has_more=has_more,
            table_name=table_name,
        )
