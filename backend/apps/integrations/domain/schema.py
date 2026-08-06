"""Schema discovery DTOs."""
from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class DiscoveredColumn:
    name: str
    data_type: str
    nullable: bool = True
    is_primary_key: bool = False


@dataclass(frozen=True)
class DiscoveredRelationship:
    from_table: str
    from_column: str
    to_table: str
    to_column: str


@dataclass(frozen=True)
class DiscoveredTable:
    name: str
    columns: tuple[DiscoveredColumn, ...]
    primary_key: tuple[str, ...] = ()
    relationships: tuple[DiscoveredRelationship, ...] = ()
    row_estimate: int | None = None


@dataclass(frozen=True)
class DiscoveredSchema:
    tables: tuple[DiscoveredTable, ...]
    metadata: dict[str, Any] = field(default_factory=dict)


def schema_to_tables_payload(schema: DiscoveredSchema) -> list[dict[str, Any]]:
    """Serialize DiscoveredSchema tables to JSON-friendly list."""
    tables: list[dict[str, Any]] = []
    for table in schema.tables:
        tables.append(
            {
                "name": table.name,
                "columns": [asdict(col) for col in table.columns],
                "primary_key": list(table.primary_key),
                "relationships": [asdict(rel) for rel in table.relationships],
                "row_estimate": table.row_estimate,
            }
        )
    return tables


def schema_fingerprint(tables_payload: list[dict[str, Any]]) -> str:
    """Stable hash for change detection (idempotent discovery)."""
    canonical = json.dumps(tables_payload, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()
