"""Phase-2 telemetry endpoint smoke tests: rules validate/deploy, events ingest/query/stats,
graph entities, incidents generate-demo.
"""
import os
import time
import pytest
import requests

BASE = os.environ["VITE_API_BASE_URL"].rstrip("/") if os.environ.get("VITE_API_BASE_URL") else \
       "https://2e4a7175-8617-4040-8ab5-3d07ff062511.preview.emergentagent.com"


@pytest.fixture(scope="module")
def auth_ctx():
    s = requests.Session()
    s.headers["Content-Type"] = "application/json"
    uid = f"u-qa-{int(time.time())}"
    email = f"qa+{int(time.time())}@spaceforge.test"
    def unwrap(j):
        return j.get("data", j) if isinstance(j, dict) else j

    r = s.post(f"{BASE}/api/v1/auth/exchange/", json={"token": f"dev:{uid}:{email}"})
    assert r.status_code == 200, r.text
    body = unwrap(r.json())
    token = body.get("access_token") or body.get("token")
    assert token, r.text
    s.headers["Authorization"] = f"Bearer {token}"

    r = s.post(f"{BASE}/api/v1/organizations/", json={"name": "QA Phase2"})
    assert r.status_code in (200, 201), r.text
    body = unwrap(r.json())
    org_id = body.get("id") or (body.get("organization") or {}).get("id")
    assert org_id, r.text
    s.headers["X-Organization-ID"] = str(org_id)

    r = s.post(f"{BASE}/api/v1/workspaces/", json={"organization_id": org_id, "name": "Default"})
    if r.status_code in (200, 201):
        body = unwrap(r.json())
        ws_id = body.get("id") or (body.get("workspace") or {}).get("id")
        if ws_id:
            s.headers["X-Workspace-ID"] = str(ws_id)
    return s


# --- Rules Engine ---
SAMPLE_RULE = """# Test Rule

@module payments
@metric checkout.latency_ms

WHEN checkout.latency_ms > 500 THEN alert
"""


def test_rules_validate_ok(auth_ctx):
    r = auth_ctx.post(f"{BASE}/api/v1/rules/validate/", json={"source": SAMPLE_RULE})
    assert r.status_code == 200, r.text
    data = r.json().get("data", r.json())
    assert data.get("valid") is True, data


def test_rules_validate_blocks_import(auth_ctx):
    bad = "WHEN __import__(\"os\").system(\"ls\") > 1 THEN alert"
    r = auth_ctx.post(f"{BASE}/api/v1/rules/validate/", json={"source": bad})
    assert r.status_code == 200, r.text
    data = r.json().get("data", r.json())
    assert data.get("valid") is False
    violations = data.get("security_violations") or data.get("errors") or []
    assert violations, data


def test_rules_deploy(auth_ctx):
    r = auth_ctx.post(f"{BASE}/api/v1/rules/deploy/", json={"name": "TEST_slow", "source": SAMPLE_RULE})
    assert r.status_code in (200, 201), r.text
    data = r.json().get("data", r.json())
    assert data.get("rule_id") or data.get("id"), data


def test_graph_entities_query(auth_ctx):
    r = auth_ctx.get(f"{BASE}/api/v1/graph/entities/?query=lat")
    assert r.status_code == 200, r.text
    payload = r.json()
    data = payload.get("data", payload)
    items = data if isinstance(data, list) else (data.get("entities") or data.get("results") or [])
    assert isinstance(items, list)


def test_incidents_generate_demo_and_stats(auth_ctx):
    r = auth_ctx.post(f"{BASE}/api/v1/incidents/generate-demo/", json={})
    assert r.status_code in (200, 201), r.text
    data = r.json().get("data", r.json())
    assert (data.get("incidents_created") or 0) >= 1
    assert (data.get("events_ingested") or 0) >= 1

    r2 = auth_ctx.get(f"{BASE}/api/v1/events/stats/")
    assert r2.status_code == 200, r2.text
    stats = r2.json().get("data", r2.json())
    keys = set(stats.keys())
    assert keys & {"p50", "p50_ms", "p50_latency", "latency_p50", "p50_latency_ms"}, stats


def test_events_ingest_and_query(auth_ctx):
    payload = {"events": [
        {"metric": "checkout.latency_ms", "value": 120, "timestamp": int(time.time())},
        {"metric": "checkout.latency_ms", "value": 850, "timestamp": int(time.time())},
    ]}
    r = auth_ctx.post(f"{BASE}/api/v1/events/ingest/", json=payload)
    assert r.status_code in (200, 201, 202), r.text

    r2 = auth_ctx.get(f"{BASE}/api/v1/events/query/?limit=10")
    assert r2.status_code == 200, r2.text
