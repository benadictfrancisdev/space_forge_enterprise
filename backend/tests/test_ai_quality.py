"""Track 8.2 — AI quality engineering tests."""
from __future__ import annotations

import pytest

from ai_service.context import build_ai_context, context_hash
from ai_service.gateway import list_prompt_versions, run_gateway
from ai_service.prompts.registry import PROMPT_REGISTRY
from ai_service.schemas import normalize_result_content


def test_prompt_registry_has_all_operations():
    versions = list_prompt_versions()
    for op in ("chat", "forecast", "scientist", "hypothesis", "nlp", "narrative", "anomaly", "decisions", "indian-intel"):
        assert op in versions
        assert "@v1" in versions[op]


def test_context_builder_enriches_payload():
    body = build_ai_context(
        {
            "profile": {
                "name": "sales.csv",
                "row_count": 100,
                "schema": {"columns": [{"name": "revenue"}, {"name": "region"}]},
                "statistics": {
                    "columns": {
                        "revenue": {"dtype": "number", "mean": 10, "null_pct": 0},
                        "region": {"dtype": "string", "null_pct": 5},
                    }
                },
                "profile_status": "ready",
            }
        }
    )
    ctx = body["context"]
    assert ctx["row_count"] == 100
    assert ctx["column_count"] == 2
    assert "revenue" in ctx["numeric_columns"]
    assert context_hash(ctx)


def test_gateway_returns_standard_envelope():
    out = run_gateway(
        "chat",
        {
            "question": "What is revenue trend?",
            "profile": {
                "row_count": 50,
                "schema": {"columns": [{"name": "revenue"}]},
                "statistics": {"columns": {"revenue": {"dtype": "number", "mean": 5}}},
            },
        },
    )
    assert out["operation"] == "chat"
    assert "result" in out
    assert "summary" in out["result"]
    assert "evaluation" in out
    assert out["metadata"]["prompt_version"] == "chat@v1"
    assert "context_hash" in out["metadata"]
    assert out["evaluation"]["provider"] == "heuristic"


def test_normalize_result_content_extracts_summary():
    norm = normalize_result_content({"answer": "Hello", "confidence": 72}, "chat")
    assert norm["summary"] == "Hello"
    assert norm["confidence"] == 0.72


def test_prompt_render_includes_question():
    rendered = PROMPT_REGISTRY.render_user(
        "chat",
        {"dataset_name": "ds", "row_count": 1, "column_count": 1, "columns": ["a"]},
        {"question": "top metric?"},
    )
    assert "top metric?" in rendered
