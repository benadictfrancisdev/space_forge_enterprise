/**
 * Track 8.3 validation — pagination + lean dataset list.
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
  console.log("Track 8.3 DB/pagination validation →", API);

  let access;
  let orgId;
  let wsId;
  {
    const { res, json } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track8:track8@spaceforge.local", device_label: "validate-t8-db" },
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
        body: { name: "Track8 DB Org" },
      }));
      orgs = [dataOf(json)];
    }
    orgId = orgs[0]?.id;
    log("organization", res.ok && !!orgId);
    if (!orgId) process.exit(1);
  }

  {
    const { res, json } = await req("POST", "/api/v1/workspaces/", {
      token: access,
      body: { organization_id: orgId, name: "Track8 WS" },
    });
    wsId = dataOf(json)?.id;
    log("workspace", res.ok && !!wsId);
    if (!wsId) process.exit(1);
  }

  for (let i = 0; i < 2; i++) {
    await req("POST", "/api/v1/datasets/", {
      token: access,
      body: { organization_id: orgId, workspace_id: wsId, name: `T8 Dataset ${i}` },
    });
  }

  {
    const { res, json } = await req(
      "GET",
      `/api/v1/datasets/?organization_id=${orgId}&page=1&page_size=1`,
      { token: access }
    );
    const items = dataOf(json) || [];
    const meta = json?.meta || {};
    const lean = items[0] && !("schema" in items[0]) && !("statistics" in items[0]);
    log("dataset pagination + lean list", res.ok && meta.count >= 2 && lean, `count=${meta.count}`);
    if (!res.ok || !lean) process.exit(1);
  }

  console.log("\nTrack 8.3 validation complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
