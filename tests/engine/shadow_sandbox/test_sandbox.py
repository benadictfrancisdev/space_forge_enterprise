"""Unit tests for the SpaceForge shadow sandbox."""
from __future__ import annotations

from uuid import UUID

import pytest

from app.engine.markdown_logic.ast_compiler import RuleCompiler
from app.engine.markdown_logic.models import RuleDocument, RuleFrontmatter
from app.engine.shadow_sandbox.connector_mock import MockActionInterceptor
from app.engine.shadow_sandbox.load_injector import ConcurrencySimulator

ORG_ID = UUID("11111111-1111-4111-8111-111111111111")


def _latency_rule() -> RuleDocument:
    return RuleDocument(
        frontmatter=RuleFrontmatter(
            id="latency-guard",
            version="1.0.0",
            name="Latency Guard",
            owner="platform-team",
            target_modules=["api/v1/checkout"],
            connectors=["stripe_production"],
        ),
        raw_content=(
            "WHEN @metric:api.latency > 500 "
            "THEN trigger @module:incident_loop"
        ),
        extracted_tags=[],
    )


@pytest.mark.asyncio
async def test_mock_interceptor_safely_logs():
    interceptor = MockActionInterceptor()

    response = await interceptor.execute_action(
        "incident_loop",
        {"action": "Refund Stripe User", "user_id": "cus_123"},
    )

    assert response["status_code"] == 200
    assert response["body"]["sandbox"] is True
    assert len(interceptor.action_log) == 1

    entry = interceptor.action_log[0]
    assert entry["action"] == "BLOCKED_BY_SANDBOX"
    assert entry["target"] == "incident_loop"
    assert entry["payload_simulated"]["action"] == "Refund Stripe User"
    assert "timestamp" in entry


@pytest.mark.asyncio
async def test_concurrency_simulator_under_load():
    compiler = RuleCompiler()
    rule_ast = compiler.compile(_latency_rule())[0]
    simulator = ConcurrencySimulator(organization_id=ORG_ID)

    report = await simulator.run_stress_test(
        rule_ast,
        event_count=500,
        concurrency_limit=100,
    )

    assert report["failed_events"] == 0
    assert report["dropped_events"] == 0
    assert report["processed_events"] == 500
    assert report["total_execution_time_seconds"] < 2.0
    assert report["breach_count"] > 0
    assert report["intercepted_actions"] == report["breach_count"]
    assert report["average_latency_per_evaluation_seconds"] >= 0.0
