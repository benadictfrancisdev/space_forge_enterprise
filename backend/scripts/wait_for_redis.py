#!/usr/bin/env python
"""Wait until Redis accepts connections."""
from __future__ import annotations

import os
import sys
import time
from urllib.parse import urlparse

import redis


def main() -> int:
    url = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or 6379
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            client = redis.Redis(host=host, port=port, socket_connect_timeout=2)
            if client.ping():
                print("Redis is ready")
                return 0
        except Exception as exc:  # noqa: BLE001
            print(f"Redis not ready: {exc}")
            time.sleep(1)
    print("Timed out waiting for Redis", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
