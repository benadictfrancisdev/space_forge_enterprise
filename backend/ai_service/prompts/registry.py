"""Versioned Prompt Registry — Track 8.2."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class PromptSpec:
    operation: str
    version: str
    system: str
    user_template: str
    description: str = ""

    @property
    def version_tag(self) -> str:
        return f"{self.operation}@{self.version}"


class PromptRegistry:
    def __init__(self) -> None:
        self._prompts: dict[str, PromptSpec] = {}

    def register(self, spec: PromptSpec) -> None:
        key = _normalize(spec.operation)
        self._prompts[key] = spec

    def get(self, operation: str) -> PromptSpec:
        key = _normalize(operation)
        if key not in self._prompts:
            raise KeyError(f"No prompt registered for operation: {operation}")
        return self._prompts[key]

    def render_user(self, operation: str, context: dict[str, Any], payload: dict[str, Any]) -> str:
        spec = self.get(operation)
        return spec.user_template.format(
            dataset_name=context.get("dataset_name") or "dataset",
            row_count=context.get("row_count") or 0,
            column_count=context.get("column_count") or 0,
            columns=", ".join((context.get("columns") or [])[:12]) or "n/a",
            numeric_columns=", ".join((context.get("numeric_columns") or [])[:8]) or "n/a",
            question=payload.get("question") or payload.get("message") or payload.get("query") or "",
            hypothesis=payload.get("hypothesis") or "",
            target_column=payload.get("target_column") or "",
            horizon=payload.get("horizon") or 7,
            module=payload.get("module") or "",
        )

    def list_versions(self) -> dict[str, str]:
        return {k: v.version_tag for k, v in sorted(self._prompts.items())}


def _normalize(name: str) -> str:
    return (name or "").strip().lower().replace("_", "-")


PROMPT_REGISTRY = PromptRegistry()

_DEFAULTS: list[PromptSpec] = [
    PromptSpec(
        operation="chat",
        version="v1",
        system="You are SpaceForge enterprise data analyst. Answer using dataset profile statistics only.",
        user_template=(
            "Dataset: {dataset_name} ({row_count} rows, {column_count} columns).\n"
            "Columns: {columns}.\nQuestion: {question}"
        ),
        description="Chat with Data",
    ),
    PromptSpec(
        operation="forecast",
        version="v1",
        system="Produce a time-series forecast with confidence bounds from profile statistics.",
        user_template=(
            "Forecast target={target_column} horizon={horizon} on {dataset_name} "
            "({row_count} rows). Numeric columns: {numeric_columns}."
        ),
        description="Predictive forecast",
    ),
    PromptSpec(
        operation="scientist",
        version="v1",
        system="Act as an AI data scientist. Return findings and next experiments.",
        user_template="Scientist analysis for {dataset_name}: {row_count} rows, columns {columns}.",
        description="AI Scientist",
    ),
    PromptSpec(
        operation="hypothesis",
        version="v1",
        system="Evaluate a statistical hypothesis using dataset profile context.",
        user_template="Hypothesis: {hypothesis}. Dataset: {dataset_name} ({row_count} rows).",
        description="Hypothesis testing",
    ),
    PromptSpec(
        operation="nlp",
        version="v1",
        system="Translate natural language to structured analytics intent.",
        user_template="NL query: {question}. Columns available: {columns}.",
        description="NLP engine",
    ),
    PromptSpec(
        operation="narrative",
        version="v1",
        system="Write an executive narrative from dataset profile.",
        user_template="Narrative for {dataset_name} with {row_count} rows and {column_count} columns.",
        description="Full narrative",
    ),
    PromptSpec(
        operation="anomaly",
        version="v1",
        system="Detect anomalies from profile statistics.",
        user_template="Anomaly scan on {dataset_name}: numeric columns {numeric_columns}.",
        description="Anomaly watch",
    ),
    PromptSpec(
        operation="decisions",
        version="v1",
        system="Recommend prioritized business decisions from data quality and KPI signals.",
        user_template="Decision feed for {dataset_name} ({row_count} rows).",
        description="Decision intelligence",
    ),
    PromptSpec(
        operation="indian-intel",
        version="v1",
        system="Indian business intelligence module analysis.",
        user_template="Module={module} dataset={dataset_name} rows={row_count} cols={columns}.",
        description="Indian business intel",
    ),
]

for _spec in _DEFAULTS:
    PROMPT_REGISTRY.register(_spec)
