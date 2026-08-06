/**
 * Client-side Statistical Summarizer
 * Produces a compact JSON profile of a dataset so raw rows never leave the browser.
 */

export interface NumericSummary {
  column: string;
  type: "numeric";
  count: number;
  missing: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
  p25: number;
  p75: number;
}

export interface CategoricalSummary {
  column: string;
  type: "categorical";
  count: number;
  missing: number;
  uniqueCount: number;
  topValues: { value: string; count: number; pct: number }[];
}

export interface DateSummary {
  column: string;
  type: "date";
  count: number;
  missing: number;
  earliest: string;
  latest: string;
  spanDays: number;
}

export type ColumnSummary = NumericSummary | CategoricalSummary | DateSummary;

export interface DatasetSummary {
  rowCount: number;
  columnCount: number;
  columns: ColumnSummary[];
  sampleRows: Record<string, unknown>[]; // 5 anonymised sample rows
}

// ── Helpers ──────────────────────────────────────────────────────

function isNumeric(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  return !isNaN(Number(v));
}

function isDate(v: unknown): boolean {
  if (typeof v !== "string") return false;
  const d = Date.parse(v);
  return !isNaN(d) && v.length > 5;
}

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function percentile(sorted: number[], p: number): number {
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const frac = idx - lower;
  if (lower + 1 >= sorted.length) return sorted[lower];
  return sorted[lower] + frac * (sorted[lower + 1] - sorted[lower]);
}

function stdDev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

// ── Column type detection ────────────────────────────────────────

function detectColumnType(values: unknown[]): "numeric" | "date" | "categorical" {
  const sample = values.filter((v) => v !== null && v !== undefined && v !== "").slice(0, 100);
  if (sample.length === 0) return "categorical";

  const numericCount = sample.filter(isNumeric).length;
  if (numericCount / sample.length > 0.7) return "numeric";

  const dateCount = sample.filter(isDate).length;
  if (dateCount / sample.length > 0.7) return "date";

  return "categorical";
}

// ── Public API ───────────────────────────────────────────────────

export function summarizeDataset(
  data: Record<string, unknown>[],
  columns: string[],
  anonymisedSampleRows?: Record<string, unknown>[]
): DatasetSummary {
  const summaries: ColumnSummary[] = [];

  for (const col of columns) {
    const raw = data.map((r) => r[col]);
    const colType = detectColumnType(raw);

    if (colType === "numeric") {
      const nums = raw.filter(isNumeric).map(Number);
      const missing = raw.length - nums.length;
      if (nums.length === 0) {
        summaries.push({ column: col, type: "numeric", count: 0, missing: raw.length, min: 0, max: 0, mean: 0, median: 0, stdDev: 0, p25: 0, p75: 0 });
        continue;
      }
      nums.sort((a, b) => a - b);
      const mean = nums.reduce((s, v) => s + v, 0) / nums.length;
      summaries.push({
        column: col,
        type: "numeric",
        count: nums.length,
        missing,
        min: nums[0],
        max: nums[nums.length - 1],
        mean: Math.round(mean * 100) / 100,
        median: Math.round(median(nums) * 100) / 100,
        stdDev: Math.round(stdDev(nums, mean) * 100) / 100,
        p25: Math.round(percentile(nums, 25) * 100) / 100,
        p75: Math.round(percentile(nums, 75) * 100) / 100,
      });
    } else if (colType === "date") {
      const dates = raw.filter(isDate).map((v) => new Date(String(v)));
      const missing = raw.length - dates.length;
      dates.sort((a, b) => a.getTime() - b.getTime());
      const earliest = dates.length > 0 ? dates[0].toISOString().split("T")[0] : "";
      const latest = dates.length > 0 ? dates[dates.length - 1].toISOString().split("T")[0] : "";
      const spanDays = dates.length > 1 ? Math.round((dates[dates.length - 1].getTime() - dates[0].getTime()) / 86400000) : 0;
      summaries.push({ column: col, type: "date", count: dates.length, missing, earliest, latest, spanDays });
    } else {
      const strs = raw.map((v) => String(v ?? "")).filter(Boolean);
      const missing = raw.length - strs.length;
      const freq: Record<string, number> = {};
      for (const s of strs) freq[s] = (freq[s] || 0) + 1;
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const topValues = sorted.slice(0, 5).map(([value, count]) => ({
        value,
        count,
        pct: Math.round((count / strs.length) * 10000) / 100,
      }));
      summaries.push({
        column: col,
        type: "categorical",
        count: strs.length,
        missing,
        uniqueCount: sorted.length,
        topValues,
      });
    }
  }

  const sampleRows = anonymisedSampleRows || data.slice(0, 5);

  return {
    rowCount: data.length,
    columnCount: columns.length,
    columns: summaries,
    sampleRows: sampleRows.slice(0, 5),
  };
}
