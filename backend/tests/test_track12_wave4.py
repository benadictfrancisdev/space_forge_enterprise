"""Track 12 Wave 4 — Governance and Enterprise Services."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.enterprise_services.infrastructure.models import FeatureFlag, LicenseEntitlement, SearchIndexEntry
from apps.governance.infrastructure.models import (
    ComplianceControl,
    DatasetGovernance,
    Department,
    PolicyEvaluationLog,
    SecurityPolicy,
    UnifiedLineageEdge,
)
from tests.conftest import api_data


def _full_pipeline(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Wave4 Co"}, format="json"))
    ws = api_data(
        auth_client.post(
            "/api/v1/workspaces/",
            {"organization_id": org["id"], "name": "Main"},
            format="json",
        )
    )
    storage = api_data(
        auth_client.post(
            "/api/v1/storage/objects/",
            {
                "organization_id": str(org["id"]),
                "workspace_id": str(ws["id"]),
                "file": SimpleUploadedFile(
                    "sales.csv",
                    b"name,email,amount\nAlice,alice@example.com,100\nBob,bob@example.com,200\n",
                    content_type="text/csv",
                ),
            },
            format="multipart",
        )
    )
    dataset = api_data(
        auth_client.post(
            "/api/v1/datasets/",
            {
                "organization_id": org["id"],
                "workspace_id": ws["id"],
                "name": "Wave4 Data",
                "storage_object_id": storage["id"],
            },
            format="json",
        )
    )
    pipeline = auth_client.post(
        f"/api/v1/data-platform/datasets/{dataset['id']}/pipeline/", format="json"
    )
    assert pipeline.status_code == status.HTTP_202_ACCEPTED
    job = api_data(pipeline)["job"]
    assert job["status"] == "succeeded"
    return org, ws, dataset, job


@pytest.mark.django_db
def test_governance_department_and_policy(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "Gov Co"}, format="json"))

    dept = api_data(
        auth_client.post(
            "/api/v1/governance/departments/",
            {
                "organization_id": org["id"],
                "name": "Engineering",
                "slug": "engineering",
            },
            format="json",
        )
    )
    assert dept["slug"] == "engineering"
    assert Department.objects.filter(id=dept["id"]).exists()

    policy = api_data(
        auth_client.post(
            "/api/v1/governance/policies/",
            {
                "organization_id": org["id"],
                "name": "Internal only",
                "policy_type": "access",
                "scope": "organization",
                "rules": {"deny_actions": ["dataset:export"]},
            },
            format="json",
        )
    )
    assert policy["name"] == "Internal only"

    compliance = api_data(
        auth_client.post(
            "/api/v1/governance/compliance/seed/",
            {"organization_id": org["id"]},
            format="json",
        )
    )
    assert compliance["seeded"] >= 4
    assert ComplianceControl.objects.filter(organization_id=org["id"]).count() >= 4

    security = api_data(
        auth_client.post(
            "/api/v1/governance/security-policies/seed/",
            {"organization_id": org["id"]},
            format="json",
        )
    )
    assert security["seeded"] >= 4
    assert SecurityPolicy.objects.filter(organization_id=org["id"]).count() >= 4


@pytest.mark.django_db
def test_governance_classify_and_evaluate(auth_client):
    org, _, dataset, _ = _full_pipeline(auth_client)

    classify = auth_client.post(
        f"/api/v1/governance/datasets/{dataset['id']}/classify/",
        {"classification": "confidential", "ai_allowed": True},
        format="json",
    )
    assert classify.status_code == status.HTTP_202_ACCEPTED
    classify_job = api_data(classify)["job"]
    assert classify_job["status"] == "succeeded"
    assert classify_job["result"]["classification"] == "confidential"
    assert DatasetGovernance.objects.filter(dataset_id=dataset["id"]).exists()

    evaluate = api_data(
        auth_client.post(
            f"/api/v1/governance/datasets/{dataset['id']}/evaluate/",
            {"action": "dataset:read"},
            format="json",
        )
    )
    assert evaluate["allowed"] is True
    assert PolicyEvaluationLog.objects.filter(organization_id=org["id"]).exists()


@pytest.mark.django_db
def test_governance_lineage_and_dashboard(auth_client):
    org, _, dataset, _ = _full_pipeline(auth_client)

    sync = auth_client.post(
        f"/api/v1/governance/datasets/{dataset['id']}/sync-lineage/",
        format="json",
    )
    assert sync.status_code == status.HTTP_202_ACCEPTED
    sync_job = api_data(sync)["job"]
    assert sync_job["status"] == "succeeded"
    assert UnifiedLineageEdge.objects.filter(organization_id=org["id"]).exists()

    lineage = api_data(
        auth_client.get(f"/api/v1/governance/datasets/{dataset['id']}/lineage/")
    )
    assert lineage["dataset_id"] == dataset["id"]
    assert len(lineage["lineage"]) >= 1

    dashboard = api_data(
        auth_client.get(f"/api/v1/governance/dashboard/?organization_id={org['id']}")
    )
    assert dashboard["compliance_score"] >= 0
    assert dashboard["security_score"] >= 0
    assert "policy_violations" in dashboard


@pytest.mark.django_db
def test_enterprise_services_config_search_flags(auth_client):
    org, _, dataset, _ = _full_pipeline(auth_client)

    config = api_data(
        auth_client.post(
            "/api/v1/enterprise-services/configuration/",
            {
                "organization_id": org["id"],
                "currency": "EUR",
                "timezone": "Europe/Berlin",
                "industry_profile": "retail",
            },
            format="json",
        )
    )
    assert config["currency"] == "EUR"
    assert config["timezone"] == "Europe/Berlin"

    flag = api_data(
        auth_client.post(
            "/api/v1/enterprise-services/feature-flags/",
            {
                "organization_id": org["id"],
                "key": "beta_analytics",
                "enabled": True,
            },
            format="json",
        )
    )
    assert flag["key"] == "beta_analytics"
    assert FeatureFlag.objects.filter(organization_id=org["id"]).exists()

    reindex = auth_client.post(
        "/api/v1/enterprise-services/search/reindex/",
        {"organization_id": org["id"]},
        format="json",
    )
    assert reindex.status_code == status.HTTP_202_ACCEPTED
    reindex_job = api_data(reindex)["job"]
    assert reindex_job["status"] == "succeeded"
    assert SearchIndexEntry.objects.filter(organization_id=org["id"]).exists()

    search = api_data(
        auth_client.get(
            f"/api/v1/enterprise-services/search/?organization_id={org['id']}&q=Wave4"
        )
    )
    assert len(search) >= 1

    licensing = api_data(
        auth_client.post(
            "/api/v1/enterprise-services/licensing/seed/",
            {"organization_id": org["id"]},
            format="json",
        )
    )
    assert LicenseEntitlement.objects.filter(organization_id=org["id"]).count() >= 3

    usage = api_data(
        auth_client.get(f"/api/v1/enterprise-services/usage/?organization_id={org['id']}")
    )
    assert "ai" in usage


@pytest.mark.django_db
def test_full_pipeline_includes_wave4(auth_client):
    _, _, dataset, job = _full_pipeline(auth_client)
    assert job["result"].get("governance")
    assert job["result"].get("enterprise_services")
    gov = job["result"]["governance"]["governance"]
    assert gov["classification"] == "internal"
    assert DatasetGovernance.objects.filter(dataset_id=dataset["id"]).exists()
    assert SearchIndexEntry.objects.filter(title__icontains="Wave4").exists()
