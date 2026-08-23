"""Parser for SpaceForge V2 `.rule.md` markdown-as-logic documents."""
from __future__ import annotations

import re

import yaml
from pydantic import ValidationError

from app.engine.markdown_logic.exceptions import FrontmatterError, MalformedTagError
from app.engine.markdown_logic.models import ParsedTag, RuleDocument, RuleFrontmatter

FRONTMATTER_PATTERN = re.compile(r"\A---\s*\r?\n(.*?)\r?\n---\s*(?:\r?\n|$)", re.DOTALL)

TAG_PATTERN = re.compile(
    r"@(?P<tag_type>[a-zA-Z0-9_]+)"
    r":(?P<identifier>[a-zA-Z0-9_][a-zA-Z0-9_/\-]*"
    r"(?:\.[a-zA-Z0-9_][a-zA-Z0-9_]*)*)"
    r"(?:\{(?P<attributes>[^}]*)\})?"
)

ATTRIBUTE_PAIR_PATTERN = re.compile(r'(\w+)\s*=\s*"([^"]*)"')


class MarkdownRuleParser:
    """Ingest raw markdown rules and extract validated frontmatter plus `@` tags."""

    def _extract_frontmatter(self, raw_md: str) -> tuple[RuleFrontmatter, str]:
        match = FRONTMATTER_PATTERN.match(raw_md)
        if not match:
            raise FrontmatterError("Missing YAML frontmatter block delimited by ---")

        yaml_text = match.group(1)
        body = raw_md[match.end() :]

        try:
            data = yaml.safe_load(yaml_text)
        except yaml.YAMLError as exc:
            raise FrontmatterError("Invalid YAML frontmatter") from exc

        if not isinstance(data, dict):
            raise FrontmatterError("Frontmatter must be a YAML mapping")

        try:
            frontmatter = RuleFrontmatter.model_validate(data)
        except ValidationError:
            raise

        return frontmatter, body

    def _parse_attributes(self, attributes_text: str) -> dict[str, str]:
        pairs = ATTRIBUTE_PAIR_PATTERN.findall(attributes_text)
        if not pairs:
            raise MalformedTagError(f"Could not parse tag attributes: {attributes_text!r}")

        return {key: value for key, value in pairs}

    def _extract_tags(self, body: str) -> list[ParsedTag]:
        tags: list[ParsedTag] = []

        for match in TAG_PATTERN.finditer(body):
            if match.end() < len(body) and body[match.end()] == "{":
                continue

            tag_type = match.group("tag_type")
            identifier = match.group("identifier")
            attributes_text = match.group("attributes")

            attributes = None
            if attributes_text is not None:
                try:
                    attributes = self._parse_attributes(attributes_text)
                except MalformedTagError:
                    continue

            tags.append(
                ParsedTag(
                    tag_type=tag_type,
                    identifier=identifier,
                    attributes=attributes,
                )
            )

        return tags

    def parse(self, raw_md: str) -> RuleDocument:
        frontmatter, body = self._extract_frontmatter(raw_md)
        extracted_tags = self._extract_tags(body)
        return RuleDocument(
            frontmatter=frontmatter,
            raw_content=body,
            extracted_tags=extracted_tags,
        )
