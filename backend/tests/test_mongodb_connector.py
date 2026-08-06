"""Track 11B.5 — MongoDB connector."""
from __future__ import annotations

import json

import pytest
from rest_framework import status

from apps.integrations.application.connector_registry import (
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors.mongodb_connector import MongoDBConnector
from apps.integrations.domain.sync import SyncCursor, SyncMode
from tests.conftest import api_data


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_registry_lists_mongodb():
    types = {item["connector_type"] for item in get_connector_registry().list_types()}
    assert "mongodb" in types


def test_mongodb_inline_documents_lifecycle():
    connector = MongoDBConnector()
    config = {
        "host": "localhost",
        "database": "analytics",
        "collection": "orders",
        "inline_documents": [
            {"_id": 1, "sku": "A1", "meta": {"region": "West"}},
            {"_id": 2, "sku": "B2", "meta": {"region": "East"}},
            {"_id": 3, "sku": "C3", "meta": {"region": "North"}},
        ],
    }
    assert connector.test_connection(config=config, credentials={}).ok is True
    schema = connector.discover_schema(config=config, credentials={})
    assert schema.tables[0].name == "orders"
    assert "meta_region" in [c.name for c in schema.tables[0].columns]

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
def test_mongodb_connection_sync_via_inline_documents(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Mongo Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    conn = api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": "Orders Mongo",
                "connector_type": "mongodb",
                "config": {
                    "host": "localhost",
                    "database": "analytics",
                    "collection": "orders",
                    "inline_documents": [
                        {"city": "Pune", "population": 100},
                        {"city": "Mumbai", "population": 200},
                    ],
                },
                "secrets": {"username": "mongo", "password": "mongo-secret"},
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
    assert "mongo-secret" not in json.dumps(synced).lower()
