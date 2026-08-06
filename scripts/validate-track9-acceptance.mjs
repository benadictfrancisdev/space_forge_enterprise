/**
 * Track 9.9 — Enterprise Acceptance (aggregates all phase reports)
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { writePhaseReport, reportDir } from "./lib/track9-report.mjs";
import { execSync } from "node:child_process";

function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

const PHASES = [
  { id: "functional", script: "validate-track9.mjs", report: "track9-functional-latest.json" },
  { id: "integration", script: "validate-track9-integration.mjs", report: "track9-integration-latest.json" },
  { id: "ai", script: "validate-track9-ai.mjs", report: "track9-ai-latest.json" },
  { id: "database", script: "validate-track9-db.mjs", report: "track9-database-latest.json" },
  { id: "security", script: "validate-track9-security.mjs", report: "track9-security-latest.json" },
  { id: "frontend", script: "validate-track9-frontend.mjs", report: "track9-frontend-latest.json" },
  { id: "performance", script: "validate-track9-perf.mjs", report: "track9-performance-latest.json" },
  { id: "reliability", script: "validate-track9-reliability.mjs", report: "track9-reliability-latest.json" },
];

function loadReport(name) {
  const path = join(reportDir(), name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

async function main() {
  console.log("Track 9.9 Enterprise Acceptance Certification\n");
  const checks = [];
  let failed = 0;

  // Pytest
  try {
    const out = execSync(
      "cd backend && .venv\\Scripts\\python.exe -m pytest tests/test_functional_certification.py tests/test_integration_certification.py tests/test_ai_certification.py tests/test_database_certification.py tests/test_reliability_certification.py tests/test_track7_security.py -q",
      { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }
    );
    const m = out.match(/(\d+) passed/);
    const passed = m ? parseInt(m[1], 10) : 0;
    log("backend certification pytest", passed > 0, `${passed} passed`);
    checks.push({ name: "backend pytest", status: passed > 0 ? "PASS" : "FAIL", detail: out.trim().split("\n").pop() });
    if (passed === 0) failed++;
  } catch (e) {
    log("backend certification pytest", false, e.stdout?.split("\n").pop() || e.message);
    checks.push({ name: "backend pytest", status: "FAIL", detail: String(e.message) });
    failed++;
  }

  // Build
  try {
    execSync("npm run build", { encoding: "utf8", stdio: "pipe" });
    log("frontend build", true);
    checks.push({ name: "frontend build", status: "PASS" });
  } catch (e) {
    log("frontend build", false);
    checks.push({ name: "frontend build", status: "FAIL" });
    failed++;
  }

  // Phase reports
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
    enterprise_ready: failed === 0,
    reliable: loadReport("track9-reliability-latest.json")?.summary?.failed === 0,
    secure: loadReport("track9-security-latest.json")?.summary?.failed === 0,
    performant: loadReport("track9-performance-latest.json")?.summary?.failed === 0,
    intuitive: "manual UI checklist required — see TRACK-9-FRONTEND-CERTIFICATION.md",
    pilot_waivers: ["live_connectors (local)", "history (local)"],
  };

  const path = writePhaseReport(
    "acceptance",
    { passed: checks.filter((c) => c.status === "PASS").length, failed, total: checks.length, acceptance },
    checks
  );

  console.log("\n--- Enterprise Acceptance ---");
  console.log(JSON.stringify(acceptance, null, 2));
  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 9.9 enterprise acceptance PASSED — Sprint 1 certification complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
