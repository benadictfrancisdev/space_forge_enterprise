"""Mock connector that intercepts sandbox action triggers."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


class MockActionInterceptor:
    """Logs simulated actions instead of calling production connectors."""

    def __init__(self) -> None:
        self.action_log: list[dict[str, Any]] = []

    async def execute_action(self, module_tag: str, payload: dict) -> dict:
        entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "action": "BLOCKED_BY_SANDBOX",
            "target": module_tag,
            "payload_simulated": payload,
        }
        self.action_log.append(entry)

        return {
            "status_code": 200,
            "body": {
                "ok": True,
                "sandbox": True,
                "message": "Action intercepted by shadow sandbox",
                "target": module_tag,
            },
        }
