"""Track 11.6 — transformation pipeline unit + API tests."""
from __future__ import annotations

import pytest
from rest_framework import status

from apps.integrations.application.transform_service import apply_steps
from apps.storage.application.factory import get_object_storage
from tests.conftest import api_data


def test_apply_steps_rename_cast_nulls():
    rows = [
        {"id": "1", "message": "hello", "seq": "2", "note": ""},
        {"id": "", "message": "drop-me", "seq": "3", "note": None},
        {"id": "3", "message": "", "seq": "4", "note": "x"},
    ]
    out = apply_steps(
        rows,
        [
            {"op": "rename", "mapping": {"message": "msg"}},
            {"op": "cast", "columns": {"id": "integer", "seq": "integer"}},
            {
                "op": "nulls",
                "fill": {"msg": "(empty)"},
                "drop_if_null": ["id"],
            },
        ],
    )
    assert len(out) == 2
    assert out[0] == {"id": 1, "msg": "hello", "seq": 2, "note": ""}
    assert out[1]["id"] == 3
    assert out[1]["msg"] == "(empty)"
    assert "message" not in out[0]


@pytest.mark.django_db
def test_transform_rules_apply_during_sync(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Xform Co"}, format="json"))
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
                "name": "Echo Xform",
                "connector_type": "platform.echo",
                "config": {"message": "raw", "row_count": 3},
            },
            format="json",
        )
    )

    created = auth_client.post(
        f"/api/v1/connections/{conn['id']}/transform-rules/",
        {
            "name": "Rename message",
            "table_name": "echo_items",
            "priority": 10,
            "steps": [
                {"op": "rename", "mapping": {"message": "msg"}},
                {"op": "cast", "columns": {"id": "string"}},
            ],
        },
        format="json",
    )
    assert created.status_code == status.HTTP_201_CREATED
    rule = api_data(created)
    assert rule["name"] == "Rename message"
    assert len(rule["steps"]) == 2

    listed = api_data(auth_client.get(f"/api/v1/connections/{conn['id']}/transform-rules/"))
    assert len(listed) == 1

    synced = api_data(
        auth_client.post(
            f"/api/v1/connections/{conn['id']}/sync/",
            {"mode": "full"},
            format="json",
        )
    )
    assert synced["job"]["status"] == "succeeded"
    assert synced["sync_run"]["rows_loaded"] == 3

    # Download synced CSV and assert transformed headers/values
    from apps.datasets.infrastructure.models import Dataset

    dataset = Dataset.objects.get(id=synced["connection"]["target_dataset_id"])
    content = get_object_storage().download(key=dataset.storage_object.key)
    text = content.decode("utf-8")
    header = text.splitlines()[0]
    assert "msg" in header
    assert "message" not in header.split(",")
    assert '"1"' in text or ",1," in text or text.splitlines()[1].startswith("1,")

    # Update + delete rule
    patched = auth_client.patch(
        f"/api/v1/transform-rules/{rule['id']}/",
        {"is_active": False},
        format="json",
    )
    assert patched.status_code == status.HTTP_200_OK
    assert api_data(patched)["is_active"] is False
    deleted = auth_client.delete(f"/api/v1/transform-rules/{rule['id']}/")
    assert deleted.status_code == status.HTTP_204_NO_CONTENT
