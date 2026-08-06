"""sqlserver — Microsoft SQL Server table connector via pymssql."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import pymssql

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._sql import (
    default_schema_for_config,
    discover_inline_schema,
    extract_inline_table_batch,
    inline_test_result,
    load_inline_rows,
    parse_table_reference,
    quote_column,
    quote_qualified_table,
    resolve_db_params,
    resolve_incremental_column,
    resolve_order_column,
    rows_to_discovered_schema,
    serialize_cell,
)
from apps.integrations.domain.connector import (
    BaseConnector,
    ConnectorCapabilities,
    TestResult,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode

_DIALECT = "sqlserver"


class SqlServerConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "sqlserver"

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
                "host": {"type": "string", "title": "Host"},
                "port": {"type": "integer", "default": 1433, "title": "Port"},
                "database": {"type": "string", "title": "Database"},
                "table": {
                    "type": "string",
                    "title": "Table",
                    "description": "schema.table or table (default schema: dbo)",
                },
                "order_by": {"type": "string", "title": "ORDER BY column"},
                "incremental_column": {"type": "string", "title": "Incremental cursor column"},
            },
            "required": ["host", "database", "table"],
            "additionalProperties": True,
        }

    def _default_schema(self, config: dict[str, Any]) -> str:
        return default_schema_for_config(config, fallback="dbo")

    def _table_label(self, config: dict[str, Any]) -> str:
        schema, table = parse_table_reference(
            str(config.get("table") or ""),
            default_schema=self._default_schema(config),
        )
        return f"{schema}.{table}"

    def _connect(self, config: dict[str, Any], credentials: dict[str, Any]):
        params = resolve_db_params(
            config, credentials, default_port=1433, default_database="master"
        )
        return pymssql.connect(
            server=params["host"],
            port=params["port"],
            user=params["user"],
            password=params["password"],
            database=params["dbname"],
            login_timeout=int(config.get("connect_timeout") or 15),
        )

    @contextmanager
    def _connection(self, config: dict[str, Any], credentials: dict[str, Any]) -> Iterator[Any]:
        conn = self._connect(config, credentials)
        try:
            yield conn
        finally:
            conn.close()

    def _table_parts(self, config: dict[str, Any]) -> tuple[str, str]:
        return parse_table_reference(
            str(config.get("table") or ""),
            default_schema=self._default_schema(config),
        )

    def _fetch_columns_meta(
        self,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> list[dict[str, Any]]:
        schema, table = self._table_parts(config)
        query = """
            SELECT
                c.COLUMN_NAME AS name,
                c.DATA_TYPE AS data_type,
                CASE WHEN c.IS_NULLABLE = 'YES' THEN 1 ELSE 0 END AS nullable,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END AS is_primary_key
            FROM INFORMATION_SCHEMA.COLUMNS c
            LEFT JOIN (
                SELECT ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku
                  ON tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
                 AND tc.TABLE_SCHEMA = ku.TABLE_SCHEMA
                WHERE tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
            ) pk
              ON c.TABLE_SCHEMA = pk.TABLE_SCHEMA
             AND c.TABLE_NAME = pk.TABLE_NAME
             AND c.COLUMN_NAME = pk.COLUMN_NAME
            WHERE c.TABLE_SCHEMA = %s AND c.TABLE_NAME = %s
            ORDER BY c.ORDINAL_POSITION
        """
        with self._connection(config, credentials) as conn:
            with conn.cursor(as_dict=True) as cur:
                cur.execute(query, (schema, table))
                rows = cur.fetchall()
        if not rows:
            raise ValidationError(f"Table not found: {schema}.{table}")
        return [
            {
                "name": row["name"],
                "data_type": row["data_type"],
                "nullable": bool(row["nullable"]),
                "is_primary_key": bool(row["is_primary_key"]),
            }
            for row in rows
        ]

    def _fetch_row_count(self, config: dict[str, Any], credentials: dict[str, Any]) -> int:
        schema, table = self._table_parts(config)
        query = f"SELECT COUNT(*) AS cnt FROM {quote_qualified_table(dialect=_DIALECT, schema=schema, table=table)}"
        with self._connection(config, credentials) as conn:
            with conn.cursor(as_dict=True) as cur:
                cur.execute(query)
                row = cur.fetchone()
        return int(row["cnt"])

    def _fetch_rows(
        self,
        config: dict[str, Any],
        credentials: dict[str, Any],
        *,
        order_by: str,
        limit: int,
        offset: int = 0,
        incremental_column: str | None = None,
        last_value: Any = None,
    ) -> list[dict[str, Any]]:
        schema, table = self._table_parts(config)
        qualified = quote_qualified_table(dialect=_DIALECT, schema=schema, table=table)
        order_col = quote_column(dialect=_DIALECT, name=order_by)
        params: list[Any] = []
        where = ""
        if incremental_column and last_value is not None:
            where = f" WHERE {quote_column(dialect=_DIALECT, name=incremental_column)} > %s"
            params.append(last_value)
        query = (
            f"SELECT * FROM {qualified}{where} ORDER BY {order_col} "
            f"OFFSET %s ROWS FETCH NEXT %s ROWS ONLY"
        )
        params.extend([offset, limit])
        with self._connection(config, credentials) as conn:
            with conn.cursor(as_dict=True) as cur:
                cur.execute(query, params)
                rows = cur.fetchall()
        return [{key: serialize_cell(value) for key, value in row.items()} for row in rows]

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        inline = load_inline_rows(config)
        if inline is not None:
            return inline_test_result(
                dialect_label="SQL Server",
                config=config,
                inline_rows=inline,
                table_label=self._table_label(config),
            )
        try:
            columns_meta = self._fetch_columns_meta(config, credentials)
            row_count = self._fetch_row_count(config, credentials)
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"SQL Server connection failed: {exc}")
        return TestResult(
            ok=True,
            message=f"SQL Server reachable ({row_count} rows in {self._table_label(config)})",
            details={
                "row_count": row_count,
                "columns": [col["name"] for col in columns_meta],
                "table": self._table_label(config),
            },
        )

    def discover_schema(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> DiscoveredSchema:
        inline = load_inline_rows(config)
        if inline is not None:
            return discover_inline_schema(
                config=config,
                inline_rows=inline,
                default_schema=self._default_schema(config),
            )
        _, table = self._table_parts(config)
        table_name = str(config.get("table_name") or table)
        columns_meta = self._fetch_columns_meta(config, credentials)
        row_count = self._fetch_row_count(config, credentials)
        return rows_to_discovered_schema(
            table_name=table_name,
            rows=[],
            columns_meta=columns_meta,
            row_estimate=row_count,
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
        if batch_size < 1:
            batch_size = 1
        inline = load_inline_rows(config)
        _, table = parse_table_reference(
            str(config.get("table") or "inline"),
            default_schema=self._default_schema(config),
        )
        table_name = str(config.get("table_name") or table)
        if inline is not None:
            return extract_inline_table_batch(
                config=config,
                inline_rows=inline,
                cursor=cursor,
                mode=mode,
                batch_size=batch_size,
                table_name=table_name,
            )

        columns_meta = self._fetch_columns_meta(config, credentials)
        column_names = [str(col["name"]) for col in columns_meta]
        order_by = resolve_order_column(config, columns=column_names, columns_meta=columns_meta)

        if mode == SyncMode.INCREMENTAL:
            incremental_column = resolve_incremental_column(config, column_names)
            last_value = cursor.state.get("last_value")
            rows = self._fetch_rows(
                config,
                credentials,
                order_by=incremental_column,
                limit=batch_size,
                incremental_column=incremental_column,
                last_value=last_value,
            )
            next_state: dict[str, Any] = {}
            if rows:
                next_state["last_value"] = rows[-1].get(incremental_column)
            return ExtractBatch(
                rows=tuple(rows),
                next_cursor=SyncCursor(state=next_state),
                has_more=len(rows) >= batch_size,
                table_name=table_name,
            )

        offset = int(cursor.state.get("offset", 0))
        rows = self._fetch_rows(
            config,
            credentials,
            order_by=order_by,
            limit=batch_size,
            offset=offset,
        )
        return ExtractBatch(
            rows=tuple(rows),
            next_cursor=SyncCursor(state={"offset": offset + len(rows)}),
            has_more=len(rows) >= batch_size,
            table_name=table_name,
        )
