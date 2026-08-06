"""Shared SQL helpers for database connectors (PostgreSQL, MySQL, …)."""
from __future__ import annotations

import json
from datetime import date, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import as_bool, rows_to_schema, slice_rows
from apps.integrations.domain.schema import (
    DiscoveredColumn,
    DiscoveredSchema,
    DiscoveredTable,
)
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode


def parse_table_reference(table: str, *, default_schema: str = "public") -> tuple[str, str]:
    text = (table or "").strip()
    if not text:
        raise ValidationError("table is required")
    if "." in text:
        schema, name = text.split(".", 1)
        schema = schema.strip() or default_schema
        name = name.strip()
    else:
        schema = default_schema
        name = text
    if not schema or not name:
        raise ValidationError("table must be a valid schema.table or table name")
    return schema, name


def resolve_db_params(
    config: dict[str, Any],
    credentials: dict[str, Any],
    *,
    default_port: int,
    default_database: str = "postgres",
) -> dict[str, Any]:
    host = str(config.get("host") or credentials.get("host") or "").strip()
    if not host and not config.get("inline_rows"):
        raise ValidationError("host is required")

    port_raw = config.get("port") or credentials.get("port") or default_port
    try:
        port = int(port_raw)
    except (TypeError, ValueError) as exc:
        raise ValidationError("port must be an integer") from exc

    database = str(
        config.get("database")
        or config.get("dbname")
        or credentials.get("database")
        or credentials.get("dbname")
        or default_database
    ).strip()

    username = str(
        config.get("username") or credentials.get("username") or ""
    ).strip()
    password = credentials.get("password") or config.get("password") or ""

    return {
        "host": host,
        "port": port,
        "dbname": database,
        "user": username,
        "password": str(password) if password is not None else "",
    }


def pg_sslmode(config: dict[str, Any]) -> str:
    if "sslmode" in config:
        return str(config["sslmode"])
    ssl_enabled = as_bool(config.get("ssl"), True)
    return "require" if ssl_enabled else "disable"


def load_inline_rows(config: dict[str, Any]) -> list[dict[str, Any]] | None:
    inline = config.get("inline_rows")
    if inline is None:
        return None
    if isinstance(inline, list):
        rows = inline
    else:
        try:
            rows = json.loads(str(inline))
        except json.JSONDecodeError as exc:
            raise ValidationError("inline_rows must be valid JSON array") from exc
    if not isinstance(rows, list):
        raise ValidationError("inline_rows must be a JSON array")
    normalized: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict):
            raise ValidationError("inline_rows items must be objects")
        normalized.append({str(k): serialize_cell(v) for k, v in row.items()})
    return normalized


def serialize_cell(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, UUID):
        return str(value)
    if isinstance(value, (bytes, bytearray, memoryview)):
        return bytes(value).decode("utf-8", errors="replace")
    if isinstance(value, (list, dict)):
        return json.dumps(value, separators=(",", ":"))
    return str(value)


def pg_type_to_logical(pg_type: str) -> str:
    return sql_type_to_logical(pg_type)


def sql_type_to_logical(sql_type: str) -> str:
    normalized = (sql_type or "").lower()
    if any(token in normalized for token in ("int", "serial", "bigint", "smallint", "tinyint")):
        return "integer"
    if any(token in normalized for token in ("numeric", "decimal", "double", "real", "float", "money")):
        return "float"
    if "bool" in normalized or normalized == "bit":
        return "boolean"
    if "date" in normalized and "time" not in normalized:
        return "date"
    if any(token in normalized for token in ("timestamp", "datetime", "time")):
        return "datetime"
    return "string"


def quote_qualified_table(*, dialect: str, schema: str, table: str) -> str:
    if dialect == "mysql":
        return f"`{schema}`.`{table}`"
    if dialect == "sqlserver":
        return f"[{schema}].[{table}]"
    raise ValidationError(f"Unsupported SQL dialect: {dialect}")


def quote_column(*, dialect: str, name: str) -> str:
    if dialect == "mysql":
        return f"`{name}`"
    if dialect == "sqlserver":
        return f"[{name}]"
    raise ValidationError(f"Unsupported SQL dialect: {dialect}")


def default_schema_for_config(config: dict[str, Any], *, fallback: str) -> str:
    return str(config.get("schema") or config.get("database") or fallback)


def extract_inline_table_batch(
    *,
    config: dict[str, Any],
    inline_rows: list[dict[str, Any]],
    cursor: SyncCursor,
    mode: SyncMode,
    batch_size: int,
    table_name: str,
) -> ExtractBatch:
    rows = list(inline_rows)
    if mode == SyncMode.INCREMENTAL and rows:
        incremental_column = resolve_incremental_column(config, list(rows[0].keys()))
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
        incremental_column = resolve_incremental_column(config, list(chunk[0].keys()))
        next_state = {"last_value": chunk[-1].get(incremental_column)}
        has_more = next_offset < len(rows)
    return ExtractBatch(
        rows=tuple(chunk),
        next_cursor=SyncCursor(state=next_state),
        has_more=has_more,
        table_name=table_name,
    )


def discover_inline_schema(
    *,
    config: dict[str, Any],
    inline_rows: list[dict[str, Any]],
    default_schema: str,
) -> DiscoveredSchema:
    _, table = parse_table_reference(
        str(config.get("table") or "inline"),
        default_schema=default_schema,
    )
    table_name = str(config.get("table_name") or table)
    return rows_to_discovered_schema(table_name=table_name, rows=inline_rows)


def inline_test_result(
    *,
    dialect_label: str,
    config: dict[str, Any],
    inline_rows: list[dict[str, Any]],
    table_label: str,
) -> TestResult:
    from apps.integrations.domain.connector import TestResult

    columns = list(inline_rows[0].keys()) if inline_rows else []
    return TestResult(
        ok=True,
        message=f"{dialect_label} inline table readable ({len(inline_rows)} rows)",
        details={"row_count": len(inline_rows), "columns": columns, "table": table_label},
    )


def rows_to_discovered_schema(
    *,
    table_name: str,
    rows: list[dict[str, Any]],
    columns_meta: list[dict[str, Any]] | None = None,
    row_estimate: int | None = None,
) -> DiscoveredSchema:
    if columns_meta:
        columns = tuple(
            DiscoveredColumn(
                name=str(col["name"]),
                data_type=sql_type_to_logical(str(col.get("data_type", "string"))),
                nullable=bool(col.get("nullable", True)),
                is_primary_key=bool(col.get("is_primary_key", False)),
            )
            for col in columns_meta
        )
        primary_key = tuple(col.name for col in columns if col.is_primary_key)
    elif rows:
        return rows_to_schema(
            table_name=table_name,
            headers=list(rows[0].keys()),
            sample_rows=rows[:50],
            row_estimate=row_estimate if row_estimate is not None else len(rows),
        )
    else:
        columns = ()
        primary_key = ()

    table = DiscoveredTable(
        name=table_name,
        columns=columns,
        primary_key=primary_key,
        row_estimate=row_estimate if row_estimate is not None else len(rows),
    )
    return DiscoveredSchema(tables=(table,), metadata={"source": "sql"})


def resolve_order_column(
    config: dict[str, Any],
    *,
    columns: list[str],
    columns_meta: list[dict[str, Any]] | None = None,
) -> str:
    explicit = str(config.get("order_by") or "").strip()
    if explicit:
        return explicit
    if columns_meta:
        pk_cols = [str(c["name"]) for c in columns_meta if c.get("is_primary_key")]
        if pk_cols:
            return pk_cols[0]
    if columns:
        return columns[0]
    raise ValidationError("Unable to determine order_by column for SQL extract")


def resolve_incremental_column(config: dict[str, Any], columns: list[str]) -> str:
    explicit = str(config.get("incremental_column") or "").strip()
    if explicit:
        return explicit
    for candidate in ("updated_at", "modified_at", "last_modified", "id"):
        if candidate in columns:
            return candidate
    if columns:
        return columns[0]
    raise ValidationError("incremental_column is required for incremental SQL sync")
