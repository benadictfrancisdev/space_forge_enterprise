"""Track 11B.2 — PostgreSQL connector."""
from __future__ import annotations

import json

import pytest
from rest_framework import status

from apps.integrations.application.connector_registry import (
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors._sql import parse_table_reference, pg_type_to_logical
from apps.integrations.connectors.postgresql_connector import PostgreSQLConnector
from apps.integrations.domain.sync import SyncCursor, SyncMode
from tests.conftest import api_data


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_registry_lists_postgresql():
    catalog = get_connector_registry().list_types()
    types = {item["connector_type"] for item in catalog}
    assert "postgresql" in types


def test_parse_table_reference():
    assert parse_table_reference("orders") == ("public", "orders")
    assert parse_table_reference("sales.orders") == ("sales", "orders")


def test_pg_type_mapping():
    assert pg_type_to_logical("integer") == "integer"
    assert pg_type_to_logical("timestamp with time zone") == "datetime"
    assert pg_type_to_logical("character varying") == "string"


def test_postgresql_inline_rows_lifecycle():
    connector = PostgreSQLConnector()
    config = {
        "host": "localhost",
        "database": "demo",
        "table": "public.orders",
        "inline_rows": [
            {"id": 1, "sku": "A1", "qty": 5},
            {"id": 2, "sku": "B2", "qty": 7},
            {"id": 3, "sku": "C3", "qty": 2},
        ],
    }

    result = connector.test_connection(config=config, credentials={})
    assert result.ok is True
    assert result.details["row_count"] == 3

    schema = connector.discover_schema(config=config, credentials={})
    assert schema.tables[0].name == "orders"
    assert [c.name for c in schema.tables[0].columns] == ["id", "sku", "qty"]
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

    batch2 = connector.extract(
        config=config,
        credentials={},
        cursor=batch.next_cursor,
        mode=SyncMode.FULL,
        batch_size=10,
    )
    assert len(batch2.rows) == 1
    assert batch2.has_more is False


def test_postgresql_incremental_inline_cursor():
    connector = PostgreSQLConnector()
    config = {
        "host": "localhost",
        "database": "demo",
        "table": "events",
        "incremental_column": "id",
        "inline_rows": [
            {"id": 1, "event": "a"},
            {"id": 2, "event": "b"},
            {"id": 3, "event": "c"},
        ],
    }

    first = connector.extract(
        config=config,
        credentials={},
        cursor=SyncCursor(state={"last_value": 1}),
        mode=SyncMode.INCREMENTAL,
        batch_size=10,
    )
    assert len(first.rows) == 2
    assert first.rows[0]["id"] == 2
    assert first.rows[1]["id"] == 3


@pytest.mark.django_db
def test_postgresql_connection_sync_via_inline_rows(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "PG Co"}, format="json"))
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
                "name": "Cities PG",
                "connector_type": "postgresql",
                "config": {
                    "host": "localhost",
                    "port": "5432",
                    "database": "demo",
                    "table": "public.cities",
                    "inline_rows": inline_rows,
                },
                "secrets": {"username": "demo", "password": "demo"},
            },
            format="json",
        )
    )

    tested = api_data(auth_client.post(f"/api/v1/connections/{conn['id']}/test/", {}, format="json"))
    assert tested["connection"]["health_status"] == "healthy"

    discovered = api_data(
        auth_client.post(f"/api/v1/connections/{conn['id']}/discover/", {}, format="json")
    )
    assert discovered["schema"]["tables"][0]["name"] == "cities"
    assert discovered["schema"]["tables"][0]["row_estimate"] == 2

    synced = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "full", "batch_size": 1},
            format="json",
        )
    )
    assert synced["job"]["status"] == "succeeded"
    assert synced["sync_run"]["rows_loaded"] == 2
    assert synced["connection"]["target_dataset_id"] is not None

    body_text = json.dumps(synced)
    assert "password" not in body_text.lower()
