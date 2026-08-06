/**
 * Insight Memory — unified findings store keyed by datasetName.
 * Lets every analytics module read/write to a shared knowledge base so
 * reports can cite each other (Databricks Genie style cross-module recall).
 *
 * Lives in localStorage for instant cross-component access without server roundtrip.
 * Pairs with `useDataMemory` for long-term persistence.
 */

import type { UniversalEnvelope } from "./outputEnvelope";

export type InsightSource =
  | "stakeholder_report"
  | "full_report"
  | "decision_intelligence"
  | "anomaly_watch"
  | "forecast"
  | "root_cause"
  | "auto_narrative"
  | "ceo_mode"
  | "insight_inbox"
  | "kpi_cards";

export interface SharedFinding {
  id: string;
  datasetName: string;
  source: InsightSource;
  headline: string;
  confidence: number;
  evidenceCount: number;
  topInsight?: string;
  topRecommendation?: string;
  createdAt: string;
}

const KEY_PREFIX = "sf_insight_memory_";

function storageKey(datasetName: string): string {
  return `${KEY_PREFIX}${datasetName || "default"}`;
}

export function recordFinding(
  datasetName: string,
  source: InsightSource,
  envelope: UniversalEnvelope,
): SharedFinding {
  const finding: SharedFinding = {
    id: `${source}-${Date.now()}`,
    datasetName,
    source,
    headline: envelope.headline,
    confidence: envelope.confidence,
    evidenceCount: envelope.evidence?.length || 0,
    topInsight: envelope.insights?.[0]?.finding,
    topRecommendation: envelope.recommendations?.[0]?.action,
    createdAt: new Date().toISOString(),
  };

  try {
    const existing = readFindings(datasetName);
    const next = [finding, ...existing].slice(0, 50);
    localStorage.setItem(storageKey(datasetName), JSON.stringify(next));
  } catch (err) {
    console.warn("[InsightMemory] Failed to record:", err);
  }

  return finding;
}

export function readFindings(datasetName: string): SharedFinding[] {
  try {
    const raw = localStorage.getItem(storageKey(datasetName));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getCrossModuleContext(datasetName: string, excludeSource?: InsightSource): string {
  const findings = readFindings(datasetName).filter((f) => f.source !== excludeSource);
  if (findings.length === 0) return "";
  const compact = findings.slice(0, 8).map((f) => ({
    src: f.source,
    h: f.headline,
    c: f.confidence,
    rec: f.topRecommendation?.slice(0, 100),
  }));
  return `\n\nPrior findings on this dataset:\n${JSON.stringify(compact)}`;
}

export function clearFindings(datasetName: string): void {
  try {
    localStorage.removeItem(storageKey(datasetName));
  } catch {
    // ignore
  }
}
