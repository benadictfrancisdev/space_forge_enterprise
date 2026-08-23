"""Query compute engine security and execution tests."""
from __future__ import annotations

import pytest

from apps.core.exceptions import ValidationError
from apps.query_compute.application.engines import execute_sql_duckdb, validate_select_only_ast

_SAMPLE_CSV = b"region,revenue\nWest,100\nEast,200\nNorth,150\n"


def test_sql_sandbox_allows_valid_select():
    sql = (
        'SELECT a.region, SUM(a.revenue) AS total '
        'FROM dataset a JOIN dataset b ON a.region = b.region '
        'GROUP BY a.region ORDER BY total DESC'
    )
    validate_select_only_ast(sql)
    result = execute_sql_duckdb(_SAMPLE_CSV, sql)
    assert result["row_count"] >= 1
    assert result["engine"] == "duckdb"


def test_sql_sandbox_blocks_drop():
    with pytest.raises(ValidationError, match="Only read-only SELECT"):
        validate_select_only_ast("DROP TABLE users;")


def test_sql_sandbox_blocks_multiple_statements():
    with pytest.raises(ValidationError, match="Multiple SQL statements are not allowed"):
        validate_select_only_ast("SELECT * FROM data; DROP TABLE data;")


def test_sql_sandbox_blocks_copy():
    with pytest.raises(ValidationError):
        validate_select_only_ast("COPY data TO 'output.csv';")


def test_sql_sandbox_blocks_attach():
    with pytest.raises(ValidationError):
        validate_select_only_ast("ATTACH 'other_db.db';")


def test_sql_sandbox_blocks_install_and_load():
    with pytest.raises(ValidationError):
        validate_select_only_ast("INSTALL httpfs;")
    with pytest.raises(ValidationError):
        validate_select_only_ast("LOAD httpfs;")
