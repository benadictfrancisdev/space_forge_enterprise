/**
 * Track 11 — Backend pytest regression (phases 11.1–11.7)
 * No running backend required — uses config.settings.test + eager Celery.
 */
import { writePhaseReport } from "./lib/track11-report.mjs";
import { runTrack11Pytest } from "./lib/track11-pytest.mjs";

function log(step, ok, detail = "") {
  console.log(`[${ok ? "PASS" : "FAIL"}] ${step}${detail ? " — " + detail : ""}`);
}

async function main() {
  console.log("Track 11 — Integration Platform Pytest Regression\n");
  const checks = [];
  let failed = 0;

  try {
    const result = runTrack11Pytest();
    const ok = result.failed === 0 && result.passed > 0;
    log("track11 pytest suite", ok, result.tail);
    checks.push({
      name: "track11 pytest suite",
      status: ok ? "PASS" : "FAIL",
      detail: result.tail,
      passed: result.passed,
      failed: result.failed,
    });
    if (!ok) failed++;
  } catch (e) {
    const detail = e.stdout?.trim().split("\n").pop() || e.stderr?.trim().split("\n").pop() || e.message;
    log("track11 pytest suite", false, detail);
    checks.push({ name: "track11 pytest suite", status: "FAIL", detail: String(detail) });
    failed++;
  }

  const path = writePhaseReport(
    "pytest",
    { passed: checks.filter((c) => c.status === "PASS").length, failed, total: checks.length },
    checks
  );

  console.log(`\nReport: ${path}`);
  if (failed) process.exit(1);
  console.log("\nTrack 11 pytest regression complete.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
