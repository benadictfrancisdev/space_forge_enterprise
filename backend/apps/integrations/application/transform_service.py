"""Declarative row transforms — rename, cast, null handling (Track 11.6)."""
from __future__ import annotations

from copy import deepcopy
from datetime import datetime
from typing import Any

from django.db import transaction

from apps.audit.application.services import AuditService
from apps.core.exceptions import NotFoundError, ValidationError
from apps.integrations.application.connection_service import ConnectionService
from apps.integrations.infrastructure.models import TransformRule

SUPPORTED_OPS = {"rename", "cast", "nulls"}
SUPPORTED_CASTS = {"string", "integer", "float", "boolean", "date"}


def _cast_value(value: Any, target: str) -> Any:
    if value is None or value == "":
        return None
    if target == "string":
        return str(value)
    if target == "integer":
        return int(float(str(value).strip()))
    if target == "float":
        return float(str(value).strip())
    if target == "boolean":
        if isinstance(value, bool):
            return value
        text = str(value).strip().lower()
        if text in {"1", "true", "yes", "y", "on"}:
            return True
        if text in {"0", "false", "no", "n", "off"}:
            return False
        raise ValueError(f"cannot cast {value!r} to boolean")
    if target == "date":
        if isinstance(value, datetime):
            return value.date().isoformat()
        text = str(value).strip()
        # Accept ISO-ish dates
        for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%d-%m-%Y", "%m/%d/%Y"):
            try:
                return datetime.strptime(text[:10], fmt).date().isoformat()
            except ValueError:
                continue
        # Fallback: fromisoformat
        return datetime.fromisoformat(text.replace("Z", "+00:00")).date().isoformat()
    raise ValueError(f"unsupported cast target: {target}")


def apply_steps(rows: list[dict[str, Any]], steps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Pure transform pipeline — no I/O."""
    if not steps:
        return rows

    current = [dict(row) for row in rows]
    for step in steps:
        if not isinstance(step, dict):
            raise ValidationError("Each transform step must be an object")
        op = str(step.get("op") or "").lower()
        if op not in SUPPORTED_OPS:
            raise ValidationError(f"Unsupported transform op: {op}")

        if op == "rename":
            mapping = step.get("mapping") or {}
            if not isinstance(mapping, dict):
                raise ValidationError("rename.mapping must be an object")
            renamed: list[dict[str, Any]] = []
            for row in current:
                next_row = dict(row)
                for src, dest in mapping.items():
                    if src in next_row:
                        next_row[str(dest)] = next_row.pop(src)
                renamed.append(next_row)
            current = renamed

        elif op == "cast":
            columns = step.get("columns") or {}
            if not isinstance(columns, dict):
                raise ValidationError("cast.columns must be an object")
            for col, target in columns.items():
                if target not in SUPPORTED_CASTS:
                    raise ValidationError(f"Unsupported cast type: {target}")
            casted: list[dict[str, Any]] = []
            for row in current:
                next_row = dict(row)
                for col, target in columns.items():
                    if col not in next_row:
                        continue
                    try:
                        next_row[col] = _cast_value(next_row[col], target)
                    except (TypeError, ValueError) as exc:
                        raise ValidationError(
                            f"cast failed for column '{col}': {exc}"
                        ) from exc
                casted.append(next_row)
            current = casted

        elif op == "nulls":
            fill = step.get("fill") or {}
            drop_if_null = step.get("drop_if_null") or []
            if not isinstance(fill, dict):
                raise ValidationError("nulls.fill must be an object")
            if not isinstance(drop_if_null, list):
                raise ValidationError("nulls.drop_if_null must be a list")
            kept: list[dict[str, Any]] = []
            for row in current:
                next_row = dict(row)
                for col, default in fill.items():
                    val = next_row.get(col)
                    if val is None or val == "":
                        next_row[col] = default
                drop = False
                for col in drop_if_null:
                    val = next_row.get(col)
                    if val is None or val == "":
                        drop = True
                        break
                if not drop:
                    kept.append(next_row)
            current = kept

    return current


def validate_steps(steps: list) -> list[dict[str, Any]]:
    if not isinstance(steps, list):
        raise ValidationError("steps must be a list")
    # Dry-run validation on empty rows to catch bad ops/types early
    apply_steps([], list(steps))
    # Also validate structure without requiring data
    normalized: list[dict[str, Any]] = []
    for step in steps:
        if not isinstance(step, dict):
            raise ValidationError("Each transform step must be an object")
        op = str(step.get("op") or "").lower()
        if op not in SUPPORTED_OPS:
            raise ValidationError(f"Unsupported transform op: {op}")
        normalized.append(deepcopy(step))
    return normalized


class TransformService:
    def __init__(self):
        self.connections = ConnectionService()
        self.audit = AuditService()

    def list(self, *, connection_id, user):
        connection = self.connections.get(connection_id=connection_id, user=user)
        return TransformRule.objects.filter(connection_id=connection.id).order_by(
            "priority", "created_at"
        )

    def get(self, *, rule_id, user) -> TransformRule:
        try:
            rule = TransformRule.objects.select_related("connection").get(id=rule_id)
        except TransformRule.DoesNotExist as exc:
            raise NotFoundError("Transform rule not found") from exc
        self.connections.get(connection_id=rule.connection_id, user=user)
        return rule

    @transaction.atomic
    def create(
        self,
        *,
        connection_id,
        user,
        name: str,
        steps: list,
        table_name: str = "",
        is_active: bool = True,
        priority: int = 100,
    ) -> TransformRule:
        connection = self.connections._get(
            connection_id=connection_id, user=user, permission="connection:write"
        )
        if not (name or "").strip():
            raise ValidationError("name is required")
        normalized = validate_steps(steps or [])
        rule = TransformRule.objects.create(
            organization_id=connection.organization_id,
            workspace_id=connection.workspace_id,
            connection=connection,
            name=name.strip(),
            table_name=(table_name or "").strip(),
            steps=normalized,
            is_active=is_active,
            priority=int(priority),
            created_by=user,
            updated_by=user,
        )
        self.audit.record(
            actor=user,
            action="transform_rule.created",
            resource_type="transform_rule",
            resource_id=str(rule.id),
            organization_id=connection.organization_id,
            after={"name": rule.name, "connection_id": str(connection.id)},
        )
        return rule

    @transaction.atomic
    def update(
        self,
        *,
        rule_id,
        user,
        name: str | None = None,
        steps: list | None = None,
        table_name: str | None = None,
        is_active: bool | None = None,
        priority: int | None = None,
    ) -> TransformRule:
        rule = self.get(rule_id=rule_id, user=user)
        self.connections._get(
            connection_id=rule.connection_id, user=user, permission="connection:write"
        )
        fields = ["updated_by", "updated_at"]
        if name is not None:
            if not name.strip():
                raise ValidationError("name is required")
            rule.name = name.strip()
            fields.append("name")
        if steps is not None:
            rule.steps = validate_steps(steps)
            fields.append("steps")
        if table_name is not None:
            rule.table_name = table_name.strip()
            fields.append("table_name")
        if is_active is not None:
            rule.is_active = is_active
            fields.append("is_active")
        if priority is not None:
            rule.priority = int(priority)
            fields.append("priority")
        rule.updated_by = user
        rule.save(update_fields=fields)
        self.audit.record(
            actor=user,
            action="transform_rule.updated",
            resource_type="transform_rule",
            resource_id=str(rule.id),
            organization_id=rule.organization_id,
            after={"name": rule.name, "is_active": rule.is_active},
        )
        return rule

    @transaction.atomic
    def delete(self, *, rule_id, user) -> None:
        rule = self.get(rule_id=rule_id, user=user)
        self.connections._get(
            connection_id=rule.connection_id, user=user, permission="connection:write"
        )
        rid = str(rule.id)
        org_id = rule.organization_id
        rule.delete()
        self.audit.record(
            actor=user,
            action="transform_rule.deleted",
            resource_type="transform_rule",
            resource_id=rid,
            organization_id=org_id,
        )

    def apply_for_connection(
        self,
        *,
        connection_id,
        rows: list[dict[str, Any]],
        table_name: str | None = None,
    ) -> list[dict[str, Any]]:
        """Worker path — apply all active rules for a connection."""
        qs = TransformRule.objects.filter(
            connection_id=connection_id, is_active=True
        ).order_by("priority", "created_at")
        current = rows
        for rule in qs:
            if rule.table_name and table_name and rule.table_name != table_name:
                continue
            if rule.table_name and not table_name:
                # Rule scoped to a table but batch has no table — skip
                continue
            current = apply_steps(current, list(rule.steps or []))
        return current
