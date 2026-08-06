# Generated manually for Track 7 — AuthSession

import django.db.models.deletion
import django.utils.timezone
import uuid
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("identity", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="AuthSession",
            fields=[
                ("id", models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("family_id", models.UUIDField(db_index=True, default=uuid.uuid4)),
                ("refresh_token_hash", models.CharField(db_index=True, max_length=64, unique=True)),
                ("device_label", models.CharField(blank=True, default="", max_length=255)),
                ("user_agent", models.CharField(blank=True, default="", max_length=512)),
                ("ip_address", models.GenericIPAddressField(blank=True, null=True)),
                ("expires_at", models.DateTimeField(db_index=True)),
                ("last_seen_at", models.DateTimeField(default=django.utils.timezone.now)),
                ("revoked_at", models.DateTimeField(blank=True, db_index=True, null=True)),
                ("revoke_reason", models.CharField(blank=True, default="", max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="auth_sessions",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "db_table": "identity_auth_sessions",
                "ordering": ["-last_seen_at"],
            },
        ),
    ]
