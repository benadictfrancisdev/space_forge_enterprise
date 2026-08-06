/**
 * Track 9.8 — Reliability Certification
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
  console.log("Track 9.8 Reliability Certification →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track9-reliability");
  const { orgId, workspaceId } = await ensureTenant(access);
  const { datasetId } = await uploadProfiledDataset(access, orgId, workspaceId);

  // Invalid dataset create
  {
    const { res } = await req("POST", "/api/v1/datasets/", {
      token: access,
      body: { organization_id: orgId, workspace_id: workspaceId },
    });
    record("missing name rejected", res.status === 400, String(res.status));
  }

  // Missing org on list
  {
    const { res } = await req("GET", "/api/v1/datasets/", { token: access });
    record("missing org_id rejected", res.status === 400, String(res.status));
  }

  // Nonexistent dataset
  {
    const { res } = await req("GET", "/api/v1/datasets/00000000-0000-0000-0000-000000000099/", { token: access });
    record("missing dataset 404", res.status === 404, String(res.status));
  }

  // Invalid AI operation
  {
    const { res } = await req("POST", "/api/v1/ai/bad-operation/", {
      token: access,
      body: { organization_id: orgId, dataset_id: datasetId },
    });
    record("invalid AI op rejected", res.status === 400, String(res.status));
  }

  // Expired / bad token
  {
    const { res } = await req("GET", `/api/v1/datasets/${datasetId}/`, {
      token: "Bearer.invalid.token.value",
    });
    record("bad token rejected", res.status === 401, String(res.status));
  }

  // Refresh token reuse (security + reliability)
  {
    const { json: ex } = await req("POST", "/api/v1/auth/exchange/", {
      body: { token: "dev:track9-reuse:reuse@spaceforge.local" },
    });
    const refresh = dataOf(ex)?.refresh_token;
    await req("POST", "/api/v1/auth/refresh/", { body: { refresh_token: refresh } });
    const reuse = await req("POST", "/api/v1/auth/refresh/", { body: { refresh_token: refresh } });
    record("refresh reuse rejected", reuse.res.status === 401, String(reuse.res.status));
  }

  // Concurrent AI requests
  {
    const body = { organization_id: orgId, dataset_id: datasetId, question: "concurrent" };
    const results = await Promise.all(
      Array.from({ length: 3 }, () => req("POST", "/api/v1/ai/chat/", { token: access, body }))
    );
    const allOk = results.every((r) => r.res.ok && dataOf(r.json)?.operation === "chat");
    record("concurrent AI requests", allOk, `n=${results.length}`);
  }

  // Job cancel on terminal job → 400
  {
    const { json } = await req("POST", "/api/v1/jobs/", {
      token: access,
      body: {
        organization_id: orgId,
        job_type: "platform.ping",
        payload: {},
        timeout_seconds: 60,
      },
    });
    const jobId = dataOf(json)?.id;
    const cancel = await req("POST", `/api/v1/jobs/${jobId}/cancel/`, { token: access });
    record("cancel terminal job handled", cancel.res.status === 400, String(cancel.res.status));
  }

  const path = writePhaseReport("reliability", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.8 reliability certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
