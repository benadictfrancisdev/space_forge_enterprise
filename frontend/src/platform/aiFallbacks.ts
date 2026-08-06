/**
 * Track 8.2 — Deterministic AI fallbacks when gateway fails.
 */
import type { ServiceResult } from "./contracts";
import { djangoApi } from "./djangoAdapter";
import { parseStandardAIResponse } from "./aiEnvelope";

export type AIFallbackInput = {
  operation: string;
  datasetId?: string;
  question?: string;
  message?: string;
  query?: string;
  hypothesis?: string;
  targetColumn?: string;
  horizon?: number;
  module?: string;
  params?: Record<string, unknown>;
};

function heuristicChat(datasetName: string, question: string): Record<string, unknown> {
  return {
    success: true,
    answer: `Local fallback: review profile statistics for "${datasetName}" to answer "${question || "your question"}".`,
    headline: "Heuristic fallback (offline)",
    confidence: 35,
    source: "client_heuristic",
  };
}

function heuristicForecast(horizon = 7): Record<string, unknown> {
  const forecast = Array.from({ length: horizon }, (_, i) => ({
    period: i + 1,
    value: 100 + i * 2,
  }));
  return {
    success: true,
    forecast,
    method: "client_heuristic_trend",
    confidence: 30,
    source: "client_heuristic",
  };
}

function heuristicScientist(): Record<string, unknown> {
  return {
    success: true,
    summary: "Local scientist fallback — run Statistics module for full EDA.",
    findings: [],
    source: "client_heuristic",
    confidence: 35,
  };
}

export function clientHeuristicFallback(
  operation: string,
  input: AIFallbackInput
): Record<string, unknown> {
  const op = operation.replace(/_/g, "-");
  switch (op) {
    case "forecast":
      return heuristicForecast(input.horizon);
    case "scientist":
      return heuristicScientist();
    case "chat":
    default:
      return heuristicChat(
        String(input.params?.datasetName || "dataset"),
        input.question || input.message || input.query || ""
      );
  }
}

/**
 * Invoke AI with automatic client-side heuristic fallback on failure.
 */
export async function invokeAIWithFallback(
  operation: string,
  input: AIFallbackInput = {}
): Promise<ServiceResult<Record<string, unknown>>> {
  const result = await djangoApi.aiCompute(operation, {
    datasetId: input.datasetId,
    question: input.question,
    message: input.message,
    query: input.query,
    hypothesis: input.hypothesis,
    targetColumn: input.targetColumn,
    horizon: input.horizon,
    module: input.module,
    params: input.params,
  });

  if (!result.error && result.data) {
    const parsed = parseStandardAIResponse(result.data);
    return {
      data: {
        success: true,
        ...(parsed || result.data),
        ...(parsed?.result?.details || {}),
      },
      error: null,
    };
  }

  const fallback = clientHeuristicFallback(operation, input);
  return {
    data: {
      ...fallback,
      fallback: true,
      fallback_reason: result.error?.message || "ai_unavailable",
    },
    error: null,
  };
}
