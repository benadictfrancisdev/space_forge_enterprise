"""Shared helpers for document database connectors."""
from __future__ import annotations

import json
from typing import Any

from apps.core.exceptions import ValidationError
from apps.integrations.connectors._files import infer_data_type, rows_to_schema
from apps.integrations.connectors._http import flatten_record
from apps.integrations.connectors._sql import (
    extract_inline_table_batch,
    load_inline_rows,
    resolve_incremental_column,
    resolve_order_column,
    rows_to_discovered_schema,
    serialize_cell,
)
from apps.integrations.domain.schema import DiscoveredSchema
from apps.integrations.domain.sync import ExtractBatch, SyncCursor, SyncMode


def load_inline_documents(config: dict[str, Any]) -> list[dict[str, Any]] | None:
    inline = config.get("inline_documents")
    if inline is None:
        return load_inline_rows(config)
    if isinstance(inline, list):
        docs = inline
    else:
        try:
            docs = json.loads(str(inline))
        except json.JSONDecodeError as exc:
            raise ValidationError("inline_documents must be valid JSON array") from exc
    if not isinstance(docs, list):
        raise ValidationError("inline_documents must be a JSON array")
    rows: list[dict[str, Any]] = []
    for doc in docs:
        if not isinstance(doc, dict):
            raise ValidationError("inline_documents items must be objects")
        rows.append({k: serialize_cell(v) for k, v in flatten_record(doc).items()})
    return rows


def documents_to_schema(*, collection_name: str, rows: list[dict[str, Any]]) -> DiscoveredSchema:
    if not rows:
        return rows_to_discovered_schema(table_name=collection_name, rows=[])
    headers = list(rows[0].keys())
    return rows_to_schema(
        table_name=collection_name,
        headers=headers,
        sample_rows=rows[:50],
        row_estimate=len(rows),
    )


def extract_inline_documents_batch(
    *,
    config: dict[str, Any],
    documents: list[dict[str, Any]],
    cursor: SyncCursor,
    mode: SyncMode,
    batch_size: int,
    collection_name: str,
) -> ExtractBatch:
    return extract_inline_table_batch(
        config=config,
        inline_rows=documents,
        cursor=cursor,
        mode=mode,
        batch_size=batch_size,
        table_name=collection_name,
    )


def infer_field_type(values: list[Any]) -> str:
    return infer_data_type(values)
