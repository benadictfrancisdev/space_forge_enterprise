import uuid

from django.db import models
from django.utils import timezone


class TelemetryRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True, null=True)
    workspace_id = models.UUIDField(null=True)
    name = models.CharField(max_length=255)
    source_md = models.TextField(default="")
    condition = models.TextField(default="")
    entities = models.JSONField(default=list)
    status = models.CharField(max_length=32, default="draft")  # draft | deployed
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)


class TelemetryEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True, null=True)
    metric = models.CharField(max_length=128, db_index=True, default="")
    module = models.CharField(max_length=128, default="")
    value = models.FloatField(default=0.0)
    latency_ms = models.FloatField(default=0.0)
    status = models.CharField(max_length=16, default="ok")  # ok | error
    occurred_at = models.DateTimeField(default=timezone.now, db_index=True)
    metadata = models.JSONField(default=dict)


class Incident(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization_id = models.UUIDField(db_index=True, null=True)
    ticket_id = models.CharField(max_length=32)
    title = models.CharField(max_length=255)
    severity = models.CharField(max_length=16, default="medium")
    status = models.CharField(max_length=16, default="open")
    rule_id = models.UUIDField(null=True)
    cause_md = models.TextField(default="")
    predict_md = models.TextField(default="")
    blast_radius = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ("-created_at",)
