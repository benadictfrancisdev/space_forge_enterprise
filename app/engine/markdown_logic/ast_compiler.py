"""Compile markdown rule conditions into safe, evaluable AST."""
from __future__ import annotations

import ast
import re
from typing import Any

from pydantic import BaseModel, ConfigDict, field_validator

from app.engine.markdown_logic.exceptions import SecurityError
from app.engine.markdown_logic.models import RuleDocument

WHEN_THEN_PATTERN = re.compile(r"WHEN\s+(.*?)\s+THEN\s+(.*)", re.IGNORECASE | re.DOTALL)

TAG_REFERENCE_PATTERN = re.compile(
    r"@(?P<tag_type>[a-zA-Z0-9_]+)"
    r":(?P<identifier>[a-zA-Z0-9_][a-zA-Z0-9_/\-]*"
    r"(?:\.[a-zA-Z0-9_][a-zA-Z0-9_]*)*)"
)

_ALLOWED_NODE_TYPES = (
    ast.Expression,
    ast.Compare,
    ast.BoolOp,
    ast.BinOp,
    ast.UnaryOp,
    ast.Name,
    ast.Load,
    ast.Constant,
    ast.And,
    ast.Or,
    ast.Not,
    ast.USub,
    ast.UAdd,
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.Mod,
    ast.Gt,
    ast.Lt,
    ast.Eq,
    ast.NotEq,
    ast.GtE,
    ast.LtE,
)


class ExecutableRule(BaseModel):
    model_config = ConfigDict(arbitrary_types_allowed=True)

    raw_condition: str
    raw_action: str
    sanitized_condition: str
    ast_tree: ast.Expression
    variables: list[str]

    @field_validator("ast_tree")
    @classmethod
    def _validate_ast_tree_type(cls, value: ast.AST) -> ast.Expression:
        if not isinstance(value, ast.Expression):
            raise TypeError("ast_tree must be an ast.Expression")
        return value


class SafeASTValidator(ast.NodeVisitor):
    """Reject any AST nodes outside the approved safe subset."""

    def visit(self, node: ast.AST) -> None:
        if not isinstance(node, _ALLOWED_NODE_TYPES):
            raise SecurityError(
                f"Disallowed AST node: {type(node).__name__}"
            )
        super().visit(node)


class RuleCompiler:
    """Compile WHEN...THEN statements from a RuleDocument into ExecutableRule objects."""

    def _extract_statements(self, raw_content: str) -> list[tuple[str, str]]:
        statements: list[tuple[str, str]] = []
        for match in WHEN_THEN_PATTERN.finditer(raw_content):
            condition = match.group(1).strip()
            action = match.group(2).strip()
            if condition and action:
                statements.append((condition, action))
        return statements

    def _tag_to_variable(self, tag_type: str, identifier: str) -> str:
        safe_identifier = re.sub(r"[^a-zA-Z0-9_]", "_", identifier)
        return f"var_{tag_type}_{safe_identifier}"

    def _sanitize_variables(self, condition_str: str) -> tuple[str, list[str]]:
        variables: list[str] = []

        def replace_tag(match: re.Match[str]) -> str:
            variable = self._tag_to_variable(
                match.group("tag_type"),
                match.group("identifier"),
            )
            if variable not in variables:
                variables.append(variable)
            return variable

        sanitized = TAG_REFERENCE_PATTERN.sub(replace_tag, condition_str)
        return sanitized, variables

    def _build_safe_ast(self, sanitized_condition: str) -> ast.Expression:
        try:
            parsed = ast.parse(sanitized_condition, mode="eval")
        except SyntaxError as exc:
            raise SecurityError(f"Invalid condition syntax: {exc}") from exc

        if not isinstance(parsed, ast.Expression):
            raise SecurityError("Condition must compile to an expression")

        SafeASTValidator().visit(parsed)
        return parsed

    def compile(self, rule_doc: RuleDocument) -> list[ExecutableRule]:
        executable_rules: list[ExecutableRule] = []

        for raw_condition, raw_action in self._extract_statements(rule_doc.raw_content):
            sanitized_condition, variables = self._sanitize_variables(raw_condition)
            ast_tree = self._build_safe_ast(sanitized_condition)
            executable_rules.append(
                ExecutableRule(
                    raw_condition=raw_condition,
                    raw_action=raw_action,
                    sanitized_condition=sanitized_condition,
                    ast_tree=ast_tree,
                    variables=variables,
                )
            )

        return executable_rules
