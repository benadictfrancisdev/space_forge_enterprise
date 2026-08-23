"""Safe runtime evaluation for compiled markdown rules."""
from __future__ import annotations

import ast
from typing import Any

from app.engine.markdown_logic.ast_compiler import ExecutableRule
from app.engine.markdown_logic.exceptions import SecurityError


def _eval_node(node: ast.AST, context: dict[str, Any]) -> Any:
    if isinstance(node, ast.Expression):
        return _eval_node(node.body, context)

    if isinstance(node, ast.Constant):
        return node.value

    if isinstance(node, ast.Name):
        if node.id not in context:
            raise KeyError(f"Missing context value for variable: {node.id}")
        return context[node.id]

    if isinstance(node, ast.UnaryOp):
        operand = _eval_node(node.operand, context)
        if isinstance(node.op, ast.Not):
            return not operand
        if isinstance(node.op, ast.USub):
            return -operand
        if isinstance(node.op, ast.UAdd):
            return +operand
        raise SecurityError(f"Disallowed unary operator: {type(node.op).__name__}")

    if isinstance(node, ast.BinOp):
        left = _eval_node(node.left, context)
        right = _eval_node(node.right, context)
        if isinstance(node.op, ast.Add):
            return left + right
        if isinstance(node.op, ast.Sub):
            return left - right
        if isinstance(node.op, ast.Mult):
            return left * right
        if isinstance(node.op, ast.Div):
            return left / right
        if isinstance(node.op, ast.Mod):
            return left % right
        raise SecurityError(f"Disallowed binary operator: {type(node.op).__name__}")

    if isinstance(node, ast.BoolOp):
        values = [_eval_node(value, context) for value in node.values]
        if isinstance(node.op, ast.And):
            result = True
            for value in values:
                result = result and value
            return result
        if isinstance(node.op, ast.Or):
            result = False
            for value in values:
                result = result or value
            return result
        raise SecurityError(f"Disallowed boolean operator: {type(node.op).__name__}")

    if isinstance(node, ast.Compare):
        left = _eval_node(node.left, context)
        result = True
        current = left
        for operator, comparator in zip(node.ops, node.comparators, strict=True):
            right = _eval_node(comparator, context)
            if isinstance(operator, ast.Gt):
                result = result and current > right
            elif isinstance(operator, ast.Lt):
                result = result and current < right
            elif isinstance(operator, ast.GtE):
                result = result and current >= right
            elif isinstance(operator, ast.LtE):
                result = result and current <= right
            elif isinstance(operator, ast.Eq):
                result = result and current == right
            elif isinstance(operator, ast.NotEq):
                result = result and current != right
            else:
                raise SecurityError(
                    f"Disallowed comparison operator: {type(operator).__name__}"
                )
            current = right
        return result

    raise SecurityError(f"Disallowed AST node during evaluation: {type(node).__name__}")


def evaluate_rule(rule: ExecutableRule, context: dict[str, Any]) -> bool:
    """Evaluate a compiled rule condition against a telemetry context."""
    result = _eval_node(rule.ast_tree, context)
    return bool(result)
