/**
 * Track 10 — Full operations certification orchestrator (phases 10.1–10.7)
 * Requires: npm run dev:backend:lite
 */
import { execSync } from "node:child_process";
import { apiBase } from "./lib/track9-http.mjs";

const SCRIPTS = [
  { phase: "10.1 Logging", cmd: "node scripts/validate-track10-logging.mjs" },
  { phase: "10.2 Metrics", cmd: "node scripts/validate-track10-metrics.mjs" },
  { phase: "10.3 Health", cmd: "node scripts/validate-track10-health.mjs" },
  { phase: "10.4 Jobs", cmd: "node scripts/validate-track10-jobs.mjs" },
  { phase: "10.5 AI Ops", cmd: "node scripts/validate-track10-ai-ops.mjs" },
  { phase: "10.6 Alerts", cmd: "node scripts/validate-track10-alerts.mjs" },
  { phase: "10.7 Acceptance", cmd: "node scripts/validate-track10-acceptance.mjs" },
];

function log(phase, ok, detail = "") {
  console.log(`\n${"=".repeat(60)}\n[${ok ? "PASS" : "FAIL"}] ${phase}${detail ? " — " + detail : ""}\n${"=".repeat(60)}`);
}

async function preflight() {
  const api = apiBase();
  try {
    const res = await fetch(`${api}/health/`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json?.status !== "ok") throw new Error(`unhealthy: ${JSON.stringify(json)}`);
    console.log(`Environment OK — backend reachable at ${api}\n`);
    return true;
  } catch (e) {
    console.error(`\nEnvironment validation FAILED — backend not reachable at ${api}`);
    console.error(`Start in another terminal: npm run dev:backend:lite`);
    console.error(`Detail: ${e.message}\n`);
    return false;
  }
}

async function main() {
  console.log("SpaceForge Track 10 — Observability & Operations Certification\n");
  if (!(await preflight())) process.exit(2);

  let failed = 0;
  for (const { phase, cmd } of SCRIPTS) {
    try {
      execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
      log(phase, true);
    } catch {
      log(phase, false);
      failed++;
      if (process.env.TRACK10_FAIL_FAST === "1") break;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (failed) {
    console.log(`Track 10 certification FAILED — ${failed} phase(s) failed`);
    process.exit(1);
  }
  console.log("Track 10 certification COMPLETE — all 7 phases passed");
  console.log(`Reports: docs/sprint-1/reports/`);
}

main();
