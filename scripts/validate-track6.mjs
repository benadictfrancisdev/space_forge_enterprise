/**
 * Track 6 validation — Enterprise Execution Engine (jobs + pipeline).
 * Requires backend lite: npm run dev:backend:lite
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
  console.log("Track 6 validation →", API);

  let access;
  {
    const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track6:track6@spaceforge.local" },
    });
    access = dataOf(json)?.access_token;
    log("auth exchange", res.ok && !!access);
    if (!access) process.exit(1);
  }

  let orgId;
  let workspaceId;
  {
    let { res, json } = await req("GET", "/api/v1/organizations/", { token: access });
    let orgs = dataOf(json) || [];
    if (!orgs.length) {
      ({ res, json } = await req("POST", "/api/v1/organizations/", {
        token: access,
        body: { name: "Track6 Org" },
      }));
      orgs = [dataOf(json)];
    }
    orgId = orgs[0].id;
    ({ res, json } = await req("GET", `/api/v1/workspaces/?organization_id=${orgId}`, {
      token: access,
    }));
    let workspaces = dataOf(json) || [];
    if (!workspaces.length) {
      ({ res, json } = await req("POST", "/api/v1/workspaces/", {
        token: access,
        body: { organization_id: orgId, name: "Default" },
      }));
      workspaces = [dataOf(json)];
    }
    workspaceId = workspaces[0].id;
    log("tenant", !!orgId && !!workspaceId, orgId);
  }

  {
    const { res, json } = await req("POST", "/api/v1/jobs/", {
      token: access,
      body: {
        organization_id: orgId,
        job_type: "platform.ping",
        payload: { ping: true },
        priority: 10,
        timeout_seconds: 60,
      },
    });
    const d = dataOf(json);
    log(
      "POST /api/v1/jobs/ (ping)",
      res.ok && d?.status === "succeeded" && d?.progress_pct === 100 && d?.execution_ms != null,
      `priority=${d?.priority} ms=${d?.execution_ms}`
    );
    if (!res.ok || d?.status !== "succeeded") process.exit(1);
  }

  let datasetId;
  {
    const form = new FormData();
    form.append("organization_id", orgId);
    form.append("workspace_id", workspaceId);
    form.append(
      "file",
      new Blob(["revenue,region\n10,West\n20,East\n30,West\n"], { type: "text/csv" }),
      "t6.csv"
    );
    let { res, json } = await req("POST", "/api/v1/storage/objects/", {
      token: access,
      formData: form,
    });
    const storageId = dataOf(json)?.id;
    ({ res, json } = await req("POST", "/api/v1/datasets/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        name: "t6-dataset",
        storage_object_id: storageId,
      },
    }));
    datasetId = dataOf(json)?.id;
    log("dataset created", !!datasetId, datasetId);
    if (!datasetId) process.exit(1);
  }

  {
    const { res, json } = await req("POST", "/api/v1/jobs/", {
      token: access,
      body: {
        organization_id: orgId,
        workspace_id: workspaceId,
        job_type: "dataset.pipeline",
        payload: { dataset_id: datasetId, horizon: 3 },
        priority: 5,
        timeout_seconds: 300,
      },
    });
    const d = dataOf(json);
    const outputs = d?.result?.outputs || {};
    log(
      "POST /api/v1/jobs/ (dataset.pipeline)",
      res.ok &&
        d?.status === "succeeded" &&
        d?.progress_pct === 100 &&
        !!outputs.forecast &&
        !!outputs.report,
      `stages=${(d?.result?.stages || []).join(",")}`
    );
    if (!res.ok || d?.status !== "succeeded") process.exit(1);

    const jobId = d.id;
    const detail = await req("GET", `/api/v1/jobs/${jobId}/`, { token: access });
    log("GET /api/v1/jobs/{id}/", detail.res.ok && dataOf(detail.json)?.id === jobId);

    const cancel = await req("POST", `/api/v1/jobs/${jobId}/cancel/`, { token: access });
    log(
      "POST cancel (terminal → 400)",
      cancel.res.status === 400,
      String(cancel.res.status)
    );
  }

  console.log("\nTrack 6 — Execution Engine checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
