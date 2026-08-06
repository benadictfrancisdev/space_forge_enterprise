/**
 * Track 11 — Full integration platform certification (11.1–11.7)
 * 1. Pytest regression (offline)
 * 2. Live API integration (requires dev:backend:lite)
 */
import { execSync } from "node:child_process";
import { apiBase } from "./lib/track9-http.mjs";

const SCRIPTS = [
  { phase: "11.x Pytest regression", cmd: "node scripts/validate-track11-pytest.mjs", needsBackend: false },
  { phase: "11.x Live integration", cmd: "node scripts/validate-track11-integration.mjs", needsBackend: true },
];

function log(phase, ok, detail = "") {
  console.log(
    `\n${"=".repeat(60)}\n[${ok ? "PASS" : "FAIL"}] ${phase}${detail ? " — " + detail : ""}\n${"=".repeat(60)}`
  );
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
  console.log("SpaceForge Track 11 — Enterprise Integration Platform Certification\n");

  let failed = 0;
  let backendOk = null;

  for (const { phase, cmd, needsBackend } of SCRIPTS) {
    if (needsBackend) {
      if (backendOk === null) backendOk = await preflight();
      if (!backendOk) {
        log(phase, false, "skipped — backend offline");
        failed++;
        continue;
      }
    }

    try {
      execSync(cmd, { stdio: "inherit", cwd: process.cwd() });
      log(phase, true);
    } catch {
      log(phase, false);
      failed++;
      if (process.env.TRACK11_FAIL_FAST === "1") break;
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  if (failed) {
    console.log(`Track 11 certification FAILED — ${failed} phase(s) failed`);
    process.exit(1);
  }
  console.log("Track 11 certification COMPLETE — pytest + live integration passed");
  console.log(`Reports: docs/sprint-2/reports/`);
}

main();
