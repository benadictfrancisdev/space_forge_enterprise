/**
 * Dataset-aware Decision Generator.
 * Converts any uploaded dataset into Problem → Impact → Action cards.
 * Pure client-side — no AI calls. Adapts to financial / sales / sports / generic data.
 */

import { computeDatasetProfile, type DatasetProfile, type NumericColumnStats, type CategoricalColumnStats } from "@/lib/statisticsEngine";
import { profileDataset, classifyDomain as classifyByProfiles, type NormalizedDataset } from "@/lib/schemaNormalizer";

export type DecisionSeverity = "critical" | "high" | "medium" | "low";
export type DecisionCategory =
  | "cashflow" | "revenue" | "churn" | "expense" | "score"
  | "performance" | "trend" | "anomaly" | "concentration" | "quality" | "correlation";

export interface GeneratedDecision {
  id: string;
  category: DecisionCategory;
  severity: DecisionSeverity;
  problem: string;
  impact: string;
  impactValue: string;
  action: string;
  actionLabel: string;
  source: string;
  evidence: string[];
}

export interface DecisionFeedResult {
  domain: string;
  decisions: GeneratedDecision[];
  forgeScore: number;
  scoreLabel: string;
  scoreSummary: string;
}

// ─── Domain detection (extends statisticsEngine.guessDomain) ────────

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  finance: ["revenue", "profit", "loss", "expense", "income", "cost", "price", "amount", "balance", "payment", "invoice", "tax", "budget", "margin", "ebitda", "cash", "receivable", "payable"],
  sales: ["sales", "order", "quantity", "discount", "deal", "lead", "conversion", "pipeline", "sku", "product"],
  ecommerce: ["cart", "checkout", "shipping", "return", "refund", "wishlist", "catalog"],
  marketing: ["campaign", "impression", "click", "ctr", "cpc", "bounce", "session", "pageview", "engagement", "reach"],
  hr: ["employee", "salary", "department", "hire", "attrition", "tenure", "headcount"],
  sports: ["runs", "wickets", "overs", "strike", "batsman", "bowler", "team", "match", "score", "innings", "goals", "assists", "player", "win", "loss"],
  healthcare: ["patient", "diagnosis", "treatment", "medication", "hospital", "bmi", "glucose", "heart"],
  customer: ["customer", "user", "subscriber", "churn", "ltv", "retention", "satisfaction", "nps"],
};

function classifyDomain(columns: string[]): string {
  const lower = columns.map(c => c.toLowerCase());
  let best = "general"; let bestScore = 0;
  for (const [d, kws] of Object.entries(DOMAIN_KEYWORDS)) {
    const score = kws.filter(k => lower.some(c => c.includes(k))).length;
    if (score > bestScore) { bestScore = score; best = d; }
  }
  return bestScore >= 1 ? best : "general";
}

// ─── Helpers ────────────────────────────────────────────────────────

const fmt = (n: number, opts: Intl.NumberFormatOptions = {}) =>
  Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2, ...opts }) : "—";

const fmtPct = (n: number) => `${n > 0 ? "+" : ""}${fmt(n, { maximumFractionDigits: 1 })}%`;

function findColumn(stats: NumericColumnStats[], regex: RegExp): NumericColumnStats | undefined {
  return stats.find(s => regex.test(s.column));
}

function trendOf(values: number[]): { changePct: number; firstAvg: number; secondAvg: number } {
  if (values.length < 4) return { changePct: 0, firstAvg: 0, secondAvg: 0 };
  const half = Math.floor(values.length / 2);
  const a = values.slice(0, half);
  const b = values.slice(half);
  const fa = a.reduce((s, v) => s + v, 0) / a.length;
  const sa = b.reduce((s, v) => s + v, 0) / b.length;
  const changePct = fa !== 0 ? ((sa - fa) / Math.abs(fa)) * 100 : 0;
  return { changePct, firstAvg: fa, secondAvg: sa };
}

// ─── Per-domain generators ──────────────────────────────────────────

function financeDecisions(profile: DatasetProfile, data: Record<string, unknown>[]): GeneratedDecision[] {
  const out: GeneratedDecision[] = [];
  const ns = profile.numericStats;
  const revenue = findColumn(ns, /revenue|sales|income|turnover/i);
  const expense = findColumn(ns, /expense|cost|spend/i);
  const profit = findColumn(ns, /profit|margin|earnings/i);
  const cash = findColumn(ns, /cash|balance/i);
  const receivable = findColumn(ns, /receivable|outstanding|due/i);

  if (revenue) {
    const vals = data.map(r => Number(r[revenue.column])).filter(v => !isNaN(v));
    const t = trendOf(vals);
    const sev: DecisionSeverity = t.changePct < -15 ? "critical" : t.changePct < -5 ? "high" : t.changePct < 0 ? "medium" : "low";
    if (t.changePct < 0) {
      out.push({
        id: "fin-rev",
        category: "revenue",
        severity: sev,
        problem: `Revenue trending down ${fmtPct(t.changePct)} across the period`,
        impact: `Average ${revenue.column} fell from ${fmt(t.firstAvg)} to ${fmt(t.secondAvg)}`,
        impactValue: fmtPct(t.changePct),
        action: "Identify which segments / products drove the decline and re-engage top accounts",
        actionLabel: "Investigate Drop",
        source: `Trend analysis on ${revenue.column} · ${vals.length} records`,
        evidence: [
          `First half avg: ${fmt(t.firstAvg)}`,
          `Second half avg: ${fmt(t.secondAvg)}`,
          `Total ${revenue.column}: ${fmt(revenue.sum)}`,
        ],
      });
    } else {
      out.push({
        id: "fin-rev-up",
        category: "revenue",
        severity: "low",
        problem: `Revenue trending up ${fmtPct(t.changePct)} — momentum opportunity`,
        impact: `Avg ${revenue.column} grew from ${fmt(t.firstAvg)} to ${fmt(t.secondAvg)}`,
        impactValue: fmtPct(t.changePct),
        action: "Double-down on the channels driving growth before competitors react",
        actionLabel: "Scale Channels",
        source: `Trend analysis on ${revenue.column}`,
        evidence: [`Period total: ${fmt(revenue.sum)}`, `Mean: ${fmt(revenue.mean)}`, `σ: ${fmt(revenue.stdDev)}`],
      });
    }
  }

  if (expense) {
    const vals = data.map(r => Number(r[expense.column])).filter(v => !isNaN(v));
    const t = trendOf(vals);
    if (t.changePct > 5) {
      out.push({
        id: "fin-exp",
        category: "expense",
        severity: t.changePct > 25 ? "critical" : t.changePct > 15 ? "high" : "medium",
        problem: `${expense.column} increased by ${fmtPct(t.changePct)} over the period`,
        impact: `Overspend pattern detected · ${expense.outliers.count} outlier transactions`,
        impactValue: fmtPct(t.changePct),
        action: `Review the ${expense.outliers.count} flagged outlier transactions in ${expense.column}`,
        actionLabel: "Review Outliers",
        source: `Anomaly detector on ${expense.column}`,
        evidence: [
          `Mean ${expense.column}: ${fmt(expense.mean)}`,
          `Outlier threshold: > ${fmt(expense.outliers.upperBound)}`,
          `Total spend: ${fmt(expense.sum)}`,
        ],
      });
    }
  }

  if (cash && revenue && expense) {
    const burn = Math.max(0, expense.mean - revenue.mean);
    if (burn > 0 && cash.mean > 0) {
      const runwayDays = Math.round((cash.mean / burn) * 30);
      const sev: DecisionSeverity = runwayDays < 30 ? "critical" : runwayDays < 60 ? "high" : runwayDays < 120 ? "medium" : "low";
      out.push({
        id: "fin-cash",
        category: "cashflow",
        severity: sev,
        problem: `Cash will run out in ~${runwayDays} days at current burn`,
        impact: `Net burn ${fmt(burn)} per record · current avg cash ${fmt(cash.mean)}`,
        impactValue: `${runwayDays}d`,
        action: receivable ? `Collect outstanding ${receivable.column} (${fmt(receivable.sum)} total)` : "Reduce variable expenses or accelerate collections",
        actionLabel: "Improve Runway",
        source: `Cash-flow model from ${cash.column}, ${revenue.column}, ${expense.column}`,
        evidence: [
          `Avg cash: ${fmt(cash.mean)}`,
          `Avg revenue/period: ${fmt(revenue.mean)}`,
          `Avg expense/period: ${fmt(expense.mean)}`,
        ],
      });
    }
  }

  if (profit) {
    const negCount = data.filter(r => Number(r[profit.column]) < 0).length;
    if (negCount > 0) {
      out.push({
        id: "fin-profit",
        category: "expense",
        severity: negCount / data.length > 0.3 ? "high" : "medium",
        problem: `${negCount} of ${data.length} records show negative ${profit.column}`,
        impact: `${fmt((negCount / data.length) * 100, { maximumFractionDigits: 1 })}% of activity is unprofitable`,
        impactValue: `${negCount}`,
        action: `Investigate the loss-making segments — total drag ${fmt(profit.sum < 0 ? Math.abs(profit.sum) : 0)}`,
        actionLabel: "Find Losses",
        source: `Profit analysis on ${profit.column}`,
        evidence: [
          `Avg ${profit.column}: ${fmt(profit.mean)}`,
          `Min: ${fmt(profit.min)}, Max: ${fmt(profit.max)}`,
          `Negative records: ${negCount}`,
        ],
      });
    }
  }
  return out;
}

function salesDecisions(profile: DatasetProfile, data: Record<string, unknown>[]): GeneratedDecision[] {
  const out: GeneratedDecision[] = [];
  const ns = profile.numericStats;
  const cs = profile.categoricalStats;

  const product = cs.find(c => /product|sku|item/i.test(c.column));
  const customer = cs.find(c => /customer|client|account|buyer/i.test(c.column));
  const region = cs.find(c => /region|city|state|country|territory/i.test(c.column));
  const amount = ns.find(s => /sales|amount|revenue|total|price/i.test(s.column)) || ns[0];
  const qty = ns.find(s => /quantity|qty|units|orders/i.test(s.column));

  if (product && amount) {
    // Pareto: top products contribution
    const totals = new Map<string, number>();
    for (const r of data) {
      const p = String(r[product.column] ?? "Unknown");
      const v = Number(r[amount.column]);
      if (!isNaN(v)) totals.set(p, (totals.get(p) || 0) + v);
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const top3 = sorted.slice(0, 3);
    const top3Pct = total > 0 ? (top3.reduce((s, [, v]) => s + v, 0) / total) * 100 : 0;
    if (sorted.length >= 3) {
      out.push({
        id: "sal-pareto",
        category: "concentration",
        severity: top3Pct > 80 ? "high" : top3Pct > 60 ? "medium" : "low",
        problem: `Top 3 ${product.column} generate ${fmt(top3Pct, { maximumFractionDigits: 1 })}% of ${amount.column}`,
        impact: top3Pct > 70 ? "High concentration risk — losing one hits revenue hard" : "Healthy distribution but watch the leaders",
        impactValue: `${fmt(top3Pct, { maximumFractionDigits: 0 })}%`,
        action: `Protect & expand: ${top3.map(([k]) => k).join(", ")}`,
        actionLabel: "View Top Products",
        source: `Product-mix analysis on ${product.column} × ${amount.column}`,
        evidence: top3.map(([k, v]) => `${k}: ${fmt(v)} (${fmt((v / total) * 100, { maximumFractionDigits: 1 })}%)`),
      });
    }
  }

  if (customer && amount) {
    const totals = new Map<string, number>();
    for (const r of data) {
      const c = String(r[customer.column] ?? "Unknown");
      const v = Number(r[amount.column]);
      if (!isNaN(v)) totals.set(c, (totals.get(c) || 0) + v);
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    const top2 = sorted.slice(0, 2);
    const top2Pct = total > 0 ? (top2.reduce((s, [, v]) => s + v, 0) / total) * 100 : 0;
    if (sorted.length >= 2 && top2Pct > 40) {
      out.push({
        id: "sal-cust",
        category: "churn",
        severity: top2Pct > 70 ? "critical" : top2Pct > 55 ? "high" : "medium",
        problem: `${fmt(top2Pct, { maximumFractionDigits: 0 })}% of revenue comes from just ${top2.length} customers`,
        impact: "Customer concentration risk — a single churn event would cripple revenue",
        impactValue: `${fmt(top2Pct, { maximumFractionDigits: 0 })}%`,
        action: `Lock in ${top2.map(([k]) => k).join(" & ")} with retention plans, then diversify`,
        actionLabel: "Diversify Base",
        source: `Customer concentration on ${customer.column}`,
        evidence: top2.map(([k, v]) => `${k}: ${fmt(v)} (${fmt((v / total) * 100, { maximumFractionDigits: 1 })}%)`),
      });
    }
  }

  if (region && amount) {
    const totals = new Map<string, number>();
    for (const r of data) {
      const k = String(r[region.column] ?? "Unknown");
      const v = Number(r[amount.column]);
      if (!isNaN(v)) totals.set(k, (totals.get(k) || 0) + v);
    }
    const sorted = [...totals.entries()].sort((a, b) => b[1] - a[1]);
    if (sorted.length >= 2) {
      const winner = sorted[0]; const loser = sorted[sorted.length - 1];
      out.push({
        id: "sal-geo",
        category: "performance",
        severity: "medium",
        problem: `${winner[0]} leads ${region.column}; ${loser[0]} lags far behind`,
        impact: `${fmt((winner[1] / (loser[1] || 1)), { maximumFractionDigits: 1 })}× gap between best and worst region`,
        impactValue: `${fmt(winner[1])}`,
        action: `Replicate ${winner[0]} playbook in ${loser[0]} or reallocate spend`,
        actionLabel: "Compare Regions",
        source: `Geo breakdown on ${region.column}`,
        evidence: sorted.slice(0, 5).map(([k, v]) => `${k}: ${fmt(v)}`),
      });
    }
  }

  if (amount) {
    const vals = data.map(r => Number(r[amount.column])).filter(v => !isNaN(v));
    const t = trendOf(vals);
    if (t.changePct < -10) {
      out.push({
        id: "sal-trend",
        category: "trend",
        severity: t.changePct < -25 ? "critical" : "high",
        problem: `${amount.column} dropped ${fmtPct(t.changePct)} in the latter half of the dataset`,
        impact: "Sales momentum reversing — revenue loss trend detected",
        impactValue: fmtPct(t.changePct),
        action: "Focus marketing on top-performing products and re-engage dormant accounts",
        actionLabel: "Run Recovery Plan",
        source: `Time-window comparison on ${amount.column}`,
        evidence: [`First half avg: ${fmt(t.firstAvg)}`, `Second half avg: ${fmt(t.secondAvg)}`, qty ? `Avg qty: ${fmt(qty.mean)}` : `${vals.length} records`],
      });
    }
  }

  return out;
}

function sportsDecisions(profile: DatasetProfile, data: Record<string, unknown>[]): GeneratedDecision[] {
  const out: GeneratedDecision[] = [];
  const ns = profile.numericStats;
  const cs = profile.categoricalStats;
  const player = cs.find(c => /player|batsman|bowler|name|athlete/i.test(c.column));
  const team = cs.find(c => /team|side|squad|club/i.test(c.column));
  const runs = ns.find(s => /runs|score|points|goals/i.test(s.column));
  const sr = ns.find(s => /strike|sr$|rate|average/i.test(s.column));
  const wickets = ns.find(s => /wicket|out|dismissal/i.test(s.column));

  if (player && (runs || sr)) {
    const metric = sr || runs!;
    const totals = new Map<string, { sum: number; count: number }>();
    for (const r of data) {
      const p = String(r[player.column] ?? "Unknown");
      const v = Number(r[metric.column]);
      if (!isNaN(v)) {
        const cur = totals.get(p) || { sum: 0, count: 0 };
        cur.sum += v; cur.count += 1; totals.set(p, cur);
      }
    }
    const ranked = [...totals.entries()]
      .filter(([, v]) => v.count >= 1)
      .map(([k, v]) => [k, v.sum / v.count] as [string, number])
      .sort((a, b) => b[1] - a[1]);
    if (ranked.length) {
      const top = ranked[0];
      out.push({
        id: "spo-top",
        category: "performance",
        severity: "low",
        problem: `${top[0]} leads on ${metric.column} with ${fmt(top[1])}`,
        impact: `Top performer outpaces league avg (${fmt(metric.mean)}) by ${fmt(top[1] - metric.mean)}`,
        impactValue: fmt(top[1]),
        action: `Build the strategy around ${top[0]} for high-leverage moments`,
        actionLabel: "View Players",
        source: `Player ranking on ${metric.column}`,
        evidence: ranked.slice(0, 5).map(([k, v]) => `${k}: ${fmt(v)}`),
      });
    }
  }

  if (team && runs) {
    const totals = new Map<string, number>();
    const counts = new Map<string, number>();
    for (const r of data) {
      const t = String(r[team.column] ?? "Unknown");
      const v = Number(r[runs.column]);
      if (!isNaN(v)) { totals.set(t, (totals.get(t) || 0) + v); counts.set(t, (counts.get(t) || 0) + 1); }
    }
    const ranked = [...totals.entries()].map(([k, s]) => [k, s / (counts.get(k) || 1)] as [string, number]).sort((a, b) => b[1] - a[1]);
    if (ranked.length >= 2) {
      out.push({
        id: "spo-team",
        category: "performance",
        severity: "medium",
        problem: `${ranked[0][0]} averages ${fmt(ranked[0][1])} ${runs.column}/match — top of the table`,
        impact: `Gap to bottom team (${ranked[ranked.length - 1][0]}): ${fmt(ranked[0][1] - ranked[ranked.length - 1][1])}`,
        impactValue: fmt(ranked[0][1]),
        action: "Study the leader's tactics and replicate winning conditions",
        actionLabel: "Compare Teams",
        source: `Team ranking on ${runs.column}`,
        evidence: ranked.slice(0, 5).map(([k, v]) => `${k}: ${fmt(v)} avg`),
      });
    }
  }

  if (wickets) {
    out.push({
      id: "spo-wkt",
      category: "trend",
      severity: wickets.mean > 5 ? "high" : "medium",
      problem: `Avg ${wickets.column}: ${fmt(wickets.mean)} per match`,
      impact: `${wickets.outliers.count} matches show abnormal collapse patterns`,
      impactValue: fmt(wickets.mean),
      action: "Strengthen middle-order resilience for high-wicket scenarios",
      actionLabel: "View Patterns",
      source: `Bowling/dismissal analysis on ${wickets.column}`,
      evidence: [`Min: ${fmt(wickets.min)}`, `Max: ${fmt(wickets.max)}`, `σ: ${fmt(wickets.stdDev)}`],
    });
  }
  return out;
}

// ─── Generic / fallback ────────────────────────────────────────────

function genericDecisions(profile: DatasetProfile, data: Record<string, unknown>[]): GeneratedDecision[] {
  const out: GeneratedDecision[] = [];

  // Top numeric trends
  for (const s of profile.numericStats.slice(0, 4)) {
    const vals = data.map(r => Number(r[s.column])).filter(v => !isNaN(v));
    const t = trendOf(vals);
    if (Math.abs(t.changePct) >= 5) {
      const direction = t.changePct > 0 ? "rising" : "declining";
      out.push({
        id: `gen-trend-${s.column}`,
        category: "trend",
        severity: Math.abs(t.changePct) > 25 ? "high" : Math.abs(t.changePct) > 10 ? "medium" : "low",
        problem: `${s.column} is ${direction} (${fmtPct(t.changePct)})`,
        impact: `Avg shifted from ${fmt(t.firstAvg)} to ${fmt(t.secondAvg)} across the period`,
        impactValue: fmtPct(t.changePct),
        action: t.changePct > 0
          ? `Capitalise on the upswing in ${s.column} — investigate drivers`
          : `Investigate the decline in ${s.column} before it accelerates`,
        actionLabel: "Investigate",
        source: `Trend analysis on ${s.column}`,
        evidence: [`Mean: ${fmt(s.mean)}`, `σ: ${fmt(s.stdDev)}`, `Range: ${fmt(s.min)} → ${fmt(s.max)}`],
      });
    }
  }

  // Outliers / anomalies
  const anomCols = profile.numericStats.filter(s => s.outliers.count > 0).slice(0, 2);
  for (const s of anomCols) {
    const pct = s.outliers.pct;
    out.push({
      id: `gen-anom-${s.column}`,
      category: "anomaly",
      severity: pct > 10 ? "high" : pct > 3 ? "medium" : "low",
      problem: `${s.outliers.count} anomalies detected in ${s.column}`,
      impact: `${fmt(pct, { maximumFractionDigits: 1 })}% of values fall outside the expected range`,
      impactValue: `${s.outliers.count}`,
      action: `Review records where ${s.column} is below ${fmt(s.outliers.lowerBound)} or above ${fmt(s.outliers.upperBound)}`,
      actionLabel: "Review Outliers",
      source: `IQR-based outlier detection`,
      evidence: [
        `Lower bound: ${fmt(s.outliers.lowerBound)}`,
        `Upper bound: ${fmt(s.outliers.upperBound)}`,
        `Sample outliers: ${s.outliers.values.slice(0, 3).map(v => fmt(v)).join(", ") || "—"}`,
      ],
    });
  }

  // Concentration on top categorical
  const cs = profile.categoricalStats.find(c => c.unique > 1 && c.unique < 50);
  if (cs && cs.topValues.length) {
    const top = cs.topValues[0];
    out.push({
      id: `gen-conc-${cs.column}`,
      category: "concentration",
      severity: top.pct > 70 ? "high" : top.pct > 40 ? "medium" : "low",
      problem: `${top.value} dominates ${cs.column} (${fmt(top.pct, { maximumFractionDigits: 1 })}% of records)`,
      impact: `Heavy concentration — ${cs.unique} distinct values but one drives the dataset`,
      impactValue: `${fmt(top.pct, { maximumFractionDigits: 0 })}%`,
      action: `Diversify across other ${cs.column} or focus efforts on the dominant segment`,
      actionLabel: "View Distribution",
      source: `Frequency analysis on ${cs.column}`,
      evidence: cs.topValues.slice(0, 3).map(v => `${v.value}: ${v.count} (${fmt(v.pct, { maximumFractionDigits: 1 })}%)`),
    });
  }

  // Strong correlation
  const corr = profile.correlations.find(c => Math.abs(c.pearson) > 0.6);
  if (corr) {
    out.push({
      id: `gen-corr-${corr.col1}-${corr.col2}`,
      category: "correlation",
      severity: "low",
      problem: `Strong ${corr.direction} link: ${corr.col1} ↔ ${corr.col2} (r=${fmt(corr.pearson)})`,
      impact: `Moving ${corr.col1} ${corr.direction === "positive" ? "up" : "down"} should shift ${corr.col2} predictably`,
      impactValue: `r=${fmt(corr.pearson)}`,
      action: `Use ${corr.col1} as a leading indicator for ${corr.col2}`,
      actionLabel: "Explore Relationship",
      source: "Pearson correlation",
      evidence: [`Strength: ${corr.strength}`, `Direction: ${corr.direction}`, `Coefficient: ${fmt(corr.pearson)}`],
    });
  }

  // Data quality flag
  if (profile.dataQualityScore < 90) {
    out.push({
      id: "gen-quality",
      category: "quality",
      severity: profile.dataQualityScore < 60 ? "high" : profile.dataQualityScore < 80 ? "medium" : "low",
      problem: `Data quality score: ${profile.dataQualityScore}/100`,
      impact: "Missing values may distort downstream insights",
      impactValue: `${profile.dataQualityScore}`,
      action: "Clean missing values or impute before relying on forecasts",
      actionLabel: "Clean Data",
      source: "Completeness scan",
      evidence: [`Rows: ${profile.rowCount}`, `Cols: ${profile.columnCount}`, `Affected: ${profile.anomalySummary.affectedColumns.slice(0, 3).join(", ") || "—"}`],
    });
  }

  return out;
}

// ─── Public API ─────────────────────────────────────────────────────

export function generateDecisions(
  data: Record<string, unknown>[],
  columns: string[],
  columnTypes?: Record<string, string>,
): DecisionFeedResult {
  // Normalize schema (alias headers, coerce numeric strings, infer roles)
  const normalized = profileDataset(data, columns, "uploaded");
  const workingData = normalized.rows;
  const workingCols = normalized.columns;
  const profile = computeDatasetProfile(workingData, workingCols, columnTypes);
  // Prefer role-based classification; fall back to keyword scan
  const domain = classifyByProfiles(normalized.profiles) !== "general"
    ? classifyByProfiles(normalized.profiles)
    : classifyDomain(workingCols);

  let decisions: GeneratedDecision[] = [];
  if (domain === "finance") decisions = financeDecisions(profile, workingData);
  else if (domain === "sales" || domain === "ecommerce") decisions = salesDecisions(profile, workingData);
  else if (domain === "sports") decisions = sportsDecisions(profile, workingData);

  // Always merge generic insights so feed is never empty / dataset-specific
  const generic = genericDecisions(profile, workingData);
  const seen = new Set(decisions.map(d => d.category + d.problem));
  for (const g of generic) {
    if (!seen.has(g.category + g.problem)) decisions.push(g);
  }

  // Sort by severity
  const sevRank: Record<DecisionSeverity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  decisions.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

  // Forge Score: starts at 100, deducted per severity
  let score = 100;
  for (const d of decisions) {
    score -= d.severity === "critical" ? 15 : d.severity === "high" ? 8 : d.severity === "medium" ? 4 : 1;
  }
  score = Math.max(20, Math.min(100, score));
  const scoreLabel = score >= 85 ? "Strong" : score >= 70 ? "Healthy" : score >= 50 ? "Watch" : "Critical";
  const criticalCount = decisions.filter(d => d.severity === "critical").length;
  const highCount = decisions.filter(d => d.severity === "high").length;
  const scoreSummary = criticalCount
    ? `${criticalCount} critical issue${criticalCount > 1 ? "s" : ""} need immediate attention.`
    : highCount
    ? `${highCount} high-priority item${highCount > 1 ? "s" : ""} to address.`
    : `All clear — keep monitoring for changes.`;

  return { domain, decisions, forgeScore: score, scoreLabel, scoreSummary };
}
