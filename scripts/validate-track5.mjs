/**
 * Track 5 validation — Django AI gateway (inline engines).
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
  console.log("Track 5 validation →", API);

  {
    const { res, json } = await req("GET", "/api/v1/ai/health/");
    const d = dataOf(json);
    log("GET /api/v1/ai/health/", res.ok && json?.success && d?.status === "ok", d?.status);
    if (!res.ok) process.exit(1);
  }

  let access;
  {
    const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track5:track5@spaceforge.local" },
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
        body: { name: "Track5 Org" },
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

  let datasetId;
  {
    const form = new FormData();
    form.append("organization_id", orgId);
    form.append("workspace_id", workspaceId);
    form.append(
      "file",
      new Blob(["revenue,region\n10,West\n20,East\n30,West\n"], { type: "text/csv" }),
      "t5.csv"
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
        name: "t5-dataset",
        storage_object_id: storageId,
      },
    }));
    datasetId = dataOf(json)?.id;
    await req("POST", `/api/v1/datasets/${datasetId}/profile/`, { token: access });
    log("dataset profiled", !!datasetId, datasetId);
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/chat/", {
      token: access,
      body: {
        organization_id: orgId,
        dataset_id: datasetId,
        question: "Summarize revenue",
      },
    });
    const d = dataOf(json);
    log(
      "POST /api/v1/ai/chat/",
      res.ok &&
        d?.operation === "chat" &&
        !!d?.result?.answer &&
        d?.evaluation?.provider === "heuristic" &&
        typeof d?.evaluation?.cost_usd === "number",
      `${d?.evaluation?.provider} · ${d?.evaluation?.latency_ms}ms`
    );
    if (!res.ok) process.exit(1);
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/forecast/", {
      token: access,
      body: { organization_id: orgId, dataset_id: datasetId, horizon: 5 },
    });
    const d = dataOf(json);
    log(
      "POST /api/v1/ai/forecast/",
      res.ok && d?.result?.forecast?.length === 5,
      `n=${d?.result?.forecast?.length}`
    );
    if (!res.ok) process.exit(1);
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/scientist/", {
      token: access,
      body: { organization_id: orgId, dataset_id: datasetId },
    });
    log("POST /api/v1/ai/scientist/", res.ok && !!dataOf(json)?.result?.findings);
    if (!res.ok) process.exit(1);
  }

  console.log("\nTrack 5 — AI gateway checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
