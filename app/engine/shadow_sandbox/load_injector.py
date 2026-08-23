"""Concurrent load injector for shadow sandbox rule stress testing."""
from __future__ import annotations

import asyncio
import random
import re
import time
from typing import Any, TypedDict
from uuid import UUID, uuid4

from app.engine.markdown_logic.ast_compiler import ExecutableRule
from app.engine.markdown_logic.runtime import evaluate_rule
from app.engine.shadow_sandbox.connector_mock import MockActionInterceptor
from app.engine.telemetry_mesh.models import TelemetryEvent

MODULE_TAG_PATTERN = re.compile(r"@module:([a-zA-Z0-9_.-]+)")


class SandboxReport(TypedDict):
    total_execution_time_seconds: float
    average_latency_per_evaluation_seconds: float
    breach_count: int
    failed_events: int
    dropped_events: int
    processed_events: int
    intercepted_actions: int


def _metric_variable_name(metric_name: str) -> str:
    safe_identifier = re.sub(r"[^a-zA-Z0-9_]", "_", metric_name)
    return f"var_metric_{safe_identifier}"


def build_evaluation_context(rule: ExecutableRule, event: TelemetryEvent) -> dict[str, Any]:
    """Map a telemetry event into the compiled rule variable context."""
    context: dict[str, Any] = {}

    for variable in rule.variables:
        if variable.startswith("var_metric_"):
            if _metric_variable_name(event.metric_name) == variable:
                context[variable] = event.value
            else:
                context[variable] = event.metadata.get(variable, 0.0)
        else:
            context[variable] = event.metadata.get(variable, 0.0)

    return context


def extract_module_tag(raw_action: str) -> str:
    match = MODULE_TAG_PATTERN.search(raw_action)
    return match.group(1) if match else "unknown"


class ConcurrencySimulator:
    """Blast compiled rules with concurrent telemetry to detect bottlenecks."""

    def __init__(
        self,
        *,
        interceptor: MockActionInterceptor | None = None,
        organization_id: UUID | None = None,
        metric_name: str = "api.latency",
        metric_min: float = 100.0,
        metric_max: float = 800.0,
    ) -> None:
        self.interceptor = interceptor or MockActionInterceptor()
        self.organization_id = organization_id or uuid4()
        self.metric_name = metric_name
        self.metric_min = metric_min
        self.metric_max = metric_max

    def _generate_events(self, event_count: int) -> list[TelemetryEvent]:
        return [
            TelemetryEvent(
                organization_id=self.organization_id,
                source="shadow_sandbox",
                metric_name=self.metric_name,
                value=random.uniform(self.metric_min, self.metric_max),
            )
            for _ in range(event_count)
        ]

    async def _evaluate_event(
        self,
        rule_ast: ExecutableRule,
        event: TelemetryEvent,
        semaphore: asyncio.Semaphore,
    ) -> dict[str, Any]:
        async with semaphore:
            started = time.perf_counter()
            try:
                context = build_evaluation_context(rule_ast, event)
                breached = evaluate_rule(rule_ast, context)
                latency_seconds = time.perf_counter() - started

                if breached:
                    module_tag = extract_module_tag(rule_ast.raw_action)
                    await self.interceptor.execute_action(
                        module_tag,
                        {
                            "event_id": str(event.event_id),
                            "metric_name": event.metric_name,
                            "value": event.value,
                            "metadata": event.metadata,
                        },
                    )

                return {
                    "success": True,
                    "breached": breached,
                    "latency_seconds": latency_seconds,
                }
            except Exception as exc:
                return {
                    "success": False,
                    "breached": False,
                    "latency_seconds": time.perf_counter() - started,
                    "error": str(exc),
                }

    async def run_stress_test(
        self,
        rule_ast: ExecutableRule,
        event_count: int = 1000,
        concurrency_limit: int = 100,
    ) -> SandboxReport:
        events = self._generate_events(event_count)
        semaphore = asyncio.Semaphore(concurrency_limit)
        started = time.perf_counter()

        results = await asyncio.gather(
            *(
                self._evaluate_event(rule_ast, event, semaphore)
                for event in events
            )
        )

        total_execution_time_seconds = time.perf_counter() - started
        successful = [result for result in results if result["success"]]
        failed_events = len(results) - len(successful)
        latencies = [result["latency_seconds"] for result in successful]
        breach_count = sum(1 for result in successful if result["breached"])

        average_latency = (
            sum(latencies) / len(latencies) if latencies else 0.0
        )

        return SandboxReport(
            total_execution_time_seconds=total_execution_time_seconds,
            average_latency_per_evaluation_seconds=average_latency,
            breach_count=breach_count,
            failed_events=failed_events,
            dropped_events=failed_events,
            processed_events=len(successful),
            intercepted_actions=len(self.interceptor.action_log),
        )
