/**
 * Track 10.2 — Metrics Certification
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apiBase, log, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track10-report.mjs";

async function main() {
  console.log("Track 10.2 Metrics →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const metricsSrc = readFileSync(join(process.cwd(), "backend/apps/core/metrics.py"), "utf8");
  record("metrics hooks module", metricsSrc.includes("def incr") && metricsSrc.includes("def gauge"));
  record("prometheus renderer", metricsSrc.includes("render_prometheus"));

  const access = await authExchange("track10-metrics");
  const { orgId } = await ensureTenant(access);
  await req("GET", `/api/v1/datasets/?organization_id=${orgId}&page=1`, { token: access });

  const API = apiBase();
  const res = await fetch(`${API}/metrics`);
  const text = await res.text();
  record("GET /metrics", res.ok && res.headers.get("content-type")?.includes("text/plain"), String(res.status));
  record("http_requests_total exposed", text.includes("http_requests_total"));

  const path = writePhaseReport("metrics", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.2 metrics certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
