/**
 * Track 12 Wave 3 — Trusted AI pytest certification
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const REPORT_DIR = join(ROOT, "docs", "sprint-2", "reports");

function main() {
  console.log("Track 12 Wave 3 — Trusted AI Certification\n");
  const cmd =
    "cd backend && .venv\\Scripts\\python.exe -m pytest tests/test_track12_wave3.py -q";
  const out = execSync(cmd, { encoding: "utf8", cwd: ROOT });
  console.log(out);
  const passed = (out.match(/(\d+) passed/) || [])[1];
  const failed = (out.match(/(\d+) failed/) || [])[1] || "0";
  const ok = failed === "0" && Number(passed) > 0;

  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, "track12-wave3-latest.json"),
    JSON.stringify({ track: "12-wave3", timestamp: new Date().toISOString(), passed, failed, ok }, null, 2)
  );

  if (!ok) process.exit(1);
  console.log("\nTrack 12 Wave 3 certification PASSED");
}

main();
