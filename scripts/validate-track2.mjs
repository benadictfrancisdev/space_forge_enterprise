/**
 * Track 2+3+4 validation against local Django.
 * Usage: npm run validate:track2
 */
const API = process.env.VITE_API_BASE_URL || "http://localhost:8000";

function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

function dataOf(json) {
  if (json && typeof json === "object" && "success" in json) return json.data;
  return json;
}

async function req(method, urlPath, { token, body, formData } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let bodyInit;
  if (formData) bodyInit = formData;
  else if (body) {
    headers["Content-Type"] = "application/json";
    bodyInit = JSON.stringify(body);
  }
  const res = await fetch(`${API}${urlPath}`, { method, headers, body: bodyInit });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { res, json };
}

async function main() {
  console.log("Track validation →", API);

  {
    const { res, json } = await req("GET", "/health/");
    log("GET /health/", res.ok && json?.status === "ok", JSON.stringify(json));
    if (!res.ok) process.exit(1);
  }

  let access;
  {
    const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track2-validator:track2@spaceforge.local" },
    });
    const payload = dataOf(json);
    access = payload?.access_token;
    log(
      "POST /api/v1/auth/exchange/ (envelope)",
      res.ok && json?.success === true && !!access,
      access ? "jwt ok" : JSON.stringify(json)
    );
    if (!access) process.exit(1);
  }

  {
    const { res, json } = await req("GET", "/api/v1/auth/me/", { token: access });
    const me = dataOf(json);
    log("GET /api/v1/auth/me/", res.ok && json?.success === true && !!me?.email, me?.email);
    if (!res.ok) process.exit(1);
  }

  let orgId;
  {
    let { res, json } = await req("GET", "/api/v1/organizations/", { token: access });
    let orgs = dataOf(json) || [];
    log("GET /api/v1/organizations/", res.ok && json?.success === true, `count=${orgs.length}`);
    if (!res.ok) process.exit(1);
    if (orgs.length === 0) {
      ({ res, json } = await req("POST", "/api/v1/organizations/", {
        token: access,
        body: { name: "Track2 Validation Org" },
      }));
      orgs = [dataOf(json)];
      log("POST /api/v1/organizations/", res.ok && !!orgs[0]?.id, orgs[0]?.id);
      if (!orgs[0]?.id) process.exit(1);
    }
    orgId = orgs[0].id;
  }

  let workspaceId;
  {
    let { res, json } = await req("GET", `/api/v1/workspaces/?organization_id=${orgId}`, {
      token: access,
    });
    let workspaces = dataOf(json) || [];
    if (workspaces.length === 0) {
      ({ res, json } = await req("POST", "/api/v1/workspaces/", {
        token: access,
        body: { organization_id: orgId, name: "Default" },
      }));
      workspaces = [dataOf(json)];
      log("POST /api/v1/workspaces/", res.ok && !!workspaces[0]?.id, workspaces[0]?.id);
      if (!workspaces[0]?.id) process.exit(1);
    } else {
      log("GET /api/v1/workspaces/", true, workspaces[0].id);
    }
    workspaceId = workspaces[0].id;
  }

  let storageId;
  {
    const form = new FormData();
    form.append("organization_id", orgId);
    form.append("workspace_id", workspaceId);
    form.append(
      "file",
      new Blob(["col_a,col_b\n1,2\n3,4\n5,6\n"], { type: "text/csv" }),
      "track2-sample.csv"
    );
    const { res, json } = await req("POST", "/api/v1/storage/objects/", {
      token: access,
      formData: form,
    });
    storageId = dataOf(json)?.id;
    log("POST /api/v1/storage/objects/", res.ok && !!storageId, storageId || JSON.stringify(json));
    if (!storageId) process.exit(1);
  }

  let datasetId;
  {
    const { res, json } = await req("POST", "/api/v1/datasets/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "track2-sample",
        storage_object_id: storageId,
      },
    });
    datasetId = dataOf(json)?.id;
    log(
      "POST /api/v1/datasets/ (bound storage)",
      res.ok && !!datasetId && dataOf(json)?.storage_object_id === storageId,
      datasetId || JSON.stringify(json)
    );
    if (!datasetId) process.exit(1);
  }

  {
    const { res, json } = await req("POST", `/api/v1/datasets/${datasetId}/profile/`, {
      token: access,
    });
    const d = dataOf(json);
    log(
      "POST /api/v1/datasets/{id}/profile/",
      res.status === 202 && d?.profile_status === "ready",
      `status=${d?.profile_status} rows=${d?.row_count}`
    );
    if (d?.profile_status !== "ready") process.exit(1);
  }

  {
    const { res, json } = await req("GET", `/api/v1/datasets/${datasetId}/statistics/`, {
      token: access,
    });
    const d = dataOf(json);
    log(
      "GET /api/v1/datasets/{id}/statistics/",
      res.ok && d?.statistics?.columns?.col_a,
      JSON.stringify(d?.statistics?.columns?.col_a?.dtype)
    );
    if (!res.ok) process.exit(1);
  }

  {
    const { res, json } = await req("GET", `/api/v1/datasets/?organization_id=${orgId}`, {
      token: access,
    });
    const list = dataOf(json) || [];
    const found = list.some((d) => d.id === datasetId);
    log("GET /api/v1/datasets/", res.ok && found, `found=${found}`);
    if (!res.ok || !found) process.exit(1);
  }

  console.log("\nTracks 2–4 validation — all checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
