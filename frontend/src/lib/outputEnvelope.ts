/**
 * Universal Output Contract — Databricks-grade envelope used by every AI module.
 * All AI responses can OPTIONALLY include an `enterprise` field of this shape.
 * UI renderers fall back to legacy fields when `enterprise` is absent.
 */

export interface EvidenceItem {
  metric: string;
  value: string | number;
  source_column?: string;
  sample_size?: number;
}

export interface EnvelopeInsight {
  finding: string;
  why_it_matters: string;
  magnitude?: string;
  direction?: "up" | "down" | "stable" | "mixed";
  statistical_basis?: string;
  business_impact_$?: string;
  confidence: number; // 0-100
  drill_to?: string;
}

export interface EnvelopeRecommendation {
  action: string;
  expected_outcome: string;
  effort: "low" | "medium" | "high";
  priority: "critical" | "high" | "medium" | "low";
  owner_role?: string;
  deadline_window?: string;
  kpi_to_track?: string;
  roi_estimate?: string;
  payback_period?: string;
  success_probability?: number;
  counter_factual?: string;
  dependency_chain?: string[];
}

export interface UniversalEnvelope {
  headline: string;
  confidence: number; // 0-100
  evidence: EvidenceItem[];
  insights: EnvelopeInsight[];
  recommendations: EnvelopeRecommendation[];
  risks_and_caveats?: string[];
  next_questions?: string[];
  drill_down_paths?: { label: string; module: string }[];
}

/**
 * Banned generic phrases — surface a warning if the AI uses them.
 */
export const BANNED_PHRASES = [
  "data shows",
  "performing well",
  "looks good",
  "seems fine",
  "appears to be",
  "in general",
  "overall the data",
  "in conclusion",
];

export function flagGenericLanguage(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  return BANNED_PHRASES.filter((p) => lower.includes(p));
}

/**
 * Type guard for partial envelopes returned by edge function.
 */
export function isUniversalEnvelope(v: unknown): v is UniversalEnvelope {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return typeof o.headline === "string" && Array.isArray(o.insights);
}
