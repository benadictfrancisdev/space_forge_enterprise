/**
 * Track 10.1 — Structured Logging Certification
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { apiBase, log, req, authExchange, ensureTenant } from "./lib/track9-http.mjs";
import { writePhaseReport } from "./lib/track10-report.mjs";

function readSrc(rel) {
  return readFileSync(join(process.cwd(), rel), "utf8");
}

async function main() {
  console.log("Track 10.1 Structured Logging →", apiBase());
  const checks = [];
  let failed = 0;

  function record(name, ok, detail = "") {
    log(name, ok, detail);
    checks.push({ name, status: ok ? "PASS" : "FAIL", detail });
    if (!ok) failed++;
  }

  const loggingSrc = readSrc("backend/apps/core/logging.py");
  record("trace_id contextvar", loggingSrc.includes("ContextVar") && loggingSrc.includes("get_trace_id"));
  record("organization_id contextvar", loggingSrc.includes("organization_id") && loggingSrc.includes("set_organization_id"));
  record("JSON formatter fields", loggingSrc.includes('"organization_id"'));

  const mwSrc = readSrc("backend/apps/core/middleware.py");
  record("TraceIdMiddleware", mwSrc.includes("class TraceIdMiddleware"));
  record("RequestLoggingMiddleware org context", mwSrc.includes("organization_id") && mwSrc.includes("_resolve_organization_id"));

  const access = await authExchange("track10-logging");
  const { orgId } = await ensureTenant(access);
  const { res } = await req("GET", `/api/v1/datasets/?organization_id=${orgId}&page=1`, { token: access });
  const traceHeader = res.headers.get("x-trace-id") || res.headers.get("x-request-id");
  record("live trace header", res.ok && !!traceHeader, traceHeader?.slice(0, 8));

  const path = writePhaseReport("logging", { passed: checks.length - failed, failed, total: checks.length }, checks);
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.1 structured logging certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
