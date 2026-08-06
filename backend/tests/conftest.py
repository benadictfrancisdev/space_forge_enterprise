"""Shared pytest fixtures for SpaceForge backend tests."""
from __future__ import annotations

import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.identity.infrastructure.models import User


@pytest.fixture(scope="session")
def django_db_setup(django_db_setup, django_db_blocker):
    with django_db_blocker.unblock():
        call_command("seed_platform", verbosity=0)


@pytest.fixture
def api_client() -> APIClient:
    return APIClient()


@pytest.fixture
def user_a(db) -> User:
    return User.objects.create_user(email="alice@example.com", display_name="Alice")


@pytest.fixture
def user_b(db) -> User:
    return User.objects.create_user(email="bob@example.com", display_name="Bob")


@pytest.fixture
def auth_client(api_client, user_a) -> APIClient:
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer dev:{user_a.id}:{user_a.email}")
    return api_client


@pytest.fixture
def auth_client_b(api_client, user_b) -> APIClient:
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer dev:{user_b.id}:{user_b.email}")
    return client


def api_data(response):
    """Unwrap Track 3 envelope → data (or raw for non-API views)."""
    body = response.json()
    if isinstance(body, dict) and "success" in body and "data" in body:
        return body["data"]
    return body
