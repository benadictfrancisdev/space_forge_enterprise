/**
 * Track 10.7 — Operations Acceptance (aggregates all phase reports)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writePhaseReport, reportDir } from "./lib/track10-report.mjs";
import { execSync } from "node:child_process";

function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

const PHASES = [
  { id: "logging", report: "track10-logging-latest.json" },
  { id: "metrics", report: "track10-metrics-latest.json" },
  { id: "health", report: "track10-health-latest.json" },
  { id: "jobs", report: "track10-jobs-latest.json" },
  { id: "ai-ops", report: "track10-ai-ops-latest.json" },
  { id: "alerts", report: "track10-alerts-latest.json" },
];

function loadReport(name) {
  const path = join(reportDir(), name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  console.log("Track 10.7 Operations Acceptance Certification\n");
  const checks = [];
  let failed = 0;

  try {
    const out = execSync(
      "cd backend && .venv\\Scripts\\python.exe -m pytest tests/test_track10_ops.py -q",
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const m = out.match(/(\d+) passed/);
    const passed = m ? parseInt(m[1], 10) : 0;
    log("backend ops pytest", passed > 0, `${passed} passed`);
    checks.push({ name: "backend ops pytest", status: passed > 0 ? "PASS" : "FAIL", detail: out.trim().split("\n").pop() });
    if (passed === 0) failed++;
  } catch (e) {
    log("backend ops pytest", false, e.stdout?.split("\n").pop() || e.message);
    checks.push({ name: "backend ops pytest", status: "FAIL", detail: String(e.message) });
    failed++;
  }

  for (const phase of PHASES) {
    const report = loadReport(phase.report);
    const ok = report && (report.summary?.failed ?? 1) === 0;
    log(`phase ${phase.id}`, ok, report ? `passed=${report.summary?.passed}` : "report missing");
    checks.push({
      name: `phase:${phase.id}`,
      status: ok ? "PASS" : report ? "FAIL" : "MISSING",
      detail: report?.summary,
    });
    if (!ok) failed++;
  }

  const acceptance = {
    operations_ready: failed === 0,
    observable: loadReport("track10-logging-latest.json")?.summary?.failed === 0,
    metrics_active: loadReport("track10-metrics-latest.json")?.summary?.failed === 0,
    health_monitored: loadReport("track10-health-latest.json")?.summary?.failed === 0,
    jobs_monitored: loadReport("track10-jobs-latest.json")?.summary?.failed === 0,
    ai_ops_visible: loadReport("track10-ai-ops-latest.json")?.summary?.failed === 0,
    alerting_defined: loadReport("track10-alerts-latest.json")?.summary?.failed === 0,
    sprint1_exit_prerequisite: "Track 9 enterprise_ready + Track 10 operations_ready",
  };

  const path = writePhaseReport(
    "acceptance",
    { passed: checks.filter((c) => c.status === "PASS").length, failed, total: checks.length, acceptance },
    checks
  );

  console.log("\n--- Operations Acceptance ---");
  console.log(JSON.stringify(acceptance, null, 2));
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 10.7 operations acceptance PASSED — Sprint 1 observability complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
