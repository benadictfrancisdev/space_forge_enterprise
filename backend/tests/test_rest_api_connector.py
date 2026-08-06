"""Track 11B.1 — REST API connector."""
from __future__ import annotations

import json

import httpx
import pytest
from rest_framework import status

from apps.integrations.application.connector_registry import (
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors._http import build_auth_headers, navigate_json_path
from apps.integrations.connectors.rest_api_connector import RestApiConnector
from apps.integrations.domain.sync import SyncCursor, SyncMode
from tests.conftest import api_data


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_registry_lists_rest_api():
    catalog = get_connector_registry().list_types()
    types = {item["connector_type"] for item in catalog}
    assert "rest_api" in types


def test_rest_inline_json_lifecycle():
    connector = RestApiConnector()
    config = {
        "inline_json": {
            "data": {
                "items": [
                    {"id": 1, "name": "Alpha", "meta": {"region": "West"}},
                    {"id": 2, "name": "Beta", "meta": {"region": "East"}},
                ]
            }
        },
        "json_path": "data.items",
        "table_name": "orders",
    }

    result = connector.test_connection(config=config, credentials={})
    assert result.ok is True
    assert result.details["row_count"] == 2

    schema = connector.discover_schema(config=config, credentials={})
    assert schema.tables[0].name == "orders"
    assert "meta_region" in [c.name for c in schema.tables[0].columns]
    assert schema.tables[0].row_estimate == 2

    batch = connector.extract(
        config=config,
        credentials={},
        cursor=SyncCursor.empty(),
        mode=SyncMode.FULL,
        batch_size=1,
    )
    assert len(batch.rows) == 1
    assert batch.rows[0]["name"] == "Alpha"
    assert batch.rows[0]["meta_region"] == "West"
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


def test_navigate_json_path_accepts_root_array():
    rows = navigate_json_path([{"id": 1}, {"id": 2}], "")
    assert len(rows) == 2
    assert rows[0]["id"] == 1


def test_build_auth_headers_api_key_and_basic():
    bearer = build_auth_headers({}, {"apiKey": "secret-token"})
    assert bearer["Authorization"] == "Bearer secret-token"

    basic = build_auth_headers({}, {"username": "alice", "password": "pass"})
    assert basic["Authorization"].startswith("Basic ")


def test_rest_http_fetch_with_mock_transport():
    connector = RestApiConnector()

    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer test-key"
        assert request.url.params["limit"] == "1"
        return httpx.Response(
            200,
            json={"records": [{"id": 10, "sku": "A"}]},
        )

    transport = httpx.MockTransport(handler)
    with httpx.Client(transport=transport) as client:
        original = httpx.Client

        class _PatchedClient(httpx.Client):
            def __init__(self, *args, **kwargs):
                kwargs["transport"] = transport
                super().__init__(*args, **kwargs)

        import apps.integrations.connectors._http as http_mod

        previous = http_mod.httpx.Client
        http_mod.httpx.Client = _PatchedClient
        try:
            config = {
                "url": "https://api.example.com/items",
                "method": "GET",
                "json_path": "records",
                "pagination_style": "offset",
                "offset_param": "offset",
                "limit_param": "limit",
            }
            result = connector.test_connection(
                config=config,
                credentials={"apiKey": "test-key"},
            )
            assert result.ok is True
            assert result.details["row_count"] == 1
        finally:
            http_mod.httpx.Client = previous


@pytest.mark.django_db
def test_rest_connection_sync_via_inline_json(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "REST Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )

    inline_payload = {
        "results": [
            {"city": "Pune", "population": 100},
            {"city": "Mumbai", "population": 200},
            {"city": "Delhi", "population": 300},
        ]
    }
    conn = api_data(
        auth_client.post(
            "/api/v1/connections/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": "Cities REST",
                "connector_type": "rest_api",
                "config": {
                    "inline_json": json.dumps(inline_payload),
                    "json_path": "results",
                    "table_name": "cities",
                },
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
    assert discovered["schema"]["tables"][0]["row_estimate"] == 3

    synced = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "full", "batch_size": 2},
            format="json",
        )
    )
    assert synced["job"]["status"] == "succeeded"
    assert synced["sync_run"]["rows_loaded"] == 3
    assert synced["connection"]["target_dataset_id"] is not None
