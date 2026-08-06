/**
 * Track 11B — write machine-readable connector expansion certification reports.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPORT_DIR = join(process.cwd(), "docs", "sprint-2", "reports");

export function reportDir() {
  return REPORT_DIR;
}

export function readPhaseReport(phase) {
  const path = join(REPORT_DIR, `track11b-${phase}-latest.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writePhaseReport(phase, summary, checks = []) {
  try {
    mkdirSync(REPORT_DIR, { recursive: true });
  } catch {
    /* exists */
  }
  const report = {
    phase,
    generated_at: new Date().toISOString(),
    api: process.env.VITE_API_BASE_URL || "http://localhost:8000",
    summary,
    checks,
  };
  const path = join(REPORT_DIR, `track11b-${phase}-latest.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}
