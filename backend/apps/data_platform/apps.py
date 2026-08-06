from django.apps import AppConfig


class DataPlatformConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.data_platform"
    label = "data_platform"
    verbose_name = "Enterprise Data Platform"
