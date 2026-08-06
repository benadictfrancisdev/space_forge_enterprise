/**
 * Track 5 / 8.2 — AIService backed by Django /api/v1/ai/*
 */

import type { AIService, ServiceResult } from "./contracts";
import { parseStandardAIResponse } from "./aiEnvelope";
import { invokeAIWithFallback } from "./aiFallbacks";
import { djangoApi } from "./djangoAdapter";

const ACTION_TO_OPERATION: Record<string, string> = {
  chat: "chat",
  query: "nlp",
  "nlp-query": "nlp",
  data_scientist_agent: "scientist",
  hypothesis_testing: "hypothesis",
  auto_narrative: "narrative",
  stakeholder_report: "narrative",
  proactive_anomaly_watch: "anomaly",
  anomaly: "anomaly",
  decision_intelligence: "decisions",
  forecast: "forecast",
  insights: "scientist",
  eda: "scientist",
  correlations: "scientist",
};

function flattenForLegacyPanels(data: Record<string, unknown>): Record<string, unknown> {
  const parsed = parseStandardAIResponse(data);
  const details = parsed?.result?.details || {};
  return {
    success: true,
    ...details,
    enterprise: details,
    operation: parsed?.operation || data.operation,
    model: parsed?.model || data.model,
    evaluation: parsed?.evaluation || data.evaluation,
    metadata: parsed?.metadata || data.metadata,
    summary: parsed?.result?.summary,
    recommendations: parsed?.result?.recommendations,
    warnings: parsed?.result?.warnings,
  };
}

export class DjangoAIService implements AIService {
  async invoke<T = unknown>(
    operation: string,
    payload: Record<string, unknown> = {}
  ): Promise<ServiceResult<T>> {
    const result = await invokeAIWithFallback(operation, {
      datasetId: payload.dataset_id ? String(payload.dataset_id) : undefined,
      question: payload.question ? String(payload.question) : undefined,
      message: payload.message ? String(payload.message) : undefined,
      query: payload.query ? String(payload.query) : undefined,
      hypothesis: payload.hypothesis ? String(payload.hypothesis) : undefined,
      targetColumn: payload.target_column ? String(payload.target_column) : undefined,
      horizon: typeof payload.horizon === "number" ? payload.horizon : undefined,
      module: payload.module ? String(payload.module) : undefined,
      params: payload,
    });
    if (result.error) return { data: null, error: result.error };
    return { data: result.data as T, error: null };
  }
}

/** Map legacy edge-function invokes onto Django AI gateway. */
export async function invokeLegacyAIFunction(
  name: string,
  body: Record<string, unknown>
): Promise<ServiceResult<unknown>> {
  if (name === "predictive-forecast") {
    const result = await invokeAIWithFallback("forecast", {
      datasetId: body.dataset_id ? String(body.dataset_id) : undefined,
      targetColumn: body.target_column ? String(body.target_column) : undefined,
      horizon: typeof body.horizon === "number" ? body.horizon : undefined,
      params: body,
    });
    if (result.error) return result;
    return { data: flattenForLegacyPanels(result.data || {}), error: null };
  }

  if (name === "indian-business-intel") {
    const result = await invokeAIWithFallback("indian-intel", {
      datasetId: body.dataset_id ? String(body.dataset_id) : undefined,
      module: body.module ? String(body.module) : undefined,
      params: body,
    });
    if (result.error) return result;
    return { data: flattenForLegacyPanels(result.data || {}), error: null };
  }

  if (name === "data-agent" || name === "spacebot") {
    const action = String(body.action || body.type || "chat");
    const operation = ACTION_TO_OPERATION[action] || "chat";
    const result = await invokeAIWithFallback(operation, {
      datasetId: body.dataset_id ? String(body.dataset_id) : undefined,
      question:
        (body.question as string) ||
        (body.message as string) ||
        (body.query as string) ||
        (body.prompt as string) ||
        "",
      message: body.message ? String(body.message) : undefined,
      query: body.query ? String(body.query) : undefined,
      hypothesis: body.hypothesis ? String(body.hypothesis) : undefined,
      params: body,
    });
    if (result.error) return result;
    return { data: flattenForLegacyPanels(result.data || {}), error: null };
  }

  return { data: null, error: new Error(`Unknown legacy function: ${name}`) };
}
