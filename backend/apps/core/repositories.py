"""Tenant-aware queryset helpers."""
from __future__ import annotations

from django.db import models


class TenantQuerySet(models.QuerySet):
    def for_organization(self, organization_id):
        return self.filter(organization_id=organization_id)
