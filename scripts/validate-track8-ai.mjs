/**
 * Track 8.2 validation — AI Quality Engineering.
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

async function req(method, urlPath, { token, body } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let bodyInit;
  if (body) {
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
  console.log("Track 8.2 AI validation →", API);

  {
    const { res, json } = await req("GET", "/api/v1/ai/health/");
    const d = dataOf(json);
    const hasPrompts = d?.prompt_versions && d.prompt_versions.chat === "chat@v1";
    log("health + prompt registry", res.ok && hasPrompts, d?.schema_version);
    if (!res.ok || !hasPrompts) process.exit(1);
  }

  let access;
  let orgId;
  {
    const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track8:track8@spaceforge.local", device_label: "validate-t8-ai" },
    });
    access = dataOf(json)?.access_token;
    log("auth exchange", res.ok && !!access);
    if (!access) process.exit(1);
  }

  {
    let { res, json } = await req("GET", "/api/v1/organizations/", { token: access });
    let orgs = dataOf(json) || [];
    if (!orgs.length) {
      ({ res, json } = await req("POST", "/api/v1/organizations/", {
        token: access,
        body: { name: "Track8 AI Org" },
      }));
      orgs = [dataOf(json)];
    }
    orgId = orgs[0]?.id;
    log("organization", res.ok && !!orgId, orgId);
    if (!orgId) process.exit(1);
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/chat/", {
      token: access,
      body: { organization_id: orgId, question: "Summarize dataset health" },
    });
    const d = dataOf(json);
    const envelope =
      d?.result?.summary &&
      d?.evaluation?.provider &&
      d?.metadata?.prompt_version === "chat@v1";
    log("chat standard envelope", res.ok && envelope, d?.metadata?.context_hash?.slice(0, 8));
    if (!res.ok || !envelope) process.exit(1);
  }

  {
    const { res, json } = await req("POST", "/api/v1/ai/forecast/", {
      token: access,
      body: { organization_id: orgId, horizon: 5 },
    });
    const d = dataOf(json);
    const points = d?.forecast || d?.result?.details?.forecast;
    log("forecast envelope", res.ok && Array.isArray(points) && points.length === 5);
    if (!res.ok || !points?.length) process.exit(1);
  }

  console.log("\nTrack 8.2 AI validation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
