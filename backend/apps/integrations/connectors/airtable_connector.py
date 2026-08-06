"""airtable — Airtable base table connector."""
from __future__ import annotations

from typing import Any
from urllib.parse import quote

import httpx

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._http import rows_to_discovered_schema
from apps.integrations.connectors._saas import (
    extract_inline_records_batch,
    flatten_airtable_record,
    load_inline_records,
    resolve_api_key,
)
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_AIRTABLE_API = "https://api.airtable.com/v0"


class AirtableConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "airtable"

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
                "baseId": {"type": "string", "title": "Base ID"},
                "tableName": {"type": "string", "title": "Table name"},
                "view": {"type": "string", "title": "View name"},
                "table_name": {"type": "string", "title": "Logical table name"},
            },
            "required": ["baseId", "tableName"],
            "additionalProperties": True,
        }

    def _base_id(self, config: dict[str, Any]) -> str:
        value = str(config.get("baseId") or config.get("base_id") or "").strip()
        if not value:
            raise ValidationError("baseId is required")
        return value

    def _table_name(self, config: dict[str, Any]) -> str:
        return str(
            config.get("table_name")
            or config.get("tableName")
            or config.get("table")
            or "airtable_data"
        )

    def _airtable_table(self, config: dict[str, Any]) -> str:
        value = str(config.get("tableName") or config.get("table") or "").strip()
        if not value:
            raise ValidationError("tableName is required")
        return value

    def _headers(self, credentials: dict[str, Any]) -> dict[str, str]:
        token = resolve_api_key(credentials, "apiKey", "api_key", "token")
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    def _fetch_page(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
        page_size: int,
        offset: str | None = None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        inline = load_inline_records(config)
        if inline is not None:
            return inline, None

        base_id = self._base_id(config)
        table = self._airtable_table(config)
        url = f"{_AIRTABLE_API}/{quote(base_id)}/{quote(table)}"
        params: dict[str, Any] = {"pageSize": page_size}
        if offset:
            params["offset"] = offset
        view = str(config.get("view") or "").strip()
        if view:
            params["view"] = view

        try:
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                response = client.get(url, headers=self._headers(credentials), params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPStatusError as exc:
            raise ValidationError(
                f"Airtable HTTP {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ValidationError(f"Airtable request failed: {exc}") from exc

        records = payload.get("records") or []
        rows = [flatten_airtable_record(record) for record in records if isinstance(record, dict)]
        return rows, payload.get("offset")

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        try:
            rows, _ = self._fetch_page(config=config, credentials=credentials, page_size=1)
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"Airtable connection failed: {exc}")
        columns = list(rows[0].keys()) if rows else []
        return TestResult(
            ok=True,
            message=f"Airtable reachable ({len(rows)} sample record(s))",
            details={
                "row_count": len(rows),
                "columns": columns,
                "base_id": self._base_id(config),
                "table": self._airtable_table(config),
            },
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        inline = load_inline_records(config)
        if inline is not None:
            return rows_to_discovered_schema(table_name=self._table_name(config), rows=inline)
        rows, _ = self._fetch_page(config=config, credentials=credentials, page_size=100)
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
        if batch_size < 1:
            batch_size = 1
        table_name = self._table_name(config)
        inline = load_inline_records(config)
        if inline is not None:
            return extract_inline_records_batch(
                config=config,
                records=inline,
                cursor=cursor,
                mode=mode,
                batch_size=batch_size,
                table_name=table_name,
            )

        offset = cursor.state.get("offset")
        rows, next_offset = self._fetch_page(
            config=config,
            credentials=credentials,
            page_size=batch_size,
            offset=str(offset) if offset else None,
        )
        next_state: dict[str, Any] = {}
        if next_offset:
            next_state["offset"] = next_offset
        return ExtractBatch(
            rows=tuple(rows),
            next_cursor=SyncCursor(state=next_state),
            has_more=bool(next_offset),
            table_name=table_name,
        )
