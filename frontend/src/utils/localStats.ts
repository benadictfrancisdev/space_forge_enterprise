/**
 * Local statistics computation — thin wrapper over statisticsEngine.ts
 * Kept for backward compatibility with existing imports.
 */

import { computeDatasetProfile } from "@/lib/statisticsEngine";

export type ColumnStats = {
  name: string;
  type: "numeric" | "categorical" | "date" | "text";
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
};

export type NumericStats = ColumnStats & {
  type: "numeric";
  mean: number;
  median: number;
  std: number;
  min: number;
  max: number;
  q1: number;
  q3: number;
};

export type CategoricalStats = ColumnStats & {
  type: "categorical";
  topValues: { value: string; count: number; pct: number }[];
};

/**
 * Legacy-compatible wrapper — returns shape expected by existing callers.
 */
export function computeLocalStats(
  data: Record<string, unknown>[],
  columns: string[],
  columnTypes: Record<string, string>,
): {
  totalRows: number;
  totalColumns: number;
  numericColumns: string[];
  categoricalColumns: string[];
  columnStats: (NumericStats | CategoricalStats | ColumnStats)[];
  topCorrelations: { col1: string; col2: string; r: number }[];
  dataQualityScore: number;
} {
  const profile = computeDatasetProfile(data, columns, columnTypes);

  const columnStats: (NumericStats | CategoricalStats | ColumnStats)[] = [
    ...profile.numericStats.map(s => ({
      name: s.column,
      type: "numeric" as const,
      count: s.count + s.missing,
      missing: s.missing,
      missingPct: s.missingPct,
      unique: s.unique,
      mean: s.mean,
      median: s.median,
      std: s.stdDev,
      min: s.min,
      max: s.max,
      q1: s.p25,
      q3: s.p75,
    })),
    ...profile.categoricalStats.map(s => ({
      name: s.column,
      type: "categorical" as const,
      count: s.count + s.missing,
      missing: s.missing,
      missingPct: s.missingPct,
      unique: s.unique,
      topValues: s.topValues,
    })),
  ];

  return {
    totalRows: profile.rowCount,
    totalColumns: profile.columnCount,
    numericColumns: profile.numericStats.map(s => s.column),
    categoricalColumns: profile.categoricalStats.map(s => s.column),
    columnStats: columnStats.slice(0, 30),
    topCorrelations: profile.correlations.slice(0, 10).map(c => ({
      col1: c.col1,
      col2: c.col2,
      r: c.pearson,
    })),
    dataQualityScore: profile.dataQualityScore,
  };
}
