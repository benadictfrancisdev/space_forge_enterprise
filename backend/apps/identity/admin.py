from django.contrib import admin

from apps.identity.infrastructure.models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("email", "status", "firebase_uid", "is_staff", "created_at")
    search_fields = ("email", "firebase_uid", "display_name")
    list_filter = ("status", "is_staff", "is_active")
