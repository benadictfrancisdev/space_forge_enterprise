"""Tenant isolation helpers for API and worker boundaries."""
from __future__ import annotations

from django.db import models

from apps.core.exceptions import PermissionDeniedError


def assert_resource_belongs_to_org(resource, organization_id) -> None:
    if getattr(resource, "organization_id", None) != organization_id:
        raise PermissionDeniedError("Cross-tenant resource access blocked in worker.")


def require_resource_in_org(
    model: type[models.Model],
    *,
    resource_id,
    organization_id,
):
    """Load a tenant-owned row or reject cross-tenant / missing references."""
    try:
        return model.objects.get(id=resource_id, organization_id=organization_id)
    except model.DoesNotExist as exc:
        raise PermissionDeniedError(
            "Referenced resource does not belong to this organization"
        ) from exc


def resource_exists_in_org(
    model: type[models.Model],
    *,
    resource_id,
    organization_id,
) -> bool:
    return model.objects.filter(id=resource_id, organization_id=organization_id).exists()
