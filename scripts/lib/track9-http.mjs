/**
 * Track 9 — shared HTTP helpers for certification scripts.
 */
const API = process.env.VITE_API_BASE_URL || "http://localhost:8000";

export function apiBase() {
  return API;
}

export function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

export function logSkip(step, reason = "") {
  console.log(`[SKIP] ${step}${reason ? " — " + reason : ""}`);
}

export function dataOf(json) {
  if (json && typeof json === "object" && "success" in json) return json.data;
  return json;
}

export async function req(method, urlPath, { token, body, formData } = {}) {
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

export async function ensureTenant(token) {
  let orgId;
  let workspaceId;

  let { res, json } = await req("GET", "/api/v1/organizations/", { token });
  let orgs = dataOf(json) || [];
  if (!orgs.length) {
    ({ res, json } = await req("POST", "/api/v1/organizations/", {
      token,
      body: { name: `Track9 Org ${Date.now()}` },
    }));
    orgs = [dataOf(json)];
  }
  orgId = orgs[0]?.id;

  ({ res, json } = await req("GET", `/api/v1/workspaces/?organization_id=${orgId}`, { token }));
  let workspaces = dataOf(json) || [];
  if (!workspaces.length) {
    ({ res, json } = await req("POST", "/api/v1/workspaces/", {
      token,
      body: { organization_id: orgId, name: "Track9 Workspace" },
    }));
    workspaces = [dataOf(json)];
  }
  workspaceId = workspaces[0]?.id;

  if (!orgId || !workspaceId) throw new Error("Failed to ensure tenant");
  return { orgId, workspaceId };
}

export async function uploadProfiledDataset(token, orgId, workspaceId) {
  const form = new FormData();
  form.append("organization_id", orgId);
  form.append("workspace_id", workspaceId);
  form.append(
    "file",
    new Blob(
      ["revenue,region,units\n100,West,10\n200,East,20\n150,West,15\n180,East,18\n"],
      { type: "text/csv" }
    ),
    "track9-cert.csv"
  );

  let { res, json } = await req("POST", "/api/v1/storage/objects/", { token, formData: form });
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status}`);
  const storageId = dataOf(json)?.id;

  ({ res, json } = await req("POST", "/api/v1/datasets/", {
    token,
    body: {
      organization_id: orgId,
      workspace_id: workspaceId,
      name: "Track9 Cert Dataset",
      storage_object_id: storageId,
    },
  }));
  if (!res.ok) throw new Error(`Dataset create failed: ${res.status}`);
  const datasetId = dataOf(json)?.id;

  ({ res, json } = await req("POST", `/api/v1/datasets/${datasetId}/profile/`, { token }));
  if (!res.ok) throw new Error(`Profile enqueue failed: ${res.status}`);
  const profiled = dataOf(json);
  if (profiled?.profile_status !== "ready") {
    throw new Error(`Profile not ready: ${profiled?.profile_status}`);
  }

  return { datasetId, dataset: profiled };
}

export async function authExchange(label = "track9") {
  const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
    body: { token: `dev:${label}:${label}@spaceforge.local`, device_label: `validate-${label}` },
  });
  const access = dataOf(json)?.access_token;
  if (!res.ok || !access) throw new Error("Auth exchange failed");
  return access;
}

export function timed(fn) {
  const t0 = performance.now();
  return fn().then((result) => ({ result, ms: Math.round(performance.now() - t0) }));
}

export function aiEnvelopeOk(data) {
  if (!data) return false;
  const hasEval = data.evaluation?.provider;
  const hasMeta = data.metadata?.schema_version === "ai@v1" || data.metadata?.prompt_version;
  const result = data.result;
  const hasContent =
    (typeof result === "object" && result && (result.summary || result.details)) ||
    data.summary ||
    data.answer ||
    data.headline ||
    typeof result === "string";
  return !!(data.operation && hasEval && hasMeta && hasContent);
}
