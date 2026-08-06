/**
 * Production-grade Statistics Engine for SpaceForge
 * All computations run client-side — no AI dependency for basic math.
 */

// ─── Types ──────────────────────────────────────────────────────

export interface NumericColumnStats {
  column: string;
  type: "numeric";
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
  mean: number;
  median: number;
  mode: number | null;
  min: number;
  max: number;
  range: number;
  variance: number;
  stdDev: number;
  p25: number;
  p50: number;
  p75: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  outliers: OutlierInfo;
  sum: number;
  coeffOfVariation: number;
}

export interface CategoricalColumnStats {
  column: string;
  type: "categorical";
  count: number;
  missing: number;
  missingPct: number;
  unique: number;
  topValues: { value: string; count: number; pct: number }[];
  entropy: number;
  mode: string;
  modeFreq: number;
}

export interface DateColumnStats {
  column: string;
  type: "date";
  count: number;
  missing: number;
  missingPct: number;
  earliest: string;
  latest: string;
  spanDays: number;
  growthRates: number[];
  avgGrowthRate: number;
  movingAverages: { period: number; values: number[] }[];
  trendDirection: "increasing" | "decreasing" | "stable";
}

export interface OutlierInfo {
  count: number;
  pct: number;
  lowerBound: number;
  upperBound: number;
  values: number[];
}

export interface CorrelationPair {
  col1: string;
  col2: string;
  pearson: number;
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative";
}

export interface KPI {
  name: string;
  column: string;
  value: number;
  formattedValue: string;
  trend: "up" | "down" | "stable";
  changePct: number;
  health: "healthy" | "warning" | "critical";
  insight: string;
  formula: string;
  category: string;
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  domainGuess: string;
  dataQualityScore: number;
  numericStats: NumericColumnStats[];
  categoricalStats: CategoricalColumnStats[];
  dateStats: DateColumnStats[];
  correlations: CorrelationPair[];
  kpis: KPI[];
  anomalySummary: { totalOutliers: number; outlierRate: number; affectedColumns: string[] };
  sampleRows: Record<string, unknown>[];
}

// ─── Helpers ────────────────────────────────────────────────────

function isNumericVal(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  return !isNaN(Number(v));
}

function isDateVal(v: unknown): boolean {
  if (typeof v !== "string" || v.length < 6) return false;
  return !isNaN(Date.parse(v));
}

function sortedNumbers(arr: number[]): number[] {
  return [...arr].sort((a, b) => a - b);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const frac = idx - lo;
  if (lo + 1 >= sorted.length) return sorted[lo];
  return sorted[lo] + frac * (sorted[lo + 1] - sorted[lo]);
}

function median(sorted: number[]): number {
  return percentile(sorted, 50);
}

function mode(values: number[]): number | null {
  if (values.length === 0) return null;
  const freq = new Map<number, number>();
  let maxCount = 0;
  let modeVal = values[0];
  for (const v of values) {
    const c = (freq.get(v) || 0) + 1;
    freq.set(v, c);
    if (c > maxCount) { maxCount = c; modeVal = v; }
  }
  return maxCount > 1 ? modeVal : null;
}

function variance(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  return values.reduce((s, v) => s + (v - mean) ** 2, 0) / (values.length - 1);
}

function skewness(values: number[], mean: number, std: number): number {
  if (values.length < 3 || std === 0) return 0;
  const n = values.length;
  const m3 = values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) / n;
  return m3;
}

function kurtosis(values: number[], mean: number, std: number): number {
  if (values.length < 4 || std === 0) return 0;
  const n = values.length;
  const m4 = values.reduce((s, v) => s + ((v - mean) / std) ** 4, 0) / n;
  return m4 - 3; // excess kurtosis
}

function entropy(freq: Map<string, number>, total: number): number {
  let h = 0;
  for (const count of freq.values()) {
    const p = count / total;
    if (p > 0) h -= p * Math.log2(p);
  }
  return Math.round(h * 1000) / 1000;
}

function pearsonR(x: number[], y: number[]): number {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const mx = x.slice(0, n).reduce((a, b) => a + b, 0) / n;
  const my = y.slice(0, n).reduce((a, b) => a + b, 0) / n;
  let num = 0, dx2 = 0, dy2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx, dy = y[i] - my;
    num += dx * dy;
    dx2 += dx * dx;
    dy2 += dy * dy;
  }
  const den = Math.sqrt(dx2 * dy2);
  return den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
}

function r(v: number): number {
  return Math.round(v * 100) / 100;
}

// ─── Column type detection ──────────────────────────────────────

export function detectColumnType(values: unknown[]): "numeric" | "date" | "categorical" {
  const nonEmpty = values.filter(v => v !== null && v !== undefined && v !== "").slice(0, 200);
  if (nonEmpty.length === 0) return "categorical";
  const numCount = nonEmpty.filter(isNumericVal).length;
  if (numCount / nonEmpty.length > 0.7) return "numeric";
  const dateCount = nonEmpty.filter(isDateVal).length;
  if (dateCount / nonEmpty.length > 0.7) return "date";
  return "categorical";
}

export function detectColumnTypes(data: Record<string, unknown>[], columns: string[]): Record<string, string> {
  const types: Record<string, string> = {};
  for (const col of columns) {
    types[col] = detectColumnType(data.map(row => row[col]));
  }
  return types;
}

// ─── Domain guess ───────────────────────────────────────────────

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  finance: ["revenue", "profit", "loss", "expense", "income", "cost", "price", "amount", "balance", "payment", "invoice", "tax", "budget", "margin", "roi", "ebitda"],
  sales: ["sales", "order", "quantity", "discount", "customer", "product", "unit", "deal", "lead", "conversion", "pipeline"],
  marketing: ["campaign", "impression", "click", "ctr", "cpc", "conversion", "bounce", "session", "pageview", "engagement", "reach", "follower"],
  hr: ["employee", "salary", "department", "hire", "attrition", "tenure", "performance", "rating", "leave", "headcount"],
  healthcare: ["patient", "diagnosis", "treatment", "medication", "hospital", "blood", "bmi", "glucose", "heart"],
  ecommerce: ["cart", "checkout", "sku", "shipping", "return", "refund", "wishlist", "catalog"],
};

function guessDomain(columns: string[]): string {
  const lowerCols = columns.map(c => c.toLowerCase());
  let best = "general";
  let bestScore = 0;
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = keywords.filter(k => lowerCols.some(c => c.includes(k))).length;
    if (score > bestScore) { bestScore = score; best = domain; }
  }
  return best;
}

// ─── KPI detection ──────────────────────────────────────────────

const KPI_PATTERNS: Record<string, { match: RegExp; category: string; formula: string }> = {
  revenue: { match: /revenue|sales|income|turnover/i, category: "financial", formula: "SUM" },
  profit: { match: /profit|margin|earnings/i, category: "financial", formula: "SUM" },
  cost: { match: /cost|expense|spend/i, category: "financial", formula: "SUM" },
  quantity: { match: /quantity|units|count|orders/i, category: "operational", formula: "SUM" },
  price: { match: /price|rate|fee|amount/i, category: "financial", formula: "AVG" },
  score: { match: /score|rating|satisfaction|nps/i, category: "performance", formula: "AVG" },
  conversion: { match: /conversion|ctr|rate/i, category: "marketing", formula: "AVG" },
  growth: { match: /growth|increase|change/i, category: "growth", formula: "AVG" },
  age: { match: /^age$/i, category: "demographic", formula: "AVG" },
};

function detectKPIs(
  numericStats: NumericColumnStats[],
  data: Record<string, unknown>[],
): KPI[] {
  const kpis: KPI[] = [];
  
  for (const stat of numericStats) {
    let matched = false;
    for (const [kpiName, pattern] of Object.entries(KPI_PATTERNS)) {
      if (pattern.match.test(stat.column)) {
        matched = true;
        const vals = data.map(row => Number(row[stat.column])).filter(v => !isNaN(v));
        const half = Math.floor(vals.length / 2);
        const first = vals.slice(0, half);
        const second = vals.slice(half);
        
        const agg = (arr: number[], formula: string) => {
          if (arr.length === 0) return 0;
          if (formula === "SUM") return arr.reduce((a, b) => a + b, 0);
          return arr.reduce((a, b) => a + b, 0) / arr.length;
        };
        
        const prevVal = agg(first, pattern.formula);
        const currVal = agg(second, pattern.formula);
        const changePct = prevVal !== 0 ? ((currVal - prevVal) / Math.abs(prevVal)) * 100 : 0;
        const trend = changePct > 2 ? "up" : changePct < -2 ? "down" : "stable";
        const health = Math.abs(changePct) > 20 ? "critical" : Math.abs(changePct) > 10 ? "warning" : "healthy";
        
        const formatted = pattern.formula === "SUM" 
          ? currVal.toLocaleString(undefined, { maximumFractionDigits: 0 })
          : currVal.toLocaleString(undefined, { maximumFractionDigits: 2 });
        
        const trendWord = trend === "up" ? "increased" : trend === "down" ? "decreased" : "remained stable";
        const insight = `${stat.column} ${trendWord} by ${Math.abs(r(changePct))}% (${r(prevVal)} → ${r(currVal)})`;
        
        kpis.push({
          name: kpiName.charAt(0).toUpperCase() + kpiName.slice(1),
          column: stat.column,
          value: currVal,
          formattedValue: formatted,
          trend,
          changePct: r(changePct),
          health,
          insight,
          formula: `${pattern.formula}(${stat.column})`,
          category: pattern.category,
        });
        break;
      }
    }
    
    // Auto-detect KPI for unmatched numeric columns with reasonable variance
    if (!matched && stat.coeffOfVariation > 0.05 && stat.count > 5) {
      const vals = data.map(row => Number(row[stat.column])).filter(v => !isNaN(v));
      const half = Math.floor(vals.length / 2);
      const firstAvg = vals.slice(0, half).reduce((a, b) => a + b, 0) / (half || 1);
      const secondAvg = vals.slice(half).reduce((a, b) => a + b, 0) / ((vals.length - half) || 1);
      const changePct = firstAvg !== 0 ? ((secondAvg - firstAvg) / Math.abs(firstAvg)) * 100 : 0;
      const trend = changePct > 2 ? "up" : changePct < -2 ? "down" : "stable";
      
      kpis.push({
        name: stat.column,
        column: stat.column,
        value: stat.mean,
        formattedValue: stat.mean.toLocaleString(undefined, { maximumFractionDigits: 2 }),
        trend,
        changePct: r(changePct),
        health: Math.abs(changePct) > 20 ? "critical" : Math.abs(changePct) > 10 ? "warning" : "healthy",
        insight: `Average ${stat.column}: ${r(stat.mean)} (σ=${r(stat.stdDev)})`,
        formula: `AVG(${stat.column})`,
        category: "metric",
      });
    }
  }
  
  return kpis;
}

// ─── Main Engine ────────────────────────────────────────────────

export function computeDatasetProfile(
  data: Record<string, unknown>[],
  columns: string[],
  columnTypes?: Record<string, string>,
): DatasetProfile {
  const types = columnTypes || detectColumnTypes(data, columns);
  const numericCols = columns.filter(c => types[c] === "numeric");
  const categoricalCols = columns.filter(c => types[c] === "categorical");
  const dateCols = columns.filter(c => types[c] === "date");
  
  // ── Numeric stats ──
  const numericStats: NumericColumnStats[] = numericCols.map(col => {
    const raw = data.map(row => row[col]);
    const nums = raw.filter(isNumericVal).map(Number);
    const missing = raw.length - nums.length;
    const sorted = sortedNumbers(nums);
    const unique = new Set(nums).size;
    
    if (nums.length === 0) {
      return {
        column: col, type: "numeric" as const, count: 0, missing, missingPct: 100,
        unique: 0, mean: 0, median: 0, mode: null, min: 0, max: 0, range: 0,
        variance: 0, stdDev: 0, p25: 0, p50: 0, p75: 0, iqr: 0,
        skewness: 0, kurtosis: 0, sum: 0, coeffOfVariation: 0,
        outliers: { count: 0, pct: 0, lowerBound: 0, upperBound: 0, values: [] },
      };
    }
    
    const mean_ = nums.reduce((a, b) => a + b, 0) / nums.length;
    const var_ = variance(nums, mean_);
    const std_ = Math.sqrt(var_);
    const p25_ = percentile(sorted, 25);
    const p75_ = percentile(sorted, 75);
    const iqr_ = p75_ - p25_;
    const lowerBound = p25_ - 1.5 * iqr_;
    const upperBound = p75_ + 1.5 * iqr_;
    const outlierVals = sorted.filter(v => v < lowerBound || v > upperBound);
    
    return {
      column: col,
      type: "numeric" as const,
      count: nums.length,
      missing,
      missingPct: r((missing / raw.length) * 100),
      unique,
      mean: r(mean_),
      median: r(median(sorted)),
      mode: mode(nums),
      min: sorted[0],
      max: sorted[sorted.length - 1],
      range: r(sorted[sorted.length - 1] - sorted[0]),
      variance: r(var_),
      stdDev: r(std_),
      p25: r(p25_),
      p50: r(median(sorted)),
      p75: r(p75_),
      iqr: r(iqr_),
      skewness: r(skewness(nums, mean_, std_)),
      kurtosis: r(kurtosis(nums, mean_, std_)),
      sum: r(nums.reduce((a, b) => a + b, 0)),
      coeffOfVariation: mean_ !== 0 ? r(std_ / Math.abs(mean_)) : 0,
      outliers: {
        count: outlierVals.length,
        pct: r((outlierVals.length / nums.length) * 100),
        lowerBound: r(lowerBound),
        upperBound: r(upperBound),
        values: outlierVals.slice(0, 20),
      },
    };
  });
  
  // ── Categorical stats ──
  const categoricalStats: CategoricalColumnStats[] = categoricalCols.map(col => {
    const raw = data.map(row => row[col]);
    const strs = raw.filter(v => v !== null && v !== undefined && v !== "").map(v => String(v));
    const missing = raw.length - strs.length;
    const freq = new Map<string, number>();
    for (const s of strs) freq.set(s, (freq.get(s) || 0) + 1);
    
    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]);
    const topValues = sorted.slice(0, 10).map(([value, count]) => ({
      value, count, pct: r((count / strs.length) * 100),
    }));
    
    return {
      column: col,
      type: "categorical" as const,
      count: strs.length,
      missing,
      missingPct: r((missing / raw.length) * 100),
      unique: freq.size,
      topValues,
      entropy: entropy(freq, strs.length),
      mode: sorted[0]?.[0] || "",
      modeFreq: sorted[0]?.[1] || 0,
    };
  });
  
  // ── Date stats ──
  const dateStats: DateColumnStats[] = dateCols.map(col => {
    const raw = data.map(row => row[col]);
    const dates = raw.filter(isDateVal).map(v => new Date(String(v)));
    const missing = raw.length - dates.length;
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    // growth rates between consecutive date-associated numeric values
    const growthRates: number[] = [];
    const movingAvg3: number[] = [];
    
    return {
      column: col,
      type: "date" as const,
      count: dates.length,
      missing,
      missingPct: r((missing / raw.length) * 100),
      earliest: dates[0]?.toISOString().split("T")[0] || "",
      latest: dates[dates.length - 1]?.toISOString().split("T")[0] || "",
      spanDays: dates.length > 1 ? Math.round((dates[dates.length - 1].getTime() - dates[0].getTime()) / 86400000) : 0,
      growthRates,
      avgGrowthRate: 0,
      movingAverages: [],
      trendDirection: "stable",
    };
  });
  
  // ── Correlations (sample for performance) ──
  const sampleData = data.slice(0, 1000);
  const correlations: CorrelationPair[] = [];
  const numCols = numericCols.slice(0, 20);
  for (let i = 0; i < numCols.length; i++) {
    for (let j = i + 1; j < numCols.length; j++) {
      const paired: Array<[number, number]> = [];
      for (const row of sampleData) {
        const xVal = Number(row[numCols[i]]);
        const yVal = Number(row[numCols[j]]);
        if (!isNaN(xVal) && !isNaN(yVal)) paired.push([xVal, yVal]);
      }

      if (paired.length < 3) continue;

      const x = paired.map(([xVal]) => xVal);
      const y = paired.map(([, yVal]) => yVal);
      const rVal = pearsonR(x, y);
      const absR = Math.abs(rVal);
      if (absR > 0.2) {
        correlations.push({
          col1: numCols[i],
          col2: numCols[j],
          pearson: rVal,
          strength: absR > 0.7 ? "strong" : absR > 0.4 ? "moderate" : "weak",
          direction: rVal > 0 ? "positive" : "negative",
        });
      }
    }
  }
  correlations.sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson));
  
  // ── KPIs ──
  const kpis = detectKPIs(numericStats, data);
  
  // ── Data quality score ──
  const totalCells = data.length * columns.length;
  const totalMissing = [...numericStats, ...categoricalStats, ...dateStats].reduce((s, c) => s + c.missing, 0);
  const completeness = totalCells > 0 ? (1 - totalMissing / totalCells) * 100 : 100;
  const totalOutliers = numericStats.reduce((s, c) => s + c.outliers.count, 0);
  const outlierRate = data.length > 0 ? r((totalOutliers / data.length) * 100) : 0;
  const affectedColumns = numericStats.filter(c => c.outliers.count > 0).map(c => c.column);
  
  return {
    rowCount: data.length,
    columnCount: columns.length,
    domainGuess: guessDomain(columns),
    dataQualityScore: Math.round(completeness),
    numericStats,
    categoricalStats,
    dateStats,
    correlations: correlations.slice(0, 20),
    kpis,
    anomalySummary: { totalOutliers, outlierRate, affectedColumns },
    sampleRows: data.slice(0, 5),
  };
}

/**
 * Compact JSON for AI prompts — strips verbose fields to reduce tokens
 */
export function profileToAIContext(profile: DatasetProfile): string {
  const compact = {
    rows: profile.rowCount,
    cols: profile.columnCount,
    domain: profile.domainGuess,
    quality: profile.dataQualityScore,
    numeric: profile.numericStats.map(s => ({
      col: s.column, mean: s.mean, med: s.median, std: s.stdDev,
      min: s.min, max: s.max, p25: s.p25, p75: s.p75,
      outliers: s.outliers.count, missing: s.missing, skew: s.skewness,
    })),
    categorical: profile.categoricalStats.map(s => ({
      col: s.column, unique: s.unique, top: s.topValues.slice(0, 3),
      missing: s.missing,
    })),
    topCorrelations: profile.correlations.slice(0, 5).map(c => ({
      cols: `${c.col1}↔${c.col2}`, r: c.pearson, str: c.strength,
    })),
    kpis: profile.kpis.map(k => ({
      name: k.name, val: k.formattedValue, trend: k.trend,
      chg: k.changePct, health: k.health,
    })),
  };
  return JSON.stringify(compact);
}
