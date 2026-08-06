from django.apps import AppConfig


class QueryComputeConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.query_compute"
    label = "query_compute"
    verbose_name = "Query & Compute Platform"
