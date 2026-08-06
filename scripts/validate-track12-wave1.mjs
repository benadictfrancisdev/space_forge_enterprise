/**
 * Track 12 Wave 1 — Trusted Data Platform pytest certification
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REPORT_DIR = join(ROOT, "docs", "sprint-2", "reports");

function runPytest() {
  const cmd =
    "cd backend && .venv\\Scripts\\python.exe -m pytest tests/test_track12_wave1.py -q";
  const out = execSync(cmd, { encoding: "utf8", cwd: ROOT });
  const passed = (out.match(/(\d+) passed/) || [])[1];
  const failed = (out.match(/(\d+) failed/) || [])[1] || "0";
  return { ok: failed === "0" && Number(passed) > 0, out, passed, failed };
}

function main() {
  console.log("Track 12 Wave 1 — Trusted Data Platform Certification\n");
  const result = runPytest();
  console.log(result.out);

  mkdirSync(REPORT_DIR, { recursive: true });
  const report = {
    track: "12-wave1",
    timestamp: new Date().toISOString(),
    passed: result.passed,
    failed: result.failed,
    ok: result.ok,
  };
  writeFileSync(
    join(REPORT_DIR, "track12-wave1-latest.json"),
    JSON.stringify(report, null, 2)
  );

  if (!result.ok) {
    console.error("\nTrack 12 Wave 1 certification FAILED");
    process.exit(1);
  }
  console.log("\nTrack 12 Wave 1 certification PASSED");
}

main();
