"""Sync / extract DTOs."""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import StrEnum
from typing import Any


class SyncMode(StrEnum):
    FULL = "full"
    INCREMENTAL = "incremental"


@dataclass(frozen=True)
class SyncCursor:
    """Opaque resume state owned by the connector implementation."""

    state: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def empty(cls) -> SyncCursor:
        return cls(state={})


@dataclass(frozen=True)
class ExtractBatch:
    """One page of extracted rows plus the cursor for the next call."""

    rows: tuple[dict[str, Any], ...]
    next_cursor: SyncCursor
    has_more: bool
    table_name: str | None = None
