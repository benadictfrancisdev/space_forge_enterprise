# Generated manually for Track 12 Wave 1

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("datasets", "0004_track8_perf_indexes"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="ColumnMetadata",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("dataset_version_id", models.UUIDField(blank=True, db_index=True, null=True)),
                ("column_name", models.CharField(max_length=255)),
                ("physical_type", models.CharField(blank=True, default="", max_length=64)),
                ("business_name", models.CharField(blank=True, default="", max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("is_nullable", models.BooleanField(default=True)),
                ("is_primary_key", models.BooleanField(default=False)),
                ("tags", models.JSONField(blank=True, default=list)),
                ("statistics", models.JSONField(blank=True, default=dict)),
                ("pii_detected", models.BooleanField(default=False)),
                ("pii_type", models.CharField(blank=True, default="", max_length=64)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="columnmetadata_created", to=settings.AUTH_USER_MODEL,
                )),
                ("dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="column_metadata", to="datasets.dataset",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="columnmetadata_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "metadata_columns", "ordering": ["column_name"]},
        ),
        migrations.CreateModel(
            name="DatasetRelationship",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("relation_type", models.CharField(
                    choices=[
                        ("foreign_key", "Foreign Key"),
                        ("join", "Join"),
                        ("derived", "Derived"),
                        ("duplicate", "Duplicate"),
                    ],
                    default="derived", max_length=32,
                )),
                ("source_column", models.CharField(blank=True, default="", max_length=255)),
                ("target_column", models.CharField(blank=True, default="", max_length=255)),
                ("description", models.TextField(blank=True, default="")),
                ("confidence", models.FloatField(blank=True, null=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="datasetrelationship_created", to=settings.AUTH_USER_MODEL,
                )),
                ("source_dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="outbound_relationships", to="datasets.dataset",
                )),
                ("target_dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="inbound_relationships", to="datasets.dataset",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="datasetrelationship_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "metadata_relationships", "ordering": ["-created_at"]},
        ),
        migrations.CreateModel(
            name="MetadataTag",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(blank=True, db_index=True, null=True)),
                ("tag", models.CharField(db_index=True, max_length=128)),
                ("category", models.CharField(blank=True, default="general", max_length=64)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="metadatatag_created", to=settings.AUTH_USER_MODEL,
                )),
                ("dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="metadata_tags", to="datasets.dataset",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="metadatatag_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "metadata_tags", "ordering": ["tag"]},
        ),
        migrations.CreateModel(
            name="SchemaRegistryEntry",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("version_number", models.PositiveIntegerField()),
                ("schema", models.JSONField(default=dict)),
                ("checksum", models.CharField(blank=True, default="", max_length=64)),
                ("is_current", models.BooleanField(default=True)),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="schemaregistryentry_created", to=settings.AUTH_USER_MODEL,
                )),
                ("dataset", models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="schema_registry_entries", to="datasets.dataset",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="schemaregistryentry_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "metadata_schema_registry", "ordering": ["-version_number"]},
        ),
        migrations.CreateModel(
            name="BusinessMetadata",
            fields=[
                ("created_at", models.DateTimeField(auto_now_add=True, db_index=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("deleted_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("organization_id", models.UUIDField(db_index=True)),
                ("workspace_id", models.UUIDField(db_index=True)),
                ("domain", models.CharField(blank=True, default="", max_length=128)),
                ("classification", models.CharField(blank=True, default="internal", max_length=64)),
                ("retention_days", models.PositiveIntegerField(blank=True, null=True)),
                ("glossary_terms", models.JSONField(blank=True, default=list)),
                ("custom_fields", models.JSONField(blank=True, default=dict)),
                ("business_owner", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="datasets_business_owned", to=settings.AUTH_USER_MODEL,
                )),
                ("created_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="businessmetadata_created", to=settings.AUTH_USER_MODEL,
                )),
                ("data_steward", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="datasets_stewarded", to=settings.AUTH_USER_MODEL,
                )),
                ("dataset", models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name="business_metadata", to="datasets.dataset",
                )),
                ("updated_by", models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name="businessmetadata_updated", to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={"db_table": "metadata_business"},
        ),
        migrations.AddIndex(
            model_name="columnmetadata",
            index=models.Index(fields=["dataset", "column_name"], name="idx_meta_col_ds_name"),
        ),
        migrations.AddConstraint(
            model_name="metadatatag",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("dataset", "tag"),
                name="uniq_metadata_tag_alive",
            ),
        ),
        migrations.AddConstraint(
            model_name="schemaregistryentry",
            constraint=models.UniqueConstraint(
                condition=models.Q(("deleted_at__isnull", True)),
                fields=("dataset", "version_number"),
                name="uniq_schema_registry_version_alive",
            ),
        ),
    ]
