"""
Operation Registry — Track 5.3

Register pluggable operation handlers instead of if/elif chains.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Protocol


class OperationHandler(Protocol):
    def __call__(self, payload: dict[str, Any]) -> dict[str, Any]: ...


@dataclass(frozen=True)
class OperationSpec:
    name: str
    handler: Callable[[dict[str, Any]], dict[str, Any]]
    description: str = ""
    default_confidence: float = 0.5


class OperationRegistry:
    def __init__(self) -> None:
        self._ops: dict[str, OperationSpec] = {}

    def register(
        self,
        name: str,
        handler: Callable[[dict[str, Any]], dict[str, Any]],
        *,
        description: str = "",
        default_confidence: float = 0.5,
    ) -> None:
        key = _normalize(name)
        self._ops[key] = OperationSpec(
            name=key,
            handler=handler,
            description=description,
            default_confidence=default_confidence,
        )

    def get(self, name: str) -> OperationSpec:
        key = _normalize(name)
        if key not in self._ops:
            raise KeyError(f"Unknown AI operation: {name}")
        return self._ops[key]

    def list_operations(self) -> list[str]:
        return sorted(self._ops.keys())

    def run(self, name: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        spec = self.get(name)
        return spec.handler(payload or {})


def _normalize(name: str) -> str:
    return (name or "").strip().lower().replace("_", "-")


# Global registry instance used by gateway + FastAPI
REGISTRY = OperationRegistry()
