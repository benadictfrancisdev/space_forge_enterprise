/**
 * Track 8.2 — Standard AI response envelope parser.
 */

export type AIEvaluation = {
  provider?: string;
  model?: string;
  latency_ms?: number;
  tokens?: { prompt?: number; completion?: number; total?: number };
  confidence?: number;
  cost_usd?: number;
};

export type AIResultEnvelope = {
  summary?: string;
  recommendations?: unknown[];
  warnings?: string[];
  details?: Record<string, unknown>;
  confidence?: number;
};

export type StandardAIResponse = {
  operation?: string;
  result?: AIResultEnvelope;
  model?: string;
  latency_ms?: number;
  evaluation?: AIEvaluation;
  metadata?: {
    prompt_version?: string;
    context_hash?: string;
    quality_flags?: string[];
    schema_version?: string;
  };
  transport?: string;
  /** Legacy flat fields preserved for backward compatibility */
  [key: string]: unknown;
};

/** Unwrap Django platform envelope { success, data } */
export function unwrapPlatformData<T = unknown>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as Record<string, unknown>;
  if ("success" in obj && "data" in obj) return (obj.data as T) ?? null;
  return payload as T;
}

export function parseStandardAIResponse(raw: unknown): StandardAIResponse | null {
  const data = unwrapPlatformData<StandardAIResponse>(raw);
  if (!data || typeof data !== "object") return null;
  return data;
}

/** Extract user-facing text from standard or legacy AI payloads. */
export function extractAIText(data: StandardAIResponse | null): string {
  if (!data) return "";
  if (data.result?.summary) return String(data.result.summary);
  const d = data.result?.details || data;
  return String(
    (d as Record<string, unknown>).answer ||
      (d as Record<string, unknown>).headline ||
      (d as Record<string, unknown>).summary ||
      (d as Record<string, unknown>).response ||
      ""
  );
}

export function extractAIConfidence(data: StandardAIResponse | null): number | null {
  if (!data) return null;
  if (typeof data.evaluation?.confidence === "number") return data.evaluation.confidence;
  if (typeof data.result?.confidence === "number") return data.result.confidence;
  const legacy = (data as Record<string, unknown>).confidence;
  if (typeof legacy === "number") return legacy > 1 ? legacy / 100 : legacy;
  return null;
}
