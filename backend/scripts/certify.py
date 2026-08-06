#!/usr/bin/env python
"""Phase 0.1.1 platform certification smoke checks against a running stack."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

BASE = os.environ.get("SPACEFORGE_API_BASE", "http://localhost:8000")


def get(path: str) -> tuple[int, dict]:
    req = urllib.request.Request(f"{BASE}{path}", headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        return resp.status, json.loads(resp.read().decode())


def main() -> int:
    failures: list[str] = []
    try:
        status, body = get("/health/")
        if status != 200 or body.get("status") != "ok":
            failures.append(f"health failed: {status} {body}")
        else:
            print("OK health", body)
    except Exception as exc:  # noqa: BLE001
        failures.append(f"health error: {exc}")

    try:
        status, body = get("/health/ready/")
        if status != 200 or body.get("status") != "ready":
            failures.append(f"ready failed: {status} {body}")
        else:
            print("OK ready", json.dumps(body.get("checks"), indent=2))
    except urllib.error.HTTPError as exc:
        payload = exc.read().decode()
        failures.append(f"ready HTTP {exc.code}: {payload}")
    except Exception as exc:  # noqa: BLE001
        failures.append(f"ready error: {exc}")

    if failures:
        print("CERTIFICATION FAILED", file=sys.stderr)
        for item in failures:
            print("-", item, file=sys.stderr)
        return 1
    print("CERTIFICATION PASSED")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
