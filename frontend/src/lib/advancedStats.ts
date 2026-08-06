/**
 * Advanced statistical helpers — significance testing, effect size, seasonality,
 * driver attribution. Used by the Stats-First reasoning pipeline so the AI sees
 * structured evidence (not raw rows).
 *
 * Pure functions, zero dependencies, browser-safe.
 */

// ─── Welch's t-test (returns p-value approximation) ─────────────

export interface TTestResult {
  tStatistic: number;
  degreesOfFreedom: number;
  pValue: number;
  significant: boolean;
  effectSize: number; // Cohen's d
  effectMagnitude: "negligible" | "small" | "medium" | "large";
  meanA: number;
  meanB: number;
  diffPct: number;
}

function meanOf(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function varOf(arr: number[], m: number): number {
  if (arr.length < 2) return 0;
  return arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length - 1);
}

/**
 * Approximate two-tailed p-value from t-statistic via normal approximation.
 * Good enough for decision-making (df > 20). For exact values use a real t-table.
 */
function approxPValue(t: number, df: number): number {
  const absT = Math.abs(t);
  // Normal approximation for large df
  if (df > 30) {
    // 1 - CDF(|t|) * 2 — using error function approximation
    const x = absT / Math.SQRT2;
    const sign = x >= 0 ? 1 : -1;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t2 = 1 / (1 + p * Math.abs(x));
    const y = 1 - (((((a5 * t2 + a4) * t2) + a3) * t2 + a2) * t2 + a1) * t2 * Math.exp(-x * x);
    const cdf = 0.5 * (1 + sign * y);
    return Math.max(0, Math.min(1, 2 * (1 - cdf)));
  }
  // Crude t-distribution adjustment for small df
  const adj = 1 + (absT * absT) / df;
  return Math.max(0.001, Math.min(0.999, 2 * Math.pow(adj, -df / 2) * 0.5));
}

export function welchTTest(a: number[], b: number[]): TTestResult {
  const cleanA = a.filter((v) => Number.isFinite(v));
  const cleanB = b.filter((v) => Number.isFinite(v));
  if (cleanA.length < 2 || cleanB.length < 2) {
    return {
      tStatistic: 0, degreesOfFreedom: 0, pValue: 1, significant: false,
      effectSize: 0, effectMagnitude: "negligible", meanA: meanOf(cleanA),
      meanB: meanOf(cleanB), diffPct: 0,
    };
  }
  const mA = meanOf(cleanA), mB = meanOf(cleanB);
  const vA = varOf(cleanA, mA), vB = varOf(cleanB, mB);
  const nA = cleanA.length, nB = cleanB.length;
  const se = Math.sqrt(vA / nA + vB / nB);
  const t = se === 0 ? 0 : (mA - mB) / se;
  const df = se === 0 ? 0 : Math.pow(vA / nA + vB / nB, 2) /
    (Math.pow(vA / nA, 2) / (nA - 1) + Math.pow(vB / nB, 2) / (nB - 1));
  const p = approxPValue(t, df);

  const pooledStd = Math.sqrt(((nA - 1) * vA + (nB - 1) * vB) / (nA + nB - 2));
  const cohensD = pooledStd === 0 ? 0 : Math.abs(mA - mB) / pooledStd;
  const magnitude: TTestResult["effectMagnitude"] =
    cohensD < 0.2 ? "negligible" : cohensD < 0.5 ? "small" : cohensD < 0.8 ? "medium" : "large";
  const diffPct = mB === 0 ? 0 : ((mA - mB) / Math.abs(mB)) * 100;

  return {
    tStatistic: Math.round(t * 1000) / 1000,
    degreesOfFreedom: Math.round(df * 10) / 10,
    pValue: Math.round(p * 10000) / 10000,
    significant: p < 0.05,
    effectSize: Math.round(cohensD * 1000) / 1000,
    effectMagnitude: magnitude,
    meanA: Math.round(mA * 100) / 100,
    meanB: Math.round(mB * 100) / 100,
    diffPct: Math.round(diffPct * 10) / 10,
  };
}

// ─── Period-over-period delta with significance flag ────────────

export interface PoPDelta {
  metric: string;
  current: number;
  previous: number;
  deltaAbs: number;
  deltaPct: number;
  direction: "up" | "down" | "flat";
  significant: boolean;
  pValue: number;
  effectMagnitude: TTestResult["effectMagnitude"];
}

export function periodOverPeriod(
  values: number[],
  metric: string,
): PoPDelta {
  const n = values.length;
  if (n < 4) {
    return {
      metric, current: 0, previous: 0, deltaAbs: 0, deltaPct: 0,
      direction: "flat", significant: false, pValue: 1, effectMagnitude: "negligible",
    };
  }
  const half = Math.floor(n / 2);
  const prev = values.slice(0, half);
  const curr = values.slice(half);
  const test = welchTTest(curr, prev);
  const direction: PoPDelta["direction"] =
    Math.abs(test.diffPct) < 1 ? "flat" : test.diffPct > 0 ? "up" : "down";
  return {
    metric,
    current: test.meanA,
    previous: test.meanB,
    deltaAbs: Math.round((test.meanA - test.meanB) * 100) / 100,
    deltaPct: test.diffPct,
    direction,
    significant: test.significant,
    pValue: test.pValue,
    effectMagnitude: test.effectMagnitude,
  };
}

// ─── Seasonality detection (autocorrelation at common lags) ─────

export interface SeasonalityResult {
  detected: boolean;
  bestLag: number;
  strength: number; // 0-1
  candidates: { lag: number; r: number; label: string }[];
}

function autocorr(values: number[], lag: number): number {
  if (values.length <= lag + 2) return 0;
  const n = values.length - lag;
  const a = values.slice(0, n);
  const b = values.slice(lag, lag + n);
  const mA = meanOf(a), mB = meanOf(b);
  let num = 0, dA = 0, dB = 0;
  for (let i = 0; i < n; i++) {
    num += (a[i] - mA) * (b[i] - mB);
    dA += (a[i] - mA) ** 2;
    dB += (b[i] - mB) ** 2;
  }
  const den = Math.sqrt(dA * dB);
  return den === 0 ? 0 : num / den;
}

export function detectSeasonality(values: number[]): SeasonalityResult {
  const lags = [
    { lag: 7, label: "weekly" },
    { lag: 14, label: "bi-weekly" },
    { lag: 30, label: "monthly" },
    { lag: 90, label: "quarterly" },
    { lag: 365, label: "yearly" },
  ].filter((l) => values.length > l.lag * 2);

  const candidates = lags.map((l) => ({
    lag: l.lag,
    label: l.label,
    r: Math.round(autocorr(values, l.lag) * 1000) / 1000,
  })).sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  const best = candidates[0];
  return {
    detected: !!best && Math.abs(best.r) > 0.3,
    bestLag: best?.lag ?? 0,
    strength: best ? Math.abs(best.r) : 0,
    candidates,
  };
}

// ─── Driver attribution (rank features by correlation w/ target) ─

export interface DriverScore {
  driver: string;
  correlation: number;
  absCorrelation: number;
  direction: "positive" | "negative";
  strength: "strong" | "moderate" | "weak" | "none";
  shareOfVariance: number; // r^2
}

function pearson(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = meanOf(x.slice(0, n)), my = meanOf(y.slice(0, n));
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - mx) * (y[i] - my);
    dx += (x[i] - mx) ** 2;
    dy += (y[i] - my) ** 2;
  }
  const den = Math.sqrt(dx * dy);
  return den === 0 ? 0 : num / den;
}

export function attributeDrivers(
  data: Record<string, unknown>[],
  target: string,
  candidateColumns: string[],
): DriverScore[] {
  const targetVals = data.map((r) => Number(r[target])).filter(Number.isFinite);
  if (targetVals.length < 5) return [];

  const scores: DriverScore[] = [];
  for (const col of candidateColumns) {
    if (col === target) continue;
    const vals = data.map((r) => Number(r[col]));
    const pairsX: number[] = [], pairsY: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const x = Number(data[i][col]);
      const y = Number(data[i][target]);
      if (Number.isFinite(x) && Number.isFinite(y)) {
        pairsX.push(x);
        pairsY.push(y);
      }
    }
    if (pairsX.length < 5) continue;
    const r = pearson(pairsX, pairsY);
    const abs = Math.abs(r);
    scores.push({
      driver: col,
      correlation: Math.round(r * 1000) / 1000,
      absCorrelation: Math.round(abs * 1000) / 1000,
      direction: r >= 0 ? "positive" : "negative",
      strength: abs > 0.7 ? "strong" : abs > 0.4 ? "moderate" : abs > 0.2 ? "weak" : "none",
      shareOfVariance: Math.round(r * r * 1000) / 1000,
    });
  }
  return scores.sort((a, b) => b.absCorrelation - a.absCorrelation);
}

// ─── Z-score & IQR outlier flags ─────────────────────────────────

export interface OutlierFlag {
  index: number;
  value: number;
  zScore: number;
  iqrFlag: boolean;
  severity: "mild" | "extreme";
}

export function flagOutliers(values: number[]): OutlierFlag[] {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 4) return [];
  const m = meanOf(clean);
  const std = Math.sqrt(varOf(clean, m));
  const sorted = [...clean].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  const lo = q1 - 1.5 * iqr;
  const hi = q3 + 1.5 * iqr;
  const flags: OutlierFlag[] = [];
  values.forEach((v, i) => {
    if (!Number.isFinite(v)) return;
    const z = std === 0 ? 0 : (v - m) / std;
    const iqrFlag = v < lo || v > hi;
    if (Math.abs(z) > 2 || iqrFlag) {
      flags.push({
        index: i, value: v,
        zScore: Math.round(z * 100) / 100,
        iqrFlag,
        severity: Math.abs(z) > 3 ? "extreme" : "mild",
      });
    }
  });
  return flags;
}

// ─── Build the structured "evidence packet" for AI ──────────────

export interface EvidencePacket {
  rowCount: number;
  topDeltas: PoPDelta[];
  topDrivers: { target: string; drivers: DriverScore[] }[];
  seasonality: { column: string; result: SeasonalityResult }[];
  outlierColumns: { column: string; count: number; pct: number }[];
}

export function buildEvidencePacket(
  data: Record<string, unknown>[],
  numericColumns: string[],
): EvidencePacket {
  const deltas = numericColumns.slice(0, 12).map((col) => {
    const vals = data.map((r) => Number(r[col])).filter(Number.isFinite);
    return periodOverPeriod(vals, col);
  }).sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct));

  // Pick top 2 numeric columns as candidate targets
  const targets = numericColumns.slice(0, 2);
  const drivers = targets.map((t) => ({
    target: t,
    drivers: attributeDrivers(data, t, numericColumns).slice(0, 5),
  }));

  const seasonality = numericColumns.slice(0, 4).map((col) => ({
    column: col,
    result: detectSeasonality(data.map((r) => Number(r[col])).filter(Number.isFinite)),
  })).filter((s) => s.result.detected);

  const outlierColumns = numericColumns.map((col) => {
    const vals = data.map((r) => Number(r[col]));
    const flags = flagOutliers(vals);
    return { column: col, count: flags.length, pct: Math.round((flags.length / vals.length) * 1000) / 10 };
  }).filter((o) => o.count > 0).sort((a, b) => b.count - a.count).slice(0, 8);

  return {
    rowCount: data.length,
    topDeltas: deltas.slice(0, 8),
    topDrivers: drivers,
    seasonality,
    outlierColumns,
  };
}
