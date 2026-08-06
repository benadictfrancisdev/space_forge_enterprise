from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("jobs", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="job",
            name="status_message",
            field=models.CharField(blank=True, default="", max_length=255),
        ),
        migrations.AddField(
            model_name="job",
            name="progress_pct",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="job",
            name="priority",
            field=models.PositiveSmallIntegerField(
                choices=[(1, "Low"), (5, "Normal"), (10, "High")],
                db_index=True,
                default=5,
            ),
        ),
        migrations.AddField(
            model_name="job",
            name="attempt_count",
            field=models.PositiveSmallIntegerField(default=0),
        ),
        migrations.AddField(
            model_name="job",
            name="max_retries",
            field=models.PositiveSmallIntegerField(default=3),
        ),
        migrations.AddField(
            model_name="job",
            name="timeout_seconds",
            field=models.PositiveIntegerField(default=300),
        ),
        migrations.AddField(
            model_name="job",
            name="cancel_requested",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="job",
            name="execution_ms",
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AlterModelOptions(
            name="job",
            options={"ordering": ["-priority", "-created_at"]},
        ),
    ]
