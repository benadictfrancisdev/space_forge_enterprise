"""Lightweight metrics hooks — swap for Prometheus later without domain rewrites."""
from __future__ import annotations

import threading
from collections import defaultdict
from typing import Any

_lock = threading.Lock()
_counters: dict[str, int] = defaultdict(int)
_gauges: dict[str, float] = {}


def incr(name: str, value: int = 1, **labels: Any) -> None:
    key = _metric_key(name, labels)
    with _lock:
        _counters[key] += value


def gauge(name: str, value: float, **labels: Any) -> None:
    key = _metric_key(name, labels)
    with _lock:
        _gauges[key] = value


def snapshot() -> dict[str, Any]:
    with _lock:
        return {"counters": dict(_counters), "gauges": dict(_gauges)}


def render_prometheus() -> str:
    """Render in-memory counters/gauges as Prometheus text exposition."""
    snap = snapshot()
    lines: list[str] = []
    for key, value in sorted(snap["counters"].items()):
        name, labels = _split_metric_key(key)
        lines.append(f"# TYPE {name} counter")
        lines.append(f"{name}{labels} {value}")
    for key, value in sorted(snap["gauges"].items()):
        name, labels = _split_metric_key(key)
        lines.append(f"# TYPE {name} gauge")
        lines.append(f"{name}{labels} {value}")
    return "\n".join(lines) + ("\n" if lines else "")


def _split_metric_key(key: str) -> tuple[str, str]:
    if "{" not in key:
        return key, ""
    name, rest = key.split("{", 1)
    return name, "{" + rest


def reset() -> None:
    with _lock:
        _counters.clear()
        _gauges.clear()


def _metric_key(name: str, labels: dict[str, Any]) -> str:
    if not labels:
        return name
    parts = ",".join(f"{k}={v}" for k, v in sorted(labels.items()))
    return f"{name}{{{parts}}}"
