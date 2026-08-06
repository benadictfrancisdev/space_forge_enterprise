from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import BasePermission


class IsAuthenticated(BasePermission):
    """Require authentication and always return 401 (not 403) when missing."""

    def has_permission(self, request, view) -> bool:
        if not getattr(request, "user", None) or not request.user.is_authenticated:
            raise NotAuthenticated()
        return True
