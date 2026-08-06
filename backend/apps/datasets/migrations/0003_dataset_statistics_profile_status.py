# Track 4 — dataset statistics + profile_status

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("datasets", "0002_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="dataset",
            name="statistics",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="dataset",
            name="profile_status",
            field=models.CharField(
                choices=[
                    ("pending", "Pending"),
                    ("running", "Running"),
                    ("ready", "Ready"),
                    ("failed", "Failed"),
                ],
                default="pending",
                max_length=32,
            ),
        ),
    ]
