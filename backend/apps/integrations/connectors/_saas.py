"""Shared helpers for SaaS API connectors."""
from __future__ import annotations

import json
from typing import Any

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._http import flatten_record
from apps.integrations.connectors._sql import (
    extract_inline_table_batch,
    load_inline_rows,
    serialize_cell,
)
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode


def load_inline_records(config: dict[str, Any]) -> list[dict[str, Any]] | None:
    inline = config.get("inline_records")
    if inline is None:
        return load_inline_rows(config)
    if isinstance(inline, list):
        records = inline
    else:
        try:
            records = json.loads(str(inline))
        except json.JSONDecodeError as exc:
            raise ValidationError("inline_records must be valid JSON array") from exc
    if not isinstance(records, list):
        raise ValidationError("inline_records must be a JSON array")
    normalized: list[dict[str, Any]] = []
    for record in records:
        if not isinstance(record, dict):
            raise ValidationError("inline_records items must be objects")
        if "fields" in record:
            normalized.append(flatten_airtable_record(record))
        else:
            normalized.append({str(k): serialize_cell(v) for k, v in flatten_record(record).items()})
    return normalized


def extract_inline_records_batch(
    *,
    config: dict[str, Any],
    records: list[dict[str, Any]],
    cursor: SyncCursor,
    mode: SyncMode,
    batch_size: int,
    table_name: str,
) -> ExtractBatch:
    return extract_inline_table_batch(
        config=config,
        inline_rows=records,
        cursor=cursor,
        mode=mode,
        batch_size=batch_size,
        table_name=table_name,
    )


def resolve_api_key(credentials: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = credentials.get(key)
        if value:
            return str(value).strip()
    raise ValidationError("API key is required in credentials")


def flatten_airtable_record(record: dict[str, Any]) -> dict[str, Any]:
    row: dict[str, Any] = {
        "id": serialize_cell(record.get("id")),
        "createdTime": serialize_cell(record.get("createdTime")),
    }
    fields = record.get("fields") or {}
    if not isinstance(fields, dict):
        return row
    for key, value in fields.items():
        if isinstance(value, (dict, list)):
            row[str(key)] = serialize_cell(value)
        else:
            row[str(key)] = serialize_cell(value)
    return row
