"""Query generation, planning, optimization, and execution — Track 12.8."""
from __future__ import annotations

import re
import time
from typing import Any

import sqlparse
from sqlparse.tokens import Keyword

from apps.core.exceptions import ValidationError

_BLOCKED_EXTENSIONS = frozenset({"COPY", "ATTACH", "INSTALL", "LOAD"})


def _iter_tokens(token):
    if hasattr(token, "tokens"):
        for child in token.tokens:
            yield from _iter_tokens(child)
    else:
        yield token


def validate_select_only_ast(sql_query: str) -> None:
    """Reject any SQL that is not a single read-only SELECT statement."""
    sql_query = (sql_query or "").strip()
    if not sql_query:
        raise ValidationError("SQL query is required")

    statements = [stmt for stmt in sqlparse.parse(sql_query) if str(stmt).strip()]
    if len(statements) != 1:
        raise ValidationError("Multiple SQL statements are not allowed")

    stmt = statements[0]
    if stmt.get_type() != "SELECT":
        raise ValidationError("Only read-only SELECT queries are permitted")

    for token in _iter_tokens(stmt):
        if token.ttype in Keyword and token.value.upper() in _BLOCKED_EXTENSIONS:
            raise ValidationError(f"{token.value.upper()} statements are not allowed")


def generate_sql(natural_language: str, columns: list[str], row_limit: int = 100) -> str:
    nl = (natural_language or "").strip().lower()
    cols = columns or ["*"]
    selected = cols[:5]
    if "count" in nl or "how many" in nl:
        return f"SELECT COUNT(*) AS row_count FROM dataset"
    if "sum" in nl:
        numeric_hint = next((c for c in cols if "amount" in c.lower() or "revenue" in c.lower()), cols[0])
        return f"SELECT SUM(CAST(\"{numeric_hint}\" AS DOUBLE)) AS total FROM dataset"
    if "group" in nl or "by" in nl:
        group_col = next((c for c in cols if c.lower() in nl), cols[0])
        val_col = next((c for c in cols if c != group_col), group_col)
        return (
            f"SELECT \"{group_col}\", COUNT(*) AS cnt "
            f"FROM dataset GROUP BY \"{group_col}\" ORDER BY cnt DESC LIMIT {row_limit}"
        )
    col_list = ", ".join(f'"{c}"' for c in selected)
    return f"SELECT {col_list} FROM dataset LIMIT {row_limit}"


def plan_query(sql: str, columns: list[str]) -> list[dict]:
    steps = [
        {"step": "parse", "detail": "Validate SQL read-only"},
        {"step": "bind", "detail": f"Bind dataset table ({len(columns)} columns)"},
        {"step": "execute", "detail": "Run via DuckDB in-memory"},
    ]
    if "GROUP BY" in sql.upper():
        steps.insert(2, {"step": "aggregate", "detail": "Hash aggregate"})
    return steps


def optimize_sql(sql: str) -> str:
    optimized = sql.strip()
    if "LIMIT" not in optimized.upper():
        optimized += " LIMIT 1000"
    return optimized


def execute_sql_duckdb(csv_bytes: bytes, sql: str, filename: str = "data.csv") -> dict[str, Any]:
    validate_select_only_ast(sql)

    started = time.perf_counter()
    try:
        import duckdb
    except ImportError:
        return execute_sql_fallback(csv_bytes, sql)

    import tempfile
    import os

    suffix = ".csv" if filename.endswith(".csv") else ".csv"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(csv_bytes)
        tmp_path = tmp.name

    try:
        con = duckdb.connect()
        safe_path = tmp_path.replace("\\", "/")
        con.execute(
            f"CREATE OR REPLACE TABLE dataset AS SELECT * FROM read_csv_auto('{safe_path}')"
        )
        relation = con.execute(sql)
        columns = [d[0] for d in relation.description]
        rows = relation.fetchall()
        preview = [dict(zip(columns, row)) for row in rows[:100]]
        elapsed = int((time.perf_counter() - started) * 1000)
        return {
            "columns": columns,
            "row_count": len(rows),
            "preview": preview,
            "execution_ms": elapsed,
            "engine": "duckdb",
        }
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


def execute_sql_fallback(csv_bytes: bytes, sql: str) -> dict[str, Any]:
    """Pure Python fallback when DuckDB unavailable — limited SELECT * / COUNT."""
    validate_select_only_ast(sql)

    from apps.data_platform.application.pipeline_stages import parse_content

    rows, columns = parse_content(csv_bytes, "data.csv")
    started = time.perf_counter()
    sql_upper = sql.upper()
    if "COUNT(*)" in sql_upper:
        result_rows = [{"row_count": len(rows)}]
        cols = ["row_count"]
    else:
        limit = 100
        m = re.search(r"LIMIT\s+(\d+)", sql_upper)
        if m:
            limit = int(m.group(1))
        result_rows = rows[:limit]
        cols = columns
    elapsed = int((time.perf_counter() - started) * 1000)
    return {
        "columns": cols,
        "row_count": len(result_rows),
        "preview": result_rows[:100],
        "execution_ms": elapsed,
        "engine": "python_fallback",
    }
