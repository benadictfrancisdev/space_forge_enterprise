"""Track 11B.7 — SaaS connectors (Airtable, Shopify)."""
from __future__ import annotations

import json

import httpx
import pytest
from rest_framework import status

from apps.integrations.application.connector_registry import (
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors._saas import flatten_airtable_record
from apps.integrations.connectors.airtable_connector import AirtableConnector
from apps.integrations.connectors.shopify_connector import ShopifyConnector
from apps.integrations.domain.sync import SyncCursor, SyncMode
from tests.conftest import api_data


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_registry_lists_saas_connectors():
    types = {item["connector_type"] for item in get_connector_registry().list_types()}
    assert "airtable" in types
    assert "shopify" in types


def test_flatten_airtable_record():
    row = flatten_airtable_record(
        {
            "id": "rec123",
            "createdTime": "2026-01-01T00:00:00.000Z",
            "fields": {"Name": "Widget", "Qty": 3, "Meta": {"region": "West"}},
        }
    )
    assert row["id"] == "rec123"
    assert row["Name"] == "Widget"
    assert row["Meta"] == '{"region":"West"}'


def test_airtable_inline_records_lifecycle():
    connector = AirtableConnector()
    config = {
        "baseId": "appTEST",
        "tableName": "Orders",
        "inline_records": [
            {"id": "rec1", "createdTime": "2026-01-01", "fields": {"sku": "A1", "qty": 2}},
            {"id": "rec2", "createdTime": "2026-01-02", "fields": {"sku": "B2", "qty": 5}},
        ],
    }
    assert connector.test_connection(config=config, credentials={"apiKey": "pat-test"}).ok is True
    schema = connector.discover_schema(config=config, credentials={})
    assert schema.tables[0].name == "Orders"
    assert schema.tables[0].row_estimate == 2

    batch = connector.extract(
        config=config,
        credentials={},
        cursor=SyncCursor.empty(),
        mode=SyncMode.FULL,
        batch_size=1,
    )
    assert len(batch.rows) == 1
    assert batch.rows[0]["sku"] == "A1"


def test_shopify_inline_records_lifecycle():
    connector = ShopifyConnector()
    config = {
        "shopDomain": "demo.myshopify.com",
        "resource": "orders",
        "inline_records": [
            {"id": 101, "name": "#1001", "total_price": "25.00"},
            {"id": 102, "name": "#1002", "total_price": "40.00"},
        ],
    }
    assert connector.test_connection(config=config, credentials={"adminApiKey": "shpat_test"}).ok is True
    batch = connector.extract(
        config=config,
        credentials={},
        cursor=SyncCursor.empty(),
        mode=SyncMode.FULL,
        batch_size=10,
    )
    assert len(batch.rows) == 2


def test_airtable_http_fetch_with_mock_transport():
    connector = AirtableConnector()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer pat-live"
        return httpx.Response(
            200,
            json={
                "records": [
                    {
                        "id": "rec1",
                        "createdTime": "2026-01-01T00:00:00.000Z",
                        "fields": {"sku": "A1"},
                    }
                ]
            },
        )

    transport = httpx.MockTransport(handler)
    import apps.integrations.connectors.airtable_connector as airtable_mod

    class _PatchedClient(httpx.Client):
        def __init__(self, *args, **kwargs):
            kwargs["transport"] = transport
            super().__init__(*args, **kwargs)

    previous = airtable_mod.httpx.Client
    airtable_mod.httpx.Client = _PatchedClient
    try:
        config = {"baseId": "appXYZ", "tableName": "Orders"}
        result = connector.test_connection(config=config, credentials={"apiKey": "pat-live"})
        assert result.ok is True
        assert result.details["row_count"] == 1
    finally:
        airtable_mod.httpx.Client = previous


@pytest.mark.django_db
@pytest.mark.parametrize("connector_type", ["airtable", "shopify"])
def test_saas_connection_sync_via_inline_records(auth_client, connector_type):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "SaaS Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    if connector_type == "airtable":
        body = {
            "connector_type": "airtable",
            "config": {
                "baseId": "appTEST",
                "tableName": "Orders",
                "inline_records": [
                    {"id": "rec1", "fields": {"city": "Pune", "amount": 10}},
                    {"id": "rec2", "fields": {"city": "Mumbai", "amount": 20}},
                ],
            },
            "secrets": {"apiKey": "pat-secret-token"},
        }
        secret_token = "pat-secret-token"
    else:
        body = {
            "connector_type": "shopify",
            "config": {
                "shopDomain": "demo.myshopify.com",
                "resource": "orders",
                "inline_records": [
                    {"id": 1, "name": "#1", "total_price": "10.00"},
                    {"id": 2, "name": "#2", "total_price": "20.00"},
                ],
            },
            "secrets": {"adminApiKey": "shpat-secret-token"},
        }
        secret_token = "shpat-secret-token"

    conn = api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": f"{connector_type} sync",
                **body,
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
    assert secret_token not in json.dumps(synced).lower()
