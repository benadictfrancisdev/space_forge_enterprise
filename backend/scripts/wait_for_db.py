#!/usr/bin/env python
"""Wait until PostgreSQL accepts connections."""
from __future__ import annotations

import os
import sys
import time
from urllib.parse import urlparse

import psycopg


def main() -> int:
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        print("DATABASE_URL not set", file=sys.stderr)
        return 1

    parsed = urlparse(url)
    deadline = time.time() + 60
    while time.time() < deadline:
        try:
            with psycopg.connect(
                dbname=parsed.path.lstrip("/") or "postgres",
                user=parsed.username,
                password=parsed.password,
                host=parsed.hostname or "localhost",
                port=parsed.port or 5432,
                connect_timeout=3,
            ) as conn:
                conn.execute("SELECT 1")
            print("Database is ready")
            return 0
        except Exception as exc:  # noqa: BLE001
            print(f"Database not ready: {exc}")
            time.sleep(1)
    print("Timed out waiting for database", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())