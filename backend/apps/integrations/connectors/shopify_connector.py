"""shopify — Shopify Admin REST connector."""
from __future__ import annotations

from typing import Any
from urllib.parse import urlparse

import httpx

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._http import flatten_record, rows_to_discovered_schema
from apps.integrations.connectors._saas import (
    extract_inline_records_batch,
    load_inline_records,
    resolve_api_key,
)
from apps.integrations.connectors._sql import serialize_cell
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_API_VERSION = "2024-01"
_RESOURCES = {
    "orders": "orders",
    "products": "products",
    "customers": "customers",
    "inventory_items": "inventory_items",
}


class ShopifyConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "shopify"

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
                "shopDomain": {"type": "string", "title": "Shop domain"},
                "resource": {
                    "type": "string",
                    "enum": list(_RESOURCES.keys()),
                    "default": "orders",
                    "title": "Resource",
                },
                "table_name": {"type": "string", "title": "Logical table name"},
            },
            "required": ["shopDomain", "resource"],
            "additionalProperties": True,
        }

    def _shop_domain(self, config: dict[str, Any]) -> str:
        value = str(config.get("shopDomain") or config.get("shop_domain") or "").strip()
        if not value:
            raise ValidationError("shopDomain is required")
        if value.startswith("http"):
            value = urlparse(value).netloc or value
        return value.removeprefix("https://").removeprefix("http://").strip("/")

    def _resource(self, config: dict[str, Any]) -> str:
        resource = str(config.get("resource") or "orders").strip()
        if resource not in _RESOURCES:
            raise ValidationError(f"Unsupported Shopify resource: {resource}")
        return resource

    def _table_name(self, config: dict[str, Any]) -> str:
        return str(config.get("table_name") or self._resource(config))

    def _headers(self, credentials: dict[str, Any]) -> dict[str, str]:
        token = resolve_api_key(credentials, "adminApiKey", "api_key", "token", "access_token")
        return {"X-Shopify-Access-Token": token, "Content-Type": "application/json"}

    def _normalize_resource_row(self, item: dict[str, Any]) -> dict[str, Any]:
        flat = flatten_record(item)
        return {key: serialize_cell(value) for key, value in flat.items()}

    def _fetch_page(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
        limit: int,
        since_id: str | None = None,
    ) -> tuple[list[dict[str, Any]], str | None]:
        inline = load_inline_records(config)
        if inline is not None:
            return inline, None

        shop = self._shop_domain(config)
        resource = self._resource(config)
        url = f"https://{shop}/admin/api/{_API_VERSION}/{resource}.json"
        params: dict[str, Any] = {"limit": min(limit, 250)}
        if since_id:
            params["since_id"] = since_id

        try:
            with httpx.Client(timeout=30.0, follow_redirects=True) as client:
                response = client.get(url, headers=self._headers(credentials), params=params)
                response.raise_for_status()
                payload = response.json()
        except httpx.HTTPStatusError as exc:
            raise ValidationError(
                f"Shopify HTTP {exc.response.status_code}: {exc.response.text[:200]}"
            ) from exc
        except httpx.HTTPError as exc:
            raise ValidationError(f"Shopify request failed: {exc}") from exc

        items = payload.get(resource) or []
        rows = [self._normalize_resource_row(item) for item in items if isinstance(item, dict)]
        next_since_id = str(rows[-1].get("id")) if rows else None
        has_more = len(rows) >= params["limit"]
        return rows, next_since_id if has_more else None

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        try:
            rows, _ = self._fetch_page(config=config, credentials=credentials, limit=1)
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"Shopify connection failed: {exc}")
        columns = list(rows[0].keys()) if rows else []
        return TestResult(
            ok=True,
            message=f"Shopify reachable ({len(rows)} sample row(s))",
            details={
                "row_count": len(rows),
                "columns": columns,
                "shop": self._shop_domain(config),
                "resource": self._resource(config),
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
        rows, _ = self._fetch_page(config=config, credentials=credentials, limit=50)
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

        since_id = cursor.state.get("since_id")
        rows, next_since_id = self._fetch_page(
            config=config,
            credentials=credentials,
            limit=batch_size,
            since_id=str(since_id) if since_id else None,
        )
        next_state: dict[str, Any] = {}
        if next_since_id:
            next_state["since_id"] = next_since_id
        return ExtractBatch(
            rows=tuple(rows),
            next_cursor=SyncCursor(state=next_state),
            has_more=bool(next_since_id),
            table_name=table_name,
        )
