"""Unit tests for the SpaceForge V2 markdown rule AST compiler."""
from __future__ import annotations

import pytest

from app.engine.markdown_logic.ast_compiler import RuleCompiler
from app.engine.markdown_logic.exceptions import SecurityError
from app.engine.markdown_logic.models import RuleDocument, RuleFrontmatter
from app.engine.markdown_logic.runtime import evaluate_rule


def _rule_document(body: str) -> RuleDocument:
    return RuleDocument(
        frontmatter=RuleFrontmatter(
            id="latency-guard",
            version="1.0.0",
            name="Latency Guard",
            owner="platform-team",
            target_modules=["api/v1/checkout"],
            connectors=["stripe_production"],
        ),
        raw_content=body,
        extracted_tags=[],
    )


def test_compile_valid_rule():
    compiler = RuleCompiler()
    rule_doc = _rule_document(
        "WHEN @metric:api.latency > 500 THEN trigger @module:incident"
    )

    rules = compiler.compile(rule_doc)

    assert len(rules) == 1
    rule = rules[0]
    assert rule.raw_condition == "@metric:api.latency > 500"
    assert rule.raw_action == "trigger @module:incident"
    assert rule.sanitized_condition == "var_metric_api_latency > 500"
    assert rule.variables == ["var_metric_api_latency"]
    assert rule.ast_tree is not None


def test_security_blocks_function_calls():
    compiler = RuleCompiler()
    rule_doc = _rule_document(
        "WHEN __import__('os').system('rm -rf /') > 0 THEN trigger @module:incident"
    )

    with pytest.raises(SecurityError, match="Disallowed AST node"):
        compiler.compile(rule_doc)


def test_evaluate_rule_true():
    compiler = RuleCompiler()
    rule_doc = _rule_document(
        "WHEN @metric:api.latency > 500 THEN trigger @module:incident"
    )
    rule = compiler.compile(rule_doc)[0]

    assert evaluate_rule(rule, {"var_metric_api_latency": 600}) is True


def test_evaluate_rule_false():
    compiler = RuleCompiler()
    rule_doc = _rule_document(
        "WHEN @metric:api.latency > 500 THEN trigger @module:incident"
    )
    rule = compiler.compile(rule_doc)[0]

    assert evaluate_rule(rule, {"var_metric_api_latency": 400}) is False


def test_evaluate_boolean_logic():
    compiler = RuleCompiler()
    rule_doc = _rule_document(
        "WHEN @metric:api.latency > 500 and @metric:api.errors > 0 THEN alert"
    )
    rule = compiler.compile(rule_doc)[0]

    assert evaluate_rule(
        rule,
        {"var_metric_api_latency": 600, "var_metric_api_errors": 1},
    ) is True
    assert evaluate_rule(
        rule,
        {"var_metric_api_latency": 600, "var_metric_api_errors": 0},
    ) is False
