from django.core.management.base import BaseCommand
from django.db import transaction

from apps.billing.infrastructure.models import Plan
from apps.permissions.application.services import DEFAULT_PERMISSIONS, ROLE_PERMISSION_MAP
from apps.permissions.infrastructure.models import Permission, Role, RolePermission


class Command(BaseCommand):
    help = "Seed system roles, permissions, and billing plans"

    @transaction.atomic
    def handle(self, *args, **options):
        perm_map = {}
        for code, description in DEFAULT_PERMISSIONS:
            perm, _ = Permission.objects.get_or_create(
                code=code, defaults={"description": description}
            )
            perm_map[code] = perm
            self.stdout.write(f"permission {code}")

        role_defs = [
            (Role.Codes.ORG_OWNER, "Organization Owner", Role.Scope.ORGANIZATION),
            (Role.Codes.ORG_ADMIN, "Organization Admin", Role.Scope.ORGANIZATION),
            (Role.Codes.ORG_MEMBER, "Organization Member", Role.Scope.ORGANIZATION),
            (Role.Codes.WS_ADMIN, "Workspace Admin", Role.Scope.WORKSPACE),
            (Role.Codes.WS_MEMBER, "Workspace Member", Role.Scope.WORKSPACE),
        ]
        for code, name, scope in role_defs:
            role, _ = Role.objects.get_or_create(
                code=code, scope=scope, defaults={"name": name, "is_system": True}
            )
            for perm_code in ROLE_PERMISSION_MAP.get(code, []):
                RolePermission.objects.get_or_create(role=role, permission=perm_map[perm_code])
            self.stdout.write(f"role {code}")

        plans = [
            ("free", "Free", 50),
            ("starter", "Starter", 500),
            ("pro", "Pro", 5000),
        ]
        for code, name, credits in plans:
            Plan.objects.get_or_create(
                code=code,
                defaults={"name": name, "monthly_credits": credits, "is_active": True},
            )
            self.stdout.write(f"plan {code}")

        self.stdout.write(self.style.SUCCESS("Platform seed complete"))
