"""Track 11B.3 / 11B.4 — MySQL and SQL Server connectors."""
from __future__ import annotations

import json

import pytest
from rest_framework import status

from apps.integrations.application.connector_registry import (
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors._sql import parse_table_reference, sql_type_to_logical
from apps.integrations.connectors.mysql_connector import MySQLConnector
from apps.integrations.connectors.sqlserver_connector import SqlServerConnector
from apps.integrations.domain.sync import SyncCursor, SyncMode
from tests.conftest import api_data


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_registry_lists_mysql_and_sqlserver():
    catalog = get_connector_registry().list_types()
    types = {item["connector_type"] for item in catalog}
    assert "mysql" in types
    assert "sqlserver" in types


def test_mysql_parse_table_reference():
    assert parse_table_reference("orders", default_schema="shop") == ("shop", "orders")
    assert parse_table_reference("inventory.items", default_schema="shop") == (
        "inventory",
        "items",
    )


def test_sql_type_mapping_mysql():
    assert sql_type_to_logical("bigint") == "integer"
    assert sql_type_to_logical("datetime") == "datetime"
    assert sql_type_to_logical("varchar") == "string"


@pytest.mark.parametrize(
    ("connector_cls", "table", "default_schema"),
    [
        (MySQLConnector, "shop.orders", "shop"),
        (SqlServerConnector, "dbo.orders", "dbo"),
    ],
)
def test_sql_inline_rows_lifecycle(connector_cls, table, default_schema):
    connector = connector_cls()
    config = {
        "host": "localhost",
        "database": default_schema,
        "table": table,
        "inline_rows": [
            {"id": 1, "sku": "A1"},
            {"id": 2, "sku": "B2"},
            {"id": 3, "sku": "C3"},
        ],
    }
    assert connector.test_connection(config=config, credentials={}).ok is True
    schema = connector.discover_schema(config=config, credentials={})
    assert schema.tables[0].row_estimate == 3
    batch = connector.extract(
        config=config,
        credentials={},
        cursor=SyncCursor.empty(),
        mode=SyncMode.FULL,
        batch_size=2,
    )
    assert len(batch.rows) == 2
    assert batch.has_more is True


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("connector_type", "table"),
    [
        ("mysql", "shop.cities"),
        ("sqlserver", "dbo.cities"),
    ],
)
def test_sql_connection_sync_via_inline_rows(auth_client, connector_type, table):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "SQL Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    inline_rows = [
        {"city": "Pune", "population": 100},
        {"city": "Mumbai", "population": 200},
    ]
    conn = api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": f"{connector_type} cities",
                "connector_type": connector_type,
                "config": {
                    "host": "localhost",
                    "port": "3306" if connector_type == "mysql" else "1433",
                    "database": table.split(".")[0],
                    "table": table,
                    "inline_rows": inline_rows,
                },
                "secrets": {"username": "demo", "password": "secret-pass"},
            },
            format="json",
        )
    )
    tested = api_data(auth_client.post(f"/api/v1/connections/{conn['id']}/test/", {}, format="json"))
    assert tested["connection"]["health_status"] == "healthy"

    synced = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "full", "batch_size": 1},
            format="json",
        )
    )
    assert synced["job"]["status"] == "succeeded"
    assert synced["sync_run"]["rows_loaded"] == 2
    assert "secret-pass" not in json.dumps(synced).lower()
