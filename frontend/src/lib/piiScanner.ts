/**
 * Client-side PII (Personally Identifiable Information) Scanner
 * Detects sensitive data patterns entirely in the browser — nothing leaves the client.
 */

export type PIIType =
  | "email"
  | "phone"
  | "credit_card"
  | "aadhaar"
  | "pan"
  | "ssn"
  | "ip_address"
  | "name_heuristic"
  | "none";

export interface PIIResult {
  type: PIIType;
  confidence: number; // 0–1
  matchCount: number;
  sampleMatches: string[];
}

export interface ColumnPIIReport {
  column: string;
  piiDetected: boolean;
  results: PIIResult[];
  highestRisk: PIIType;
  riskScore: number; // 0–1
}

export interface DatasetPIIReport {
  totalColumns: number;
  sensitiveColumns: string[];
  columnReports: ColumnPIIReport[];
  overallRisk: "low" | "medium" | "high";
}

// ── Pattern library ──────────────────────────────────────────────

const PATTERNS: Record<PIIType, RegExp> = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  phone: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/,
  credit_card: /\b(?:\d[ -]*?){13,19}\b/,
  aadhaar: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  pan: /\b[A-Z]{5}\d{4}[A-Z]\b/,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/,
  name_heuristic: /^[A-Z][a-z]+(?:\s[A-Z][a-z]+){1,3}$/,
  none: /(?!)/,  // never matches
};

// ── Helpers ──────────────────────────────────────────────────────

function testColumn(values: string[], pattern: RegExp): { matchCount: number; samples: string[] } {
  let matchCount = 0;
  const samples: string[] = [];
  for (const v of values) {
    if (pattern.test(String(v))) {
      matchCount++;
      if (samples.length < 3) samples.push(String(v));
    }
  }
  return { matchCount, samples };
}

// ── Public API ───────────────────────────────────────────────────

export function scanColumn(values: string[]): PIIResult[] {
  const total = values.length;
  if (total === 0) return [];

  const results: PIIResult[] = [];

  for (const [type, pattern] of Object.entries(PATTERNS) as [PIIType, RegExp][]) {
    if (type === "none") continue;
    const { matchCount, samples } = testColumn(values, pattern);
    if (matchCount === 0) continue;

    const confidence = matchCount / total;
    results.push({
      type,
      confidence,
      matchCount,
      sampleMatches: samples,
    });
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}

export function scanDataset(
  data: Record<string, unknown>[],
  columns: string[]
): DatasetPIIReport {
  const columnReports: ColumnPIIReport[] = [];
  const sensitiveColumns: string[] = [];

  for (const col of columns) {
    const values = data.map((row) => String(row[col] ?? "")).filter(Boolean);
    const results = scanColumn(values);

    const piiDetected = results.some((r) => r.confidence > 0.3);
    const highestRisk: PIIType = results.length > 0 ? results[0].type : "none";
    const riskScore = results.length > 0 ? results[0].confidence : 0;

    if (piiDetected) sensitiveColumns.push(col);

    columnReports.push({ column: col, piiDetected, results, highestRisk, riskScore });
  }

  const maxRisk = Math.max(0, ...columnReports.map((r) => r.riskScore));
  const overallRisk: DatasetPIIReport["overallRisk"] =
    maxRisk > 0.6 ? "high" : maxRisk > 0.3 ? "medium" : "low";

  return {
    totalColumns: columns.length,
    sensitiveColumns,
    columnReports,
    overallRisk,
  };
}
