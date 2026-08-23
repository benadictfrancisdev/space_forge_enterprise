"""Deterministic .rule.md → AST compilation & security validation (no exec)."""
from __future__ import annotations

import ast
import re

# Whitelisted AST node types — pure boolean/comparison/arithmetic expressions only.
_ALLOWED = (
    ast.Expression, ast.BoolOp, ast.BinOp, ast.UnaryOp, ast.Compare,
    ast.Name, ast.Load, ast.Attribute, ast.Constant,
    ast.And, ast.Or, ast.Not,
    ast.Add, ast.Sub, ast.Mult, ast.Div, ast.Mod,
    ast.Gt, ast.GtE, ast.Lt, ast.LtE, ast.Eq, ast.NotEq,
    ast.USub, ast.UAdd,
)

_TAG_RE = re.compile(r"@([a-zA-Z0-9_.:\-]+)")
_KIND_RE = re.compile(r"@(module|metric|connector|dataset)\s+([a-zA-Z0-9_.:\-]+)", re.IGNORECASE)
_WHEN_RE = re.compile(r"WHEN\s+(.+?)\s+THEN", re.IGNORECASE | re.DOTALL)


def extract_condition(source_md: str) -> str:
    m = _WHEN_RE.search(source_md or "")
    if m:
        return m.group(1).strip()
    # fallback: first line that looks like a comparison
    for line in (source_md or "").splitlines():
        if any(op in line for op in (">", "<", "==", ">=", "<=", "!=")):
            return line.strip().lstrip("- ").strip()
    return ""


def _dotted_name(node: ast.AST) -> str | None:
    if isinstance(node, ast.Name):
        return node.id
    if isinstance(node, ast.Attribute):
        base = _dotted_name(node.value)
        return f"{base}.{node.attr}" if base else node.attr
    return None


def categorize(name: str) -> str:
    if "." in name or name.endswith("_ms") or name.endswith("_rate"):
        return "metric"
    if name.startswith("conn_") or name.startswith("connector"):
        return "connector"
    if name.startswith("dataset") or name.startswith("ds_"):
        return "dataset"
    return "module"


def extract_entities(source_md: str, condition: str = "") -> list[dict]:
    seen: dict[str, dict] = {}
    src = source_md or ""
    _KINDS = {"module", "metric", "connector", "dataset"}
    # Typed declarations: `@module payments` -> {type: module, name: payments}
    for kind, value in _KIND_RE.findall(src):
        seen[value] = {"type": kind.lower(), "name": value}
    # Bare inline tags (skip the kind keywords themselves)
    for tag in _TAG_RE.findall(src):
        if tag.lower() in _KINDS or tag in seen:
            continue
        seen[tag] = {"type": categorize(tag), "name": tag}
    # identifiers referenced in the condition are metrics/modules too
    try:
        tree = ast.parse(condition or "", mode="eval")
        for node in ast.walk(tree):
            nm = _dotted_name(node) if isinstance(node, (ast.Name, ast.Attribute)) else None
            if nm and nm not in seen:
                seen[nm] = {"type": categorize(nm), "name": nm}
    except SyntaxError:
        pass
    return list(seen.values())


def validate_rule(source_md: str, condition: str | None = None) -> dict:
    cond = (condition or "").strip() or extract_condition(source_md)
    errors: list[str] = []
    security: list[str] = []
    ast_nodes: list[str] = []
    valid = True

    if not cond:
        return {
            "valid": False,
            "condition": "",
            "entities": extract_entities(source_md),
            "ast_nodes": [],
            "security_ok": True,
            "errors": ["No condition found. Use `WHEN <expr> THEN ...`"],
            "security_violations": [],
        }

    try:
        tree = ast.parse(cond, mode="eval")
        for node in ast.walk(tree):
            ast_nodes.append(type(node).__name__)
            if not isinstance(node, _ALLOWED):
                valid = False
                security.append(f"Disallowed construct: {type(node).__name__}")
            if isinstance(node, ast.Call):
                security.append("Function calls are not permitted in rules")
    except SyntaxError as exc:
        valid = False
        errors.append(f"Syntax error: {exc.msg} (col {exc.offset})")

    return {
        "valid": valid and not security,
        "condition": cond,
        "entities": extract_entities(source_md, cond),
        "ast_nodes": sorted(set(ast_nodes)),
        "security_ok": not security,
        "errors": errors,
        "security_violations": security,
    }
