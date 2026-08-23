"""Unit tests for the SpaceForge V2 markdown rule parser."""
from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.engine.markdown_logic.models import RuleFrontmatter
from app.engine.markdown_logic.parser import MarkdownRuleParser

SAMPLE_FRONTMATTER = """---
id: checkout-latency-guard
version: "1.0.0"
name: Checkout Latency Guard
owner: platform-team
target_modules:
  - api/v1/checkout
  - services/payment
connectors:
  - stripe_production
  - postgres
---
"""


def test_parse_valid_frontmatter():
    parser = MarkdownRuleParser()
    valid_yaml = SAMPLE_FRONTMATTER + "\n# Rule body\n"

    frontmatter, body = parser._extract_frontmatter(valid_yaml)
    assert frontmatter.id == "checkout-latency-guard"
    assert frontmatter.version == "1.0.0"
    assert frontmatter.target_modules == ["api/v1/checkout", "services/payment"]
    assert body.startswith("# Rule body")

    incomplete_yaml = """---
version: "1.0.0"
name: Missing ID
owner: platform-team
target_modules: []
connectors: []
---
"""
    with pytest.raises(ValidationError):
        parser._extract_frontmatter(incomplete_yaml)


def test_extract_basic_tags():
    parser = MarkdownRuleParser()
    body = (
        "Monitor @module:services/payment and connect via @connector:postgres "
        "for checkout flows."
    )

    tags = parser._extract_tags(body)

    assert len(tags) == 2
    assert tags[0].tag_type == "module"
    assert tags[0].identifier == "services/payment"
    assert tags[0].attributes is None
    assert tags[1].tag_type == "connector"
    assert tags[1].identifier == "postgres"
    assert tags[1].attributes is None


def test_extract_tags_with_attributes():
    parser = MarkdownRuleParser()
    body = 'Alert on @metric:db.locks{table="users", type="write"} during peak traffic.'

    tags = parser._extract_tags(body)

    assert len(tags) == 1
    assert tags[0].tag_type == "metric"
    assert tags[0].identifier == "db.locks"
    assert tags[0].attributes == {"table": "users", "type": "write"}


def test_full_rule_document():
    parser = MarkdownRuleParser()
    raw_md = """---
id: checkout-latency-guard
version: "1.0.0"
name: Checkout Latency Guard
owner: platform-team
target_modules:
  - api/v1/checkout
connectors:
  - stripe_production
---

# Checkout Latency Guard

Applies to @module:api/v1/checkout and @connector:stripe_production.

Track @metric:api.latency{endpoint="/api/v1/checkout"} and
@metric:db.locks{table="users", type="write"}.

```rule
WHEN api.latency > 500ms
THEN alert.on_call("checkout-slo")
```
"""

    document = parser.parse(raw_md)

    assert document.frontmatter.id == "checkout-latency-guard"
    assert document.frontmatter.connectors == ["stripe_production"]
    assert "WHEN api.latency > 500ms" in document.raw_content
    assert document.raw_content.startswith("# Checkout Latency Guard")
    assert len(document.extracted_tags) == 4

    module_tag = document.extracted_tags[0]
    assert module_tag.tag_type == "module"
    assert module_tag.identifier == "api/v1/checkout"

    connector_tag = document.extracted_tags[1]
    assert connector_tag.tag_type == "connector"
    assert connector_tag.identifier == "stripe_production"

    latency_tag = document.extracted_tags[2]
    assert latency_tag.tag_type == "metric"
    assert latency_tag.identifier == "api.latency"
    assert latency_tag.attributes == {"endpoint": "/api/v1/checkout"}

    locks_tag = document.extracted_tags[3]
    assert locks_tag.attributes == {"table": "users", "type": "write"}


def test_malformed_tags_are_skipped():
    parser = MarkdownRuleParser()
    body = (
        "Valid @module:services/payment, broken @metric:bad{unclosed, "
        "and @connector:postgres."
    )

    tags = parser._extract_tags(body)

    assert len(tags) == 2
    assert tags[0].identifier == "services/payment"
    assert tags[1].identifier == "postgres"


def test_frontmatter_model_rejects_unknown_fields():
    with pytest.raises(ValidationError):
        RuleFrontmatter.model_validate(
            {
                "id": "rule-1",
                "version": "1.0.0",
                "name": "Test",
                "owner": "team",
                "target_modules": [],
                "connectors": [],
                "unexpected": True,
            }
        )
