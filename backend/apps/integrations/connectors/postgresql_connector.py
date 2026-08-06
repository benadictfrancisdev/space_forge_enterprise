"""postgresql — PostgreSQL table connector via psycopg."""
from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

import psycopg
from psycopg import sql

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import slice_rows
from apps.integrations.connectors._sql import (
    load_inline_rows,
    parse_table_reference,
    pg_sslmode,
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


class PostgreSQLConnector(BaseConnector):
    @property
    def connector_type(self) -> str:
        return "postgresql"

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
                "port": {"type": "integer", "default": 5432, "title": "Port"},
                "database": {"type": "string", "title": "Database"},
                "table": {
                    "type": "string",
                    "title": "Table",
                    "description": "schema.table or table (default schema: public)",
                },
                "ssl": {"type": "boolean", "default": True, "title": "Use SSL"},
                "order_by": {"type": "string", "title": "ORDER BY column"},
                "incremental_column": {
                    "type": "string",
                    "title": "Incremental cursor column",
                },
            },
            "required": ["host", "database", "table"],
            "additionalProperties": True,
        }

    def _table_label(self, config: dict[str, Any]) -> str:
        schema, table = parse_table_reference(
            str(config.get("table") or ""),
            default_schema=str(config.get("schema") or "public"),
        )
        return f"{schema}.{table}"

    def _connect(self, config: dict[str, Any], credentials: dict[str, Any]):
        params = resolve_db_params(config, credentials, default_port=5432)
        conninfo = psycopg.conninfo.make_conninfo(
            host=params["host"],
            port=params["port"],
            dbname=params["dbname"],
            user=params["user"],
            password=params["password"],
            sslmode=pg_sslmode(config),
            connect_timeout=int(config.get("connect_timeout") or 15),
        )
        return psycopg.connect(conninfo)

    @contextmanager
    def _connection(self, config: dict[str, Any], credentials: dict[str, Any]) -> Iterator[Any]:
        conn = self._connect(config, credentials)
        try:
            yield conn
        finally:
            conn.close()

    def _fetch_columns_meta(
        self,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> list[dict[str, Any]]:
        schema, table = parse_table_reference(
            str(config.get("table") or ""),
            default_schema=str(config.get("schema") or "public"),
        )
        query = """
            SELECT
                c.column_name,
                c.data_type,
                c.is_nullable = 'YES' AS nullable,
                EXISTS (
                    SELECT 1
                    FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu
                      ON tc.constraint_name = kcu.constraint_name
                     AND tc.table_schema = kcu.table_schema
                    WHERE tc.constraint_type = 'PRIMARY KEY'
                      AND tc.table_schema = c.table_schema
                      AND tc.table_name = c.table_name
                      AND kcu.column_name = c.column_name
                ) AS is_primary_key
            FROM information_schema.columns c
            WHERE c.table_schema = %s AND c.table_name = %s
            ORDER BY c.ordinal_position
        """
        with self._connection(config, credentials) as conn:
            with conn.cursor() as cur:
                cur.execute(query, (schema, table))
                rows = cur.fetchall()
        if not rows:
            raise ValidationError(f"Table not found: {schema}.{table}")
        return [
            {
                "name": row[0],
                "data_type": row[1],
                "nullable": bool(row[2]),
                "is_primary_key": bool(row[3]),
            }
            for row in rows
        ]

    def _fetch_row_count(
        self,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> int:
        schema, table = parse_table_reference(
            str(config.get("table") or ""),
            default_schema=str(config.get("schema") or "public"),
        )
        query = sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
            sql.Identifier(schema),
            sql.Identifier(table),
        )
        with self._connection(config, credentials) as conn:
            with conn.cursor() as cur:
                cur.execute(query)
                return int(cur.fetchone()[0])

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
    ) -> tuple[list[str], list[dict[str, Any]]]:
        schema, table = parse_table_reference(
            str(config.get("table") or ""),
            default_schema=str(config.get("schema") or "public"),
        )
        columns_meta = self._fetch_columns_meta(config, credentials)
        column_names = [str(col["name"]) for col in columns_meta]

        base = sql.SQL("SELECT * FROM {}.{}").format(
            sql.Identifier(schema),
            sql.Identifier(table),
        )
        params: list[Any] = []
        clauses: list[sql.Composable] = [base]

        if incremental_column and last_value is not None:
            clauses.append(
                sql.SQL("WHERE {} > %s").format(sql.Identifier(incremental_column))
            )
            params.append(last_value)

        clauses.append(
            sql.SQL("ORDER BY {} LIMIT %s OFFSET %s").format(sql.Identifier(order_by))
        )
        params.extend([limit, offset])
        query = sql.SQL(" ").join(clauses)

        with self._connection(config, credentials) as conn:
            with conn.cursor() as cur:
                cur.execute(query, params)
                if cur.description is None:
                    return column_names, []
                names = [desc.name for desc in cur.description]
                rows = [
                    {name: serialize_cell(value) for name, value in zip(names, row)}
                    for row in cur.fetchall()
                ]
        return column_names, rows

    def test_connection(
        self,
        *,
        config: dict[str, Any],
        credentials: dict[str, Any],
    ) -> TestResult:
        inline = load_inline_rows(config)
        if inline is not None:
            columns = list(inline[0].keys()) if inline else []
            return TestResult(
                ok=True,
                message=f"PostgreSQL inline table readable ({len(inline)} rows)",
                details={"row_count": len(inline), "columns": columns, "table": self._table_label(config)},
            )
        try:
            columns_meta = self._fetch_columns_meta(config, credentials)
            row_count = self._fetch_row_count(config, credentials)
        except ValidationError as exc:
            return TestResult(ok=False, message=str(exc))
        except Exception as exc:  # noqa: BLE001
            return TestResult(ok=False, message=f"PostgreSQL connection failed: {exc}")

        return TestResult(
            ok=True,
            message=f"PostgreSQL reachable ({row_count} rows in {self._table_label(config)})",
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
        _, table = parse_table_reference(
            str(config.get("table") or "inline"),
            default_schema=str(config.get("schema") or "public"),
        )
        table_name = str(config.get("table_name") or table)
        if inline is not None:
            return rows_to_discovered_schema(table_name=table_name, rows=inline)

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
            default_schema=str(config.get("schema") or "public"),
        )
        table_name = str(config.get("table_name") or table)

        if inline is not None:
            rows = list(inline)
            if mode == SyncMode.INCREMENTAL and rows:
                incremental_column = resolve_incremental_column(
                    config, list(rows[0].keys())
                )
                last_value = cursor.state.get("last_value")
                if last_value is not None:
                    rows = [
                        row
                        for row in rows
                        if row.get(incremental_column) is not None
                        and row.get(incremental_column) > last_value
                    ]
            offset = int(cursor.state.get("offset", 0))
            chunk, next_offset, has_more = slice_rows(rows, offset=offset, batch_size=batch_size)
            next_state: dict[str, Any] = {"offset": next_offset}
            if mode == SyncMode.INCREMENTAL and chunk:
                incremental_column = resolve_incremental_column(
                    config, list(chunk[0].keys())
                )
                next_state = {"last_value": chunk[-1].get(incremental_column)}
                has_more = next_offset < len(rows)
            return ExtractBatch(
                rows=tuple(chunk),
                next_cursor=SyncCursor(state=next_state),
                has_more=has_more,
                table_name=table_name,
            )

        columns_meta = self._fetch_columns_meta(config, credentials)
        column_names = [str(col["name"]) for col in columns_meta]
        order_by = resolve_order_column(config, columns=column_names, columns_meta=columns_meta)

        if mode == SyncMode.INCREMENTAL:
            incremental_column = resolve_incremental_column(config, column_names)
            last_value = cursor.state.get("last_value")
            _, rows = self._fetch_rows(
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
            has_more = len(rows) >= batch_size
            return ExtractBatch(
                rows=tuple(rows),
                next_cursor=SyncCursor(state=next_state),
                has_more=has_more,
                table_name=table_name,
            )

        offset = int(cursor.state.get("offset", 0))
        _, rows = self._fetch_rows(
            config,
            credentials,
            order_by=order_by,
            limit=batch_size,
            offset=offset,
        )
        next_offset = offset + len(rows)
        has_more = len(rows) >= batch_size
        return ExtractBatch(
            rows=tuple(rows),
            next_cursor=SyncCursor(state={"offset": next_offset}),
            has_more=has_more,
            table_name=table_name,
        )
