"""Track 11.1 — connector framework unit tests (no network I/O)."""
from __future__ import annotations

import pytest

from apps.core.exceptions import NotFoundError, ValidationError
from apps.integrations.application.connector_registry import (
    ConnectorRegistry,
    get_connector_registry,
    reset_connector_registry,
)
from apps.integrations.connectors.echo import EchoConnector
from apps.integrations.domain.sync import SyncCursor, SyncMode


@pytest.fixture(autouse=True)
def _fresh_registry():
    reset_connector_registry()
    yield
    reset_connector_registry()


def test_builtin_echo_is_registered():
    registry = get_connector_registry()
    connector = registry.get("platform.echo")
    assert connector.connector_type == "platform.echo"
    assert connector.version == "1.0.0"
    assert connector.capabilities.supports_schema_discovery is True


def test_list_types_includes_echo_catalog_entry():
    catalog = get_connector_registry().list_types()
    echo = next(item for item in catalog if item["connector_type"] == "platform.echo")
    assert echo["version"] == "1.0.0"
    assert "properties" in echo["config_schema"]


def test_get_unknown_connector_raises():
    with pytest.raises(NotFoundError):
        get_connector_registry().get("does.not.exist")


def test_duplicate_register_raises():
    registry = ConnectorRegistry()
    registry.register(EchoConnector())
    with pytest.raises(ValidationError):
        registry.register(EchoConnector())


def test_echo_lifecycle_test_discover_extract():
    connector = EchoConnector()
    config = {"message": "spaceforge", "row_count": 3}
    credentials: dict = {}

    result = connector.test_connection(config=config, credentials=credentials)
    assert result.ok is True
    assert result.details is not None
    assert result.details["echo"] == "spaceforge"

    schema = connector.discover_schema(config=config, credentials=credentials)
    assert len(schema.tables) == 1
    assert schema.tables[0].name == "echo_items"
    assert schema.tables[0].row_estimate == 3

    cursor = SyncCursor.empty()
    all_rows: list[dict] = []
    while True:
        batch = connector.extract(
            config=config,
            credentials=credentials,
            cursor=cursor,
            mode=SyncMode.FULL,
            batch_size=2,
        )
        all_rows.extend(batch.rows)
        cursor = batch.next_cursor
        if not batch.has_more:
            break

    assert len(all_rows) == 3
    assert all_rows[0]["message"] == "spaceforge"
    assert all_rows[-1]["id"] == 3


def test_echo_extract_empty_when_row_count_zero():
    connector = EchoConnector()
    batch = connector.extract(
        config={"row_count": 0},
        credentials={},
        cursor=SyncCursor.empty(),
        mode=SyncMode.FULL,
        batch_size=10,
    )
    assert batch.rows == ()
    assert batch.has_more is False
