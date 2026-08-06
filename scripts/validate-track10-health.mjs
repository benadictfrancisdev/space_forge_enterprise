/**
 * Track 10.3 — Health Monitoring Certification
 */
import { apiBase, log, dataOf, req } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track10-report.mjs";

async function main() {
  console.log("Track 10.3 Health Monitoring →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  {
    const { res, json } = await req("GET", "/health/");
    record("liveness /health/", res.ok && json?.status === "ok", json?.status);
  }

  {
    const { res, json } = await req("GET", "/health/ready/");
    const checksObj = json?.checks || {};
    record("readiness /health/ready/", res.ok && json?.status === "ready", Object.keys(checksObj).join(","));
    record("database probe", checksObj.database?.ok === true);
    record("redis/cache probe", checksObj.redis?.ok === true);
    record("storage probe", checksObj.storage?.ok === true);
    record("worker probe", checksObj.worker?.ok === true, checksObj.worker?.mode || "");
  }

  {
    const { res, json } = await req("GET", "/api/v1/ops/platform-health/");
    const d = dataOf(json);
    record("ops platform-health", res.ok && d?.readiness?.checks, d?.status);
    record("AI dependency in platform-health", d?.ai?.status === "ok", d?.ai?.transport);
  }

  {
    const { res, json } = await req("GET", "/api/v1/ai/health/");
    const d = dataOf(json);
    record("AI health endpoint", res.ok && d?.status === "ok", `ops=${d?.operations?.length}`);
  }

  const path = writePhaseReport("health", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.3 health monitoring certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
