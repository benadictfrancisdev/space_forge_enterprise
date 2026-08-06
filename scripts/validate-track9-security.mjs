/**
 * Track 9.5 — Security Certification (extends Track 7)
 */
import {
  apiBase,
  log,
  dataOf,
  req,
  authExchange,
  ensureTenant,
  uploadProfiledDataset,
} from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track9-report.mjs";

async function main() {
  console.log("Track 9.5 Security Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  // User A
  const { res: exRes, json: exJson } = await req("POST", "/api/v1/auth/exchange/", {
    body: { token: "dev:track9-sec-a:sec-a@spaceforge.local", device_label: "sec-a" },
  });
  const accessA = dataOf(exJson)?.access_token;
  let refreshA = dataOf(exJson)?.refresh_token;
  record("auth exchange", exRes.ok && !!accessA && !!refreshA);

  // User B
  const exB = await req("POST", "/api/v1/auth/exchange/", {
    body: { token: "dev:track9-sec-b:sec-b@spaceforge.local", device_label: "sec-b" },
  });
  const tokenB = dataOf(exB.json)?.access_token;
  record("second tenant auth", !!tokenB);

  const { orgId, workspaceId } = await ensureTenant(accessA);
  const { datasetId } = await uploadProfiledDataset(accessA, orgId, workspaceId);

  // Refresh rotation
  {
    const { res, json } = await req("POST", "/api/v1/auth/refresh/", {
      body: { refresh_token: refreshA },
    });
    const d = dataOf(json);
    const rotated = d?.refresh_token && d.refresh_token !== refreshA;
    refreshA = d?.refresh_token;
    record("refresh rotation", res.ok && rotated && !!d?.access_token);
  }

  // Sessions list
  {
    const { res, json } = await req("GET", "/api/v1/auth/sessions/", { token: accessA });
    record("list sessions", res.ok && (dataOf(json) || []).length >= 1);
  }

  // Cross-tenant isolation
  {
    const { res } = await req("GET", `/api/v1/organizations/${orgId}/`, { token: tokenB });
    record("cross-org access blocked", res.status === 403 || res.status === 404, String(res.status));
  }

  {
    const { res } = await req("GET", `/api/v1/datasets/${datasetId}/`, { token: tokenB });
    record("cross-org dataset blocked", res.status === 403 || res.status === 404, String(res.status));
  }

  // Unauthenticated
  {
    const { res } = await req("GET", `/api/v1/datasets/?organization_id=${orgId}`);
    record("unauthenticated blocked", res.status === 401, String(res.status));
  }

  // Audit readable by owner
  {
    const { res, json } = await req("GET", `/api/v1/audit/?organization_id=${orgId}&page=1`, { token: accessA });
    const items = dataOf(json) || [];
    record("audit log accessible", res.ok && items.length >= 1, `n=${items.length}`);
  }

  // Logout
  {
    const { res, json } = await req("POST", "/api/v1/auth/logout/", { token: accessA });
    record("logout", res.ok && dataOf(json)?.revoked === true);
  }

  const path = writePhaseReport("security", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.5 security certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
