"""Pydantic models for parsed markdown rule documents."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, ConfigDict


class RuleFrontmatter(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    version: str
    name: str
    owner: str
    target_modules: list[str]
    connectors: list[str]


class ParsedTag(BaseModel):
    model_config = ConfigDict(extra="forbid")

    tag_type: str
    identifier: str
    attributes: Optional[dict[str, str]] = None


class RuleDocument(BaseModel):
    model_config = ConfigDict(extra="forbid")

    frontmatter: RuleFrontmatter
    raw_content: str
    extracted_tags: list[ParsedTag]
