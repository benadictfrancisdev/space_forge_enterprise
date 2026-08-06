"""Track 13 — Enterprise Intelligence Applications."""
from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework import status

from apps.enterprise_applications.infrastructure.models import JourneyDefinition
from tests.conftest import api_data


def _dataset_pipeline(auth_client):
    org = api_data(auth_client.post("/api/v1/organizations/", {"name": "T13 Co"}, format="json"))
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
                    "journey.csv",
                    b"stage,amount\nLead,100\nSales,200\nPayment,150\n",
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
                "name": "T13 Data",
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
    return org, ws, dataset


@pytest.mark.django_db
def test_executive_insight_bundle(auth_client):
    org, _, dataset = _dataset_pipeline(auth_client)
    bundle = api_data(
        auth_client.get(
            f"/api/v1/applications/executive/bundle/?dataset_id={dataset['id']}&include_ai=false"
        )
    )
    assert bundle["dataset_id"] == dataset["id"]
    assert "kpis" in bundle
    assert "recommendations" in bundle


@pytest.mark.django_db
def test_journey_templates_and_analyze(auth_client):
    org, ws, dataset = _dataset_pipeline(auth_client)
    seeded = api_data(
        auth_client.post(
            "/api/v1/applications/journeys/seed-templates/",
            {"organization_id": org["id"], "workspace_id": ws["id"]},
            format="json",
        )
    )
    assert seeded["seeded"] >= 1
    journeys = api_data(
        auth_client.get(f"/api/v1/applications/journeys/?organization_id={org['id']}")
    )
    journey = journeys[0]
    journey_obj = JourneyDefinition.objects.get(id=journey["id"])
    journey_obj.dataset_id = dataset["id"]
    journey_obj.stage_column = "stage"
    journey_obj.stages = ["Lead", "Sales", "Payment"]
    journey_obj.save()

    analysis = api_data(
        auth_client.get(
            f"/api/v1/applications/journeys/{journey['id']}/analyze/?dataset_id={dataset['id']}"
        )
    )
    assert analysis.get("funnel")
    assert analysis["dataset_id"] == dataset["id"]
    assert analysis.get("drop_off_analysis") is not None
    assert analysis.get("sankey")


@pytest.mark.django_db
def test_sankey_visualize(auth_client):
    org, ws, dataset = _dataset_pipeline(auth_client)
    api_data(
        auth_client.post(
            "/api/v1/applications/journeys/seed-templates/",
            {"organization_id": org["id"], "workspace_id": ws["id"]},
            format="json",
        )
    )
    journeys = api_data(
        auth_client.get(f"/api/v1/applications/journeys/?organization_id={org['id']}")
    )
    journey_id = journeys[0]["id"]
    sankey = api_data(
        auth_client.post(
            "/api/v1/applications/sankey/visualize/",
            {"journey_id": journey_id, "dataset_id": dataset["id"], "flow_type": "customer"},
            format="json",
        )
    )
    assert sankey.get("links")
    assert sankey.get("nodes")

    # Dataset-only flow (no journey)
    direct = api_data(
        auth_client.post(
            "/api/v1/applications/sankey/visualize/",
            {"dataset_id": dataset["id"], "flow_type": "order"},
            format="json",
        )
    )
    assert direct.get("links")


@pytest.mark.django_db
def test_reporting_platform(auth_client):
    org, _, dataset = _dataset_pipeline(auth_client)
    types = api_data(auth_client.get("/api/v1/applications/reporting/types/"))
    assert len(types) >= 5
    compliance = api_data(
        auth_client.post(
            "/api/v1/applications/reporting/generate/",
            {"dataset_id": dataset["id"], "report_type": "compliance"},
            format="json",
        )
    )
    assert compliance.get("report_type") == "compliance"
    resp = auth_client.post(
        "/api/v1/applications/reporting/schedule/",
        {"dataset_id": dataset["id"], "report_type": "operational", "frequency": "daily"},
        format="json",
    )
    assert resp.status_code == status.HTTP_202_ACCEPTED
    schedules = api_data(
        auth_client.get(f"/api/v1/applications/reporting/schedules/?organization_id={org['id']}")
    )
    assert len(schedules) >= 1


@pytest.mark.django_db
def test_application_certification_matrix(auth_client):
    """13.8 — smoke all enterprise application APIs."""
    org, ws, dataset = _dataset_pipeline(auth_client)
    ds = dataset["id"]
    org_id = org["id"]

    assert api_data(auth_client.get(f"/api/v1/applications/executive/bundle/?dataset_id={ds}"))
    assert api_data(auth_client.get(f"/api/v1/applications/operations/?organization_id={org_id}"))
    journeys_resp = auth_client.get(f"/api/v1/applications/journeys/?organization_id={org_id}")
    assert journeys_resp.status_code == status.HTTP_200_OK
    assert api_data(auth_client.get(f"/api/v1/applications/reporting/types/"))
    assert api_data(auth_client.get(f"/api/v1/applications/scientist/context/?dataset_id={ds}"))
    assert api_data(
        auth_client.post(
            "/api/v1/applications/forecast/scenarios/",
            {"dataset_id": ds, "horizon": 3},
            format="json",
        )
    )
    assert api_data(
        auth_client.post(
            "/api/v1/applications/decisions/",
            {"dataset_id": ds, "problem": "Certification smoke test"},
            format="json",
        )
    ).get("decision_support")


@pytest.mark.django_db
def test_decision_intelligence(auth_client):
    _, _, dataset = _dataset_pipeline(auth_client)
    result = api_data(
        auth_client.post(
            "/api/v1/applications/decisions/",
            {"dataset_id": dataset["id"], "problem": "Why did sales change?"},
            format="json",
        )
    )
    assert result.get("case_id")
    assert result.get("decision_support")
    support = result["decision_support"]
    assert support.get("problem_summary")
    assert support.get("confidence_score") is not None
    assert support.get("risk_assessment")
    assert support.get("recommended_actions")
    assert result.get("reasoning_chain", {}).get("stages")

    case = api_data(auth_client.get(f"/api/v1/applications/decisions/{result['case_id']}/"))
    assert case["problem"] == "Why did sales change?"
    assert case["result_bundle"].get("decision_support")


@pytest.mark.django_db
def test_operations_dashboard(auth_client):
    org, _, _ = _dataset_pipeline(auth_client)
    dashboard = api_data(
        auth_client.get(f"/api/v1/applications/operations/?organization_id={org['id']}")
    )
    assert "job_health" in dashboard
    assert "governance" in dashboard


@pytest.mark.django_db
def test_forecast_and_reporting(auth_client):
    _, _, dataset = _dataset_pipeline(auth_client)
    forecast = api_data(
        auth_client.post(
            "/api/v1/applications/forecast/scenarios/",
            {"dataset_id": dataset["id"], "horizon": 5},
            format="json",
        )
    )
    assert forecast.get("scenarios")

    report = api_data(
        auth_client.post(
            "/api/v1/applications/reporting/generate/",
            {"dataset_id": dataset["id"], "report_type": "executive"},
            format="json",
        )
    )
    assert report.get("content")


@pytest.mark.django_db
def test_executive_brief_schedule(auth_client):
    org, _, dataset = _dataset_pipeline(auth_client)
    resp = auth_client.post(
        "/api/v1/applications/executive/schedule-brief/",
        {"dataset_id": dataset["id"], "frequency": "daily"},
        format="json",
    )
    assert resp.status_code == status.HTTP_202_ACCEPTED
    body = api_data(resp)
    assert body["job"]["status"] == "succeeded"
    assert body.get("schedule_id")

    schedules = api_data(
        auth_client.get(f"/api/v1/applications/executive/brief-schedules/?organization_id={org['id']}")
    )
    assert len(schedules) >= 1


@pytest.mark.django_db
def test_report_markdown_export(auth_client):
    _, _, dataset = _dataset_pipeline(auth_client)
    report = api_data(
        auth_client.post(
            "/api/v1/applications/reporting/generate/",
            {"dataset_id": dataset["id"], "report_type": "executive"},
            format="json",
        )
    )
    assert report.get("markdown")
    assert "#" in report["markdown"] or report["markdown"].strip()
    assert report.get("html")
    assert "<html>" in report["html"]
    assert report.get("slides")
    assert len(report["slides"]) >= 2


@pytest.mark.django_db
def test_scheduled_brief_enqueue(auth_client):
    org, _, dataset = _dataset_pipeline(auth_client)
    auth_client.post(
        "/api/v1/applications/executive/schedule-brief/",
        {"dataset_id": dataset["id"], "frequency": "daily"},
        format="json",
    )
    from apps.enterprise_applications.application.services import InsightService
    from apps.enterprise_applications.infrastructure.models import ExecutiveBriefSchedule

    ExecutiveBriefSchedule.objects.filter(dataset_id=dataset["id"]).update(last_run_at=None)
    result = InsightService().run_scheduled_briefs()
    assert result["enqueued"] >= 1
