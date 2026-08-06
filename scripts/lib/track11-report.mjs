/**
 * Track 11 — write machine-readable integration certification reports.
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const REPORT_DIR = join(process.cwd(), "docs", "sprint-2", "reports");

export function ensureReportDir() {
  try {
    mkdirSync(REPORT_DIR, { recursive: true });
  } catch {
    /* exists */
  }
}

export function writePhaseReport(phase, summary, checks = []) {
  ensureReportDir();
  const report = {
    phase,
    generated_at: new Date().toISOString(),
    api: process.env.VITE_API_BASE_URL || "http://localhost:8000",
    summary,
    checks,
  };
  const path = join(REPORT_DIR, `track11-${phase}-latest.json`);
  writeFileSync(path, JSON.stringify(report, null, 2));
  return path;
}

export function readPhaseReport(phase) {
  const path = join(REPORT_DIR, `track11-${phase}-latest.json`);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

export function reportDir() {
  return REPORT_DIR;
}
