/**
 * Track 9 — Full certification orchestrator (phases 9.1–9.9)
 * Requires: npm run dev:backend:lite
 */
import { execSync } from "node:child_process";
import { apiBase } from "./lib/track9-http.mjs";

const SCRIPTS = [
  { phase: "9.1 Functional", cmd: "node scripts/validate-track9.mjs" },
  { phase: "9.2 Integration", cmd: "node scripts/validate-track9-integration.mjs" },
  { phase: "9.3 AI Platform", cmd: "node scripts/validate-track9-ai.mjs" },
  { phase: "9.4 Database", cmd: "node scripts/validate-track9-db.mjs" },
  { phase: "9.5 Security", cmd: "node scripts/validate-track9-security.mjs" },
  { phase: "9.6 Frontend", cmd: "node scripts/validate-track9-frontend.mjs" },
  { phase: "9.7 Performance", cmd: "npm run build && node scripts/validate-track9-perf.mjs" },
  { phase: "9.8 Reliability", cmd: "node scripts/validate-track9-reliability.mjs" },
  { phase: "9.9 Acceptance", cmd: "node scripts/validate-track9-acceptance.mjs" },
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
  console.log("SpaceForge Track 9 — Full Enterprise Certification\n");
  if (!(await preflight())) process.exit(2);

  let failed = 0;

  for (const { phase, cmd } of SCRIPTS) {
    try {
      execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
      log(phase, true);
    } catch {
      log(phase, false);
      failed++;
      if (process.env.TRACK9_FAIL_FAST === "1") break;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (failed) {
    console.log(`Track 9 certification FAILED — ${failed} phase(s) failed`);
    process.exit(1);
  }
  console.log("Track 9 certification COMPLETE — all 9 phases passed");
  console.log(`Reports: docs/sprint-1/reports/`);
}

main();
