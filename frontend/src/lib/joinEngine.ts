/**
 * Multi-Dataset Join Engine
 * Handles auto-detection, fuzzy matching, and efficient joins
 */

export interface JoinSuggestion {
  leftColumn: string;
  rightColumn: string;
  matchType: "exact" | "fuzzy" | "type_compatible";
  confidence: number;
  reason: string;
}

export interface JoinConfig {
  leftColumn: string;
  rightColumn: string;
  joinType: "inner" | "left" | "right" | "full";
}

export interface JoinResult {
  data: Record<string, unknown>[];
  columns: string[];
  leftCount: number;
  rightCount: number;
  matchedCount: number;
  unmatchedLeft: number;
  unmatchedRight: number;
}

export interface ComparisonKPI {
  column: string;
  datasetA: { mean: number; median: number; sum: number; count: number; min: number; max: number };
  datasetB: { mean: number; median: number; sum: number; count: number; min: number; max: number };
  diff: { meanDiff: number; meanPctChange: number; sumDiff: number; sumPctChange: number };
}

// ── Fuzzy string similarity (Dice coefficient) ──
function bigramSet(s: string): Set<string> {
  const lower = s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const set = new Set<string>();
  for (let i = 0; i < lower.length - 1; i++) set.add(lower.slice(i, i + 2));
  return set;
}

function diceSimilarity(a: string, b: string): number {
  const setA = bigramSet(a);
  const setB = bigramSet(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  setA.forEach(bg => { if (setB.has(bg)) intersection++; });
  return (2 * intersection) / (setA.size + setB.size);
}

// ── Normalize column names for comparison ──
function normalize(name: string): string {
  return name.toLowerCase().replace(/[_\-\s]+/g, "").replace(/id$/, "id");
}

// ── Auto-detect join columns ──
export function detectJoinColumns(
  leftColumns: string[],
  rightColumns: string[],
  leftData: Record<string, unknown>[],
  rightData: Record<string, unknown>[]
): JoinSuggestion[] {
  const suggestions: JoinSuggestion[] = [];
  const sample = Math.min(50, leftData.length, rightData.length);

  for (const lc of leftColumns) {
    for (const rc of rightColumns) {
      const normL = normalize(lc);
      const normR = normalize(rc);

      // Exact name match
      if (normL === normR) {
        suggestions.push({ leftColumn: lc, rightColumn: rc, matchType: "exact", confidence: 95, reason: `Column names match: "${lc}" ≈ "${rc}"` });
        continue;
      }

      // Fuzzy name match
      const sim = diceSimilarity(lc, rc);
      if (sim >= 0.6) {
        suggestions.push({ leftColumn: lc, rightColumn: rc, matchType: "fuzzy", confidence: Math.round(sim * 80), reason: `Similar names (${Math.round(sim * 100)}%): "${lc}" ↔ "${rc}"` });
        continue;
      }

      // Value overlap check (for ID-like columns)
      if (normL.includes("id") && normR.includes("id")) {
        const leftVals = new Set(leftData.slice(0, sample).map(r => String(r[lc] ?? "")));
        const rightVals = new Set(rightData.slice(0, sample).map(r => String(r[rc] ?? "")));
        let overlap = 0;
        leftVals.forEach(v => { if (v && rightVals.has(v)) overlap++; });
        const overlapPct = leftVals.size > 0 ? overlap / leftVals.size : 0;
        if (overlapPct > 0.1) {
          suggestions.push({ leftColumn: lc, rightColumn: rc, matchType: "type_compatible", confidence: Math.round(overlapPct * 70), reason: `${Math.round(overlapPct * 100)}% value overlap in ID columns` });
        }
      }
    }
  }

  return suggestions.sort((a, b) => b.confidence - a.confidence).slice(0, 5);
}

// ── Chunked join for large datasets ──
export function executeJoin(
  leftData: Record<string, unknown>[],
  rightData: Record<string, unknown>[],
  config: JoinConfig,
  leftName: string,
  rightName: string
): JoinResult {
  const { leftColumn, rightColumn, joinType } = config;

  // Build right-side index (hash join)
  const rightIndex = new Map<string, Record<string, unknown>[]>();
  for (const row of rightData) {
    const key = String(row[rightColumn] ?? "");
    if (!rightIndex.has(key)) rightIndex.set(key, []);
    rightIndex.get(key)!.push(row);
  }

  const rightCols = Object.keys(rightData[0] || {}).filter(c => c !== rightColumn);
  const prefixedRightCols = rightCols.map(c => `${rightName}_${c}`);

  const result: Record<string, unknown>[] = [];
  const matchedRightKeys = new Set<string>();
  let matchedCount = 0;

  // Process left rows
  for (const leftRow of leftData) {
    const key = String(leftRow[leftColumn] ?? "");
    const rightMatches = rightIndex.get(key);

    if (rightMatches && rightMatches.length > 0) {
      matchedRightKeys.add(key);
      for (const rightRow of rightMatches) {
        const merged: Record<string, unknown> = { ...leftRow };
        for (const col of rightCols) {
          merged[`${rightName}_${col}`] = rightRow[col];
        }
        result.push(merged);
        matchedCount++;
      }
    } else if (joinType === "left" || joinType === "full") {
      const merged: Record<string, unknown> = { ...leftRow };
      for (const col of rightCols) {
        merged[`${rightName}_${col}`] = null;
      }
      result.push(merged);
    }
  }

  // For right/full join, add unmatched right rows
  if (joinType === "right" || joinType === "full") {
    for (const rightRow of rightData) {
      const key = String(rightRow[rightColumn] ?? "");
      if (!matchedRightKeys.has(key)) {
        const merged: Record<string, unknown> = {};
        const leftCols = Object.keys(leftData[0] || {});
        for (const col of leftCols) merged[col] = joinType === "right" ? null : merged[col] ?? null;
        merged[leftColumn] = rightRow[rightColumn];
        for (const col of rightCols) {
          merged[`${rightName}_${col}`] = rightRow[col];
        }
        result.push(merged);
      }
    }
  }

  const allColumns = [...Object.keys(leftData[0] || {}), ...prefixedRightCols];

  return {
    data: result,
    columns: [...new Set(allColumns)],
    leftCount: leftData.length,
    rightCount: rightData.length,
    matchedCount,
    unmatchedLeft: leftData.length - matchedCount,
    unmatchedRight: rightData.length - matchedRightKeys.size,
  };
}

// ── Comparison KPIs ──
function numericStats(values: number[]) {
  if (values.length === 0) return { mean: 0, median: 0, sum: 0, count: 0, min: 0, max: 0 };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { mean, median, sum, count: values.length, min: sorted[0], max: sorted[sorted.length - 1] };
}

export function compareDatasets(
  dataA: Record<string, unknown>[],
  dataB: Record<string, unknown>[],
  columnsA: string[],
  columnsB: string[]
): ComparisonKPI[] {
  const commonNumeric = columnsA.filter(col => {
    const inB = columnsB.includes(col);
    if (!inB) return false;
    const valsA = dataA.slice(0, 100).map(r => Number(r[col])).filter(n => !isNaN(n));
    const valsB = dataB.slice(0, 100).map(r => Number(r[col])).filter(n => !isNaN(n));
    return valsA.length > 10 && valsB.length > 10;
  });

  return commonNumeric.map(col => {
    const valsA = dataA.map(r => Number(r[col])).filter(n => !isNaN(n));
    const valsB = dataB.map(r => Number(r[col])).filter(n => !isNaN(n));
    const statsA = numericStats(valsA);
    const statsB = numericStats(valsB);
    return {
      column: col,
      datasetA: statsA,
      datasetB: statsB,
      diff: {
        meanDiff: statsB.mean - statsA.mean,
        meanPctChange: statsA.mean !== 0 ? ((statsB.mean - statsA.mean) / statsA.mean) * 100 : 0,
        sumDiff: statsB.sum - statsA.sum,
        sumPctChange: statsA.sum !== 0 ? ((statsB.sum - statsA.sum) / statsA.sum) * 100 : 0,
      },
    };
  });
}
