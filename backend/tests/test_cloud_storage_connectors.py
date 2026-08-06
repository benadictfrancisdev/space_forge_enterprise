"""Track 11B.6 — cloud storage connectors (S3)."""
from __future__ import annotations

import json

import pytest
from rest_framework import status

from apps.integrations.application.connector_registry import (
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors._cloud_storage import detect_file_type, parse_object_rows
from apps.integrations.connectors.s3_connector import S3Connector
from apps.integrations.domain.sync import SyncCursor, SyncMode
from tests.conftest import api_data


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_registry_lists_aws_s3():
    types = {item["connector_type"] for item in get_connector_registry().list_types()}
    assert "aws_s3" in types


def test_detect_file_type_from_key():
    assert detect_file_type({"key": "exports/data.csv"}) == "csv"
    assert detect_file_type({"key": "exports/data.jsonl"}) == "jsonl"
    assert detect_file_type({"fileType": "json"}) == "json"


def test_parse_csv_inline_bytes():
    raw = b"city,population\nPune,100\nMumbai,200\n"
    headers, rows = parse_object_rows(raw, config={"fileType": "csv"})
    assert headers == ["city", "population"]
    assert len(rows) == 2


def test_parse_jsonl_inline_bytes():
    raw = b'{"id":1,"name":"A"}\n{"id":2,"name":"B"}\n'
    headers, rows = parse_object_rows(raw, config={"fileType": "jsonl"})
    assert headers == ["id", "name"]
    assert len(rows) == 2


def test_s3_inline_csv_lifecycle():
    connector = S3Connector()
    config = {
        "bucket": "demo-bucket",
        "key": "exports/cities.csv",
        "fileType": "csv",
        "inline_text": "city,population\nPune,100\nMumbai,200\nDelhi,300\n",
    }
    assert connector.test_connection(config=config, credentials={}).ok is True
    schema = connector.discover_schema(config=config, credentials={})
    assert schema.tables[0].name == "cities"
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
def test_s3_connection_sync_via_inline_csv(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "S3 Co"}, format="json"))
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
                "name": "Cities S3",
                "connector_type": "aws_s3",
                "config": {
                    "bucket": "demo-bucket",
                    "key": "exports/cities.csv",
                    "region": "us-east-1",
                    "fileType": "csv",
                    "inline_text": "city,population\nPune,100\nMumbai,200\n",
                },
                "secrets": {"accessKey": "AKIATEST", "secretKey": "super-secret-key"},
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
    body = json.dumps(synced).lower()
    assert "super-secret-key" not in body
    assert "akiatest" not in body
