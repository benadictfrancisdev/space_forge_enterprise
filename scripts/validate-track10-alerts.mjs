/**
 * Track 10.6 — Alerting Certification
 */
import { apiBase, log, dataOf, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track10-report.mjs";

async function main() {
  console.log("Track 10.6 Alerting →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const access = await authExchange("track10-alerts");
  const { orgId } = await ensureTenant(access);

  const { res, json } = await req("GET", `/api/v1/ops/alerts/?organization_id=${orgId}`, { token: access });
  const d = dataOf(json);
  record("alerts endpoint", res.ok && Array.isArray(d?.alerts), `n=${d?.alerts?.length}`);

  const summary = dataOf(
    (await req("GET", `/api/v1/ops/summary/?organization_id=${orgId}`, { token: access })).json
  );
  record("ops summary includes alerts", Array.isArray(summary?.alerts));
  record("ops summary platform health", summary?.platform?.status === "ok" || summary?.platform?.status === "degraded", summary?.platform?.status);

  const path = writePhaseReport("alerts", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.6 alerting certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
