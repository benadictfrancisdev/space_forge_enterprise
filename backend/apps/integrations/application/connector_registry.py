"""Plugin discovery and version resolution for connectors."""
from __future__ import annotations

from apps.core.exceptions import NotFoundError, ValidationError
from apps.integrations.domain.connector import BaseConnector

_REGISTRY: ConnectorRegistry | None = None


class ConnectorRegistry:
    """In-process registry of connector plugins keyed by type + version."""

    def __init__(self) -> None:
        self._plugins: dict[tuple[str, str], BaseConnector] = {}

    def register(self, connector: BaseConnector) -> None:
        key = (connector.connector_type, connector.version)
        if key in self._plugins:
            raise ValidationError(
                f"Connector already registered: {connector.connector_type}@{connector.version}"
            )
        self._plugins[key] = connector

    def get(self, connector_type: str, *, version: str | None = None) -> BaseConnector:
        if version is not None:
            key = (connector_type, version)
            try:
                return self._plugins[key]
            except KeyError as exc:
                raise NotFoundError(
                    f"Connector not found: {connector_type}@{version}"
                ) from exc

        matches = [
            plugin
            for (ctype, _), plugin in self._plugins.items()
            if ctype == connector_type
        ]
        if not matches:
            raise NotFoundError(f"Connector not found: {connector_type}")
        # Prefer highest semver-like string sort when multiple versions exist.
        return max(matches, key=lambda p: p.version)

    def list_types(self) -> list[dict[str, object]]:
        by_type: dict[str, list[BaseConnector]] = {}
        for (ctype, _), plugin in self._plugins.items():
            by_type.setdefault(ctype, []).append(plugin)

        catalog: list[dict[str, object]] = []
        for ctype, plugins in sorted(by_type.items()):
            latest = max(plugins, key=lambda p: p.version)
            caps = latest.capabilities
            catalog.append(
                {
                    "connector_type": ctype,
                    "version": latest.version,
                    "versions": sorted({p.version for p in plugins}),
                    "capabilities": {
                        "supports_full_sync": caps.supports_full_sync,
                        "supports_incremental_sync": caps.supports_incremental_sync,
                        "supports_schema_discovery": caps.supports_schema_discovery,
                        "supports_scheduled_sync": caps.supports_scheduled_sync,
                    },
                    "config_schema": latest.get_config_schema(),
                }
            )
        return catalog

    def clear(self) -> None:
        """Test helper — wipe registered plugins."""
        self._plugins.clear()


def _register_builtins(registry: ConnectorRegistry) -> None:
    from apps.integrations.connectors.csv_connector import CsvConnector
    from apps.integrations.connectors.echo import EchoConnector
    from apps.integrations.connectors.excel_connector import ExcelConnector
    from apps.integrations.connectors.airtable_connector import AirtableConnector
    from apps.integrations.connectors.mongodb_connector import MongoDBConnector
    from apps.integrations.connectors.mysql_connector import MySQLConnector
    from apps.integrations.connectors.postgresql_connector import PostgreSQLConnector
    from apps.integrations.connectors.rest_api_connector import RestApiConnector
    from apps.integrations.connectors.s3_connector import S3Connector
    from apps.integrations.connectors.shopify_connector import ShopifyConnector
    from apps.integrations.connectors.sqlserver_connector import SqlServerConnector

    registry.register(EchoConnector())
    registry.register(CsvConnector())
    registry.register(ExcelConnector())
    registry.register(RestApiConnector())
    registry.register(PostgreSQLConnector())
    registry.register(MySQLConnector())
    registry.register(SqlServerConnector())
    registry.register(MongoDBConnector())
    registry.register(S3Connector())
    registry.register(AirtableConnector())
    registry.register(ShopifyConnector())


def get_connector_registry() -> ConnectorRegistry:
    global _REGISTRY
    if _REGISTRY is None:
        registry = ConnectorRegistry()
        _register_builtins(registry)
        _REGISTRY = registry
    return _REGISTRY


def reset_connector_registry() -> None:
    """Test helper — force re-registration of builtins on next get."""
    global _REGISTRY
    _REGISTRY = None
