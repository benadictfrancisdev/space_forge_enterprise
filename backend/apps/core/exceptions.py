"""Domain exceptions shared across apps."""
from __future__ import annotations


class DomainError(Exception):
    code = "domain_error"
    status_code = 400

    def __init__(self, message: str = "Domain error", *, code: str | None = None):
        super().__init__(message)
        self.message = message
        if code:
            self.code = code


class NotFoundError(DomainError):
    code = "not_found"
    status_code = 404


class PermissionDeniedError(DomainError):
    code = "permission_denied"
    status_code = 403


class ConflictError(DomainError):
    code = "conflict"
    status_code = 409


class ValidationError(DomainError):
    code = "validation_error"
    status_code = 400


class AuthenticationError(DomainError):
    code = "authentication_error"
    status_code = 401
