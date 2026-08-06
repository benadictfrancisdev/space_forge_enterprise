/**
 * Track 10.5 — AI Operations Certification
 */
import { apiBase, log, dataOf, req, authExchange, ensureTenant, uploadProfiledDataset } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track10-report.mjs";

async function main() {
  console.log("Track 10.5 AI Operations →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track10-ai-ops");
  const { orgId, workspaceId } = await ensureTenant(access);
  const { datasetId } = await uploadProfiledDataset(access, orgId, workspaceId);

  await req("POST", "/api/v1/ai/chat/", {
    token: access,
    body: { organization_id: orgId, dataset_id: datasetId, question: "ops rollup test" },
  });

  const { res, json } = await req("GET", `/api/v1/ops/ai/summary/?organization_id=${orgId}`, { token: access });
  const d = dataOf(json);
  record("ai summary endpoint", res.ok && typeof d?.invocations === "number", `n=${d?.invocations}`);
  record("by_operation rollup", res.ok && typeof d?.by_operation === "object");
  record("by_provider rollup", res.ok && typeof d?.by_provider === "object");
  record("latency aggregate", res.ok && (d?.avg_latency_ms === null || typeof d?.avg_latency_ms === "number"));

  const API = apiBase();
  const metricsRes = await fetch(`${API}/metrics`);
  const metricsText = await metricsRes.text();
  record("ai_requests_total metric", metricsText.includes("ai_requests_total"));

  const path = writePhaseReport("ai-ops", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.5 AI operations certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
