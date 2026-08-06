# Generated manually for Track 12 Wave 1

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("datasets", "0004_track8_perf_indexes"),
        ("jobs", "0003_track8_perf_indexes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="QualityRun",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("status", models.CharField(
                    choices=[
                        ("queued", "Queued"),
                        ("running", "Running"),
                        ("passed", "Passed"),
                        ("failed", "Failed"),
                        ("warning", "Warning"),
                    ],
                    db_index=True, default="queued", max_length=32,
                )),
                ("score", models.FloatField(blank=True, null=True)),
                ("checks_passed", models.PositiveIntegerField(default=0)),
                ("checks_failed", models.PositiveIntegerField(default=0)),
                ("checks_warning", models.PositiveIntegerField(default=0)),
                ("error", models.TextField(blank=True, default="")),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="qualityrun_created", to=settings.AUTH_USER_MODEL,
                )),
                ("dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="quality_runs", to="datasets.dataset",
                )),
                ("job", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="quality_runs", to="jobs.job",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="qualityrun_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "quality_runs", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="QualityReport",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("overall_score", models.FloatField(default=0.0)),
                ("validation_results", models.JSONField(blank=True, default=dict)),
                ("profiling_results", models.JSONField(blank=True, default=dict)),
                ("duplicate_results", models.JSONField(blank=True, default=dict)),
                ("missing_value_results", models.JSONField(blank=True, default=dict)),
                ("schema_drift_results", models.JSONField(blank=True, default=dict)),
                ("pii_results", models.JSONField(blank=True, default=dict)),
                ("summary", models.JSONField(blank=True, default=dict)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="qualityreport_created", to=settings.AUTH_USER_MODEL,
                )),
                ("dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="quality_reports", to="datasets.dataset",
                )),
                ("quality_run", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="report", to="quality.qualityrun",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="qualityreport_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "quality_reports", "ordering": ["-created_at"]},
        ),
    ]
