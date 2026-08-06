"""Shared helpers for file-backed connectors (CSV / Excel)."""
from __future__ import annotations

import base64
import csv
import io
import re
from datetime import datetime
from typing import Any
from uuid import UUID

from apps.core.exceptions import ValidationError
from apps.integrations.domain.schema import DiscoveredColumn, DiscoveredSchema, DiscoveredTable


def as_bool(value: Any, default: bool = True) -> bool:
    if value is None or value == "":
        return default
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y", "on"}


def load_bytes(*, config: dict[str, Any], credentials: dict[str, Any] | None = None) -> bytes:
    """Load file bytes from inline config (tests) or StorageObject id."""
    credentials = credentials or {}
    inline_b64 = config.get("inline_b64") or credentials.get("inline_b64")
    if inline_b64:
        try:
            return base64.b64decode(str(inline_b64))
        except Exception as exc:  # noqa: BLE001
            raise ValidationError("inline_b64 is not valid base64") from exc

    inline_text = config.get("inline_text")
    if inline_text is not None:
        return str(inline_text).encode(str(config.get("encoding") or "utf-8"))

    storage_object_id = config.get("storage_object_id")
    if not storage_object_id:
        raise ValidationError("storage_object_id (or inline_text/inline_b64) is required")

    try:
        UUID(str(storage_object_id))
    except ValueError as exc:
        raise ValidationError("storage_object_id must be a UUID") from exc

    from apps.storage.application.factory import get_object_storage
    from apps.storage.infrastructure.models import StorageObject

    try:
        obj = StorageObject.objects.get(id=storage_object_id)
    except StorageObject.DoesNotExist as exc:
        raise ValidationError("storage_object_id not found") from exc

    return get_object_storage().download(key=obj.key)


def infer_data_type(values: list[Any]) -> str:
    samples = [v for v in values if v is not None and str(v).strip() != ""]
    if not samples:
        return "string"

    def _all(pred) -> bool:
        return all(pred(v) for v in samples)

    def is_bool(v: Any) -> bool:
        return str(v).strip().lower() in {"true", "false", "0", "1", "yes", "no"}

    def is_int(v: Any) -> bool:
        try:
            int(str(v).strip())
            return bool(re.fullmatch(r"-?\d+", str(v).strip()))
        except ValueError:
            return False

    def is_float(v: Any) -> bool:
        try:
            float(str(v).strip())
            return True
        except ValueError:
            return False

    def is_date(v: Any) -> bool:
        text = str(v).strip()
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                datetime.strptime(text[:10], fmt)
                return True
            except ValueError:
                continue
        return False

    if _all(is_bool):
        return "boolean"
    if _all(is_int):
        return "integer"
    if _all(is_float):
        return "float"
    if _all(is_date):
        return "date"
    return "string"


def rows_to_schema(
    *,
    table_name: str,
    headers: list[str],
    sample_rows: list[dict[str, Any]],
    row_estimate: int | None = None,
) -> DiscoveredSchema:
    columns: list[DiscoveredColumn] = []
    for header in headers:
        values = [row.get(header) for row in sample_rows]
        columns.append(
            DiscoveredColumn(
                name=header,
                data_type=infer_data_type(values),
                nullable=any(v is None or str(v).strip() == "" for v in values)
                if sample_rows
                else True,
                is_primary_key=False,
            )
        )
    table = DiscoveredTable(
        name=table_name,
        columns=tuple(columns),
        primary_key=(),
        row_estimate=row_estimate,
    )
    return DiscoveredSchema(tables=(table,), metadata={"source": "file"})


def parse_csv_rows(
    raw: bytes,
    *,
    encoding: str = "utf-8",
    delimiter: str = ",",
    has_header: bool = True,
) -> tuple[list[str], list[dict[str, Any]]]:
    text = raw.decode(encoding, errors="replace")
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    rows_list = list(reader)
    if not rows_list:
        return [], []

    if has_header:
        headers = [str(h).strip() or f"col_{i+1}" for i, h in enumerate(rows_list[0])]
        data_rows = rows_list[1:]
    else:
        width = max(len(r) for r in rows_list)
        headers = [f"col_{i+1}" for i in range(width)]
        data_rows = rows_list

    parsed: list[dict[str, Any]] = []
    for row in data_rows:
        item: dict[str, Any] = {}
        for i, header in enumerate(headers):
            item[header] = row[i] if i < len(row) else ""
        parsed.append(item)
    return headers, parsed


def slice_rows(
    rows: list[dict[str, Any]],
    *,
    offset: int,
    batch_size: int,
) -> tuple[list[dict[str, Any]], int, bool]:
    if batch_size < 1:
        batch_size = 1
    offset = max(0, offset)
    end = min(offset + batch_size, len(rows))
    chunk = rows[offset:end]
    return chunk, end, end < len(rows)
