/**
 * Streaming CSV/Excel/JSON parser for large files (300k+ rows).
 * Uses PapaParse streaming to avoid loading entire file into memory.
 * Computes running statistics incrementally during parsing.
 */
import * as Papa from "papaparse";

// ─── Types ──────────────────────────────────────────────────────

export interface StreamingStats {
  count: number;
  sum: number;
  min: number;
  max: number;
  sumSq: number; // for variance
  missing: number;
}

export interface ParseProgress {
  rowsParsed: number;
  phase: "parsing" | "computing" | "saving" | "done";
  percent: number;
}

export interface StreamingParseResult {
  /** Sampled rows for display & AI (max ~2000 rows) */
  sampledData: Record<string, unknown>[];
  /** All column names */
  columns: string[];
  /** Total row count */
  totalRows: number;
  /** Incremental numeric stats per column */
  columnStats: Record<string, StreamingStats>;
  /** Detected column types */
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  /** Category frequency maps (top 50 values per column) */
  categoryFreqs: Record<string, Record<string, number>>;
}

const MAX_SAMPLE_ROWS = 2000;
const RESERVOIR_SIZE = MAX_SAMPLE_ROWS;

// ─── Reservoir Sampling ─────────────────────────────────────────
// Ensures uniform random sample without knowing total count upfront.
class ReservoirSampler {
  private reservoir: Record<string, unknown>[] = [];
  private count = 0;

  add(row: Record<string, unknown>) {
    this.count++;
    if (this.reservoir.length < RESERVOIR_SIZE) {
      this.reservoir.push(row);
    } else {
      const j = Math.floor(Math.random() * this.count);
      if (j < RESERVOIR_SIZE) {
        this.reservoir[j] = row;
      }
    }
  }

  getSample(): Record<string, unknown>[] {
    return this.reservoir;
  }

  getCount(): number {
    return this.count;
  }
}

// ─── Incremental Stats Accumulator ──────────────────────────────
function initStats(): StreamingStats {
  return { count: 0, sum: 0, min: Infinity, max: -Infinity, sumSq: 0, missing: 0 };
}

function updateStats(stats: StreamingStats, value: unknown): void {
  if (value === null || value === undefined || value === "") {
    stats.missing++;
    return;
  }
  const num = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(num)) {
    stats.missing++;
    return;
  }
  stats.count++;
  stats.sum += num;
  stats.sumSq += num * num;
  if (num < stats.min) stats.min = num;
  if (num > stats.max) stats.max = num;
}

function isDateValue(value: unknown): boolean {
  if (typeof value !== "string" || value.length < 6 || value.length > 30) return false;
  return /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(value) ||
         /^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(value);
}

// ─── Main Streaming Parser ──────────────────────────────────────

export function parseCSVStreaming(
  file: File,
  onProgress: (p: ParseProgress) => void
): Promise<StreamingParseResult> {
  return new Promise((resolve, reject) => {
    const sampler = new ReservoirSampler();
    const columnStats: Record<string, StreamingStats> = {};
    const categoryFreqs: Record<string, Record<string, number>> = {};
    const columnTypeSamples: Record<string, { numeric: number; date: number; cat: number }> = {};
    let columns: string[] = [];
    let rowsParsed = 0;
    const TYPE_SAMPLE_LIMIT = 500; // Only sample first 500 rows for type detection

    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      worker: true, // Use Web Worker — won't block UI
      chunk(results) {
        const rows = results.data as Record<string, unknown>[];
        if (columns.length === 0 && rows.length > 0) {
          columns = Object.keys(rows[0]);
          columns.forEach((col) => {
            columnStats[col] = initStats();
            categoryFreqs[col] = {};
            columnTypeSamples[col] = { numeric: 0, date: 0, cat: 0 };
          });
        }

        for (const row of rows) {
          rowsParsed++;
          sampler.add(row);

          for (const col of columns) {
            const val = row[col];

            // Update numeric stats
            updateStats(columnStats[col], val);

            // Type detection (first N rows only)
            if (rowsParsed <= TYPE_SAMPLE_LIMIT) {
              const s = columnTypeSamples[col];
              if (val === null || val === undefined || val === "") {
                // skip
              } else if (typeof val === "number" || (!isNaN(Number(val)) && String(val).trim() !== "")) {
                s.numeric++;
              } else if (isDateValue(val)) {
                s.date++;
              } else {
                s.cat++;
              }
            }

            // Category frequencies (cap at 50 unique values to save memory)
            if (val !== null && val !== undefined && val !== "") {
              const key = String(val);
              const freqs = categoryFreqs[col];
              if (Object.keys(freqs).length < 50 || freqs[key] !== undefined) {
                freqs[key] = (freqs[key] || 0) + 1;
              }
            }
          }
        }

        // Report progress (estimate based on file bytes if available)
        const estimatedTotal = Math.max(rowsParsed, file.size / 100); // rough estimate
        onProgress({
          rowsParsed,
          phase: "parsing",
          percent: Math.min(95, Math.round((rowsParsed / estimatedTotal) * 100)),
        });
      },
      complete() {
        // Determine column types
        const columnTypes: Record<string, "numeric" | "categorical" | "date"> = {};
        for (const col of columns) {
          const s = columnTypeSamples[col];
          const total = s.numeric + s.date + s.cat;
          if (total === 0) {
            columnTypes[col] = "categorical";
          } else if (s.numeric / total > 0.7) {
            columnTypes[col] = "numeric";
          } else if (s.date / total > 0.7) {
            columnTypes[col] = "date";
          } else {
            columnTypes[col] = "categorical";
          }
        }

        onProgress({ rowsParsed, phase: "done", percent: 100 });

        resolve({
          sampledData: sampler.getSample(),
          columns,
          totalRows: rowsParsed,
          columnStats,
          columnTypes,
          categoryFreqs,
        });
      },
      error(err) {
        reject(new Error(`CSV parsing failed: ${err.message}`));
      },
    });
  });
}

/**
 * Convert StreamingStats to derived metrics (mean, variance, stdDev)
 */
export function deriveMeanVariance(s: StreamingStats) {
  if (s.count === 0) return { mean: 0, variance: 0, stdDev: 0 };
  const mean = s.sum / s.count;
  const variance = s.sumSq / s.count - mean * mean;
  return { mean, variance: Math.max(0, variance), stdDev: Math.sqrt(Math.max(0, variance)) };
}

/**
 * Build a compact AI-ready summary from streaming results.
 * This replaces sending full dataset to AI.
 */
export function buildAISummary(result: StreamingParseResult): Record<string, unknown> {
  const numericSummary: Record<string, unknown> = {};
  const categoricalSummary: Record<string, unknown> = {};

  for (const col of result.columns) {
    const type = result.columnTypes[col];
    const stats = result.columnStats[col];

    if (type === "numeric") {
      const derived = deriveMeanVariance(stats);
      numericSummary[col] = {
        count: stats.count,
        missing: stats.missing,
        mean: Math.round(derived.mean * 100) / 100,
        stdDev: Math.round(derived.stdDev * 100) / 100,
        min: stats.min === Infinity ? null : stats.min,
        max: stats.max === -Infinity ? null : stats.max,
        range: stats.max - stats.min,
      };
    } else {
      const freqs = result.categoryFreqs[col];
      const sorted = Object.entries(freqs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
      categoricalSummary[col] = {
        uniqueValues: Object.keys(freqs).length,
        missing: stats.missing,
        topValues: sorted.map(([v, c]) => ({ value: v, count: c })),
      };
    }
  }

  return {
    totalRows: result.totalRows,
    totalColumns: result.columns.length,
    columns: result.columns,
    numericColumns: numericSummary,
    categoricalColumns: categoricalSummary,
    sampleRows: result.sampledData.slice(0, 5), // Only 5 example rows for AI
  };
}
