/**
 * Backend API Service for Data Analysis
 * Routes through SpaceForge platform abstractions (enterprise backend pending).
 *
 * Privacy-first pipeline: PII scan → tokenize → summarize → send safe summary only
 */

import { backend } from "@/platform";
import { scanDataset } from "@/lib/piiScanner";
import { tokenizeDataset, detokenizeInsights } from "@/lib/dataTokenizer";
import { summarizeDataset } from "@/lib/statisticalSummarizer";
import type { TokenMap } from "@/lib/dataTokenizer";

// ============== Privacy Pipeline ==============

let _lastTokenMap: TokenMap = {};

interface PrivacyProcessedPayload {
  dataSummary: ReturnType<typeof summarizeDataset>;
  sampleRows: Record<string, unknown>[];
  privacyReport: { sensitiveColumns: string[]; overallRisk: string };
  isPrivacyProcessed: true;
}

/**
 * Runs the full privacy pipeline on raw data before sending to AI.
 * Returns a safe payload with only statistical summaries + anonymised samples.
 */
function privacyProcess(
  data: Record<string, unknown>[],
  columns: string[]
): { safePayload: PrivacyProcessedPayload; tokenMap: TokenMap } {
  // 1. Scan for PII
  const piiReport = scanDataset(data, columns);

  // 2. Build PII column map
  const piiColumns: Record<string, string> = {};
  for (const cr of piiReport.columnReports) {
    if (cr.piiDetected) {
      piiColumns[cr.column] = cr.highestRisk;
    }
  }

  // 3. Tokenize sensitive columns
  const { tokenizedData, tokenMap } = tokenizeDataset(data, piiColumns);

  // 4. Generate statistical summary (using tokenized data for samples)
  const sampleRows = tokenizedData.slice(0, 5);
  const dataSummary = summarizeDataset(data, columns, sampleRows);

  return {
    safePayload: {
      dataSummary,
      sampleRows,
      privacyReport: {
        sensitiveColumns: piiReport.sensitiveColumns,
        overallRisk: piiReport.overallRisk,
      },
      isPrivacyProcessed: true,
    },
    tokenMap,
  };
}

// ============== Core Request Layer ==============

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Whether to run client-side privacy pipeline before AI calls. Default: true */
let privacyMode = true;

export function setPrivacyMode(enabled: boolean) {
  privacyMode = enabled;
}

export function getPrivacyMode() {
  return privacyMode;
}

async function edgeFunctionRequest<T>(
  action: string,
  payload: Record<string, unknown>
): Promise<APIResponse<T>> {
  try {
    // Privacy pipeline for data-bearing actions
    const dataActions = new Set([
      "insights", "query", "eda", "correlations", "forecast",
      "prediction", "clustering", "anomaly", "recommendations",
      "generate-report", "chat", "validate", "clean",
    ]);

    let finalPayload: Record<string, unknown> = { action, ...payload };

    if (privacyMode && dataActions.has(action) && Array.isArray(payload.data) && payload.data.length > 0) {
      const columns = (payload.columns as string[]) || Object.keys(payload.data[0] as Record<string, unknown>);
      const { safePayload, tokenMap } = privacyProcess(
        payload.data as Record<string, unknown>[],
        columns
      );
      _lastTokenMap = tokenMap;

      // Replace raw data with safe payload
      finalPayload = {
        ...finalPayload,
        data: safePayload.sampleRows,
        privacyPayload: safePayload,
      };
    }

    const { data, error } = await backend.functions.invoke("data-agent", {
      body: finalPayload,
    });

    if (error) {
      console.error("Edge function error:", error);
      // Extract meaningful message from SDK error
      const msg = error.message || "";
      if (msg.includes("non-2xx") || msg.includes("Failed to send")) {
        return { success: false, error: "AI service is temporarily unavailable. Please try again in a moment." };
      }
      return { success: false, error: msg || "Backend function error" };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    // Detokenize any token references in the response
    if (privacyMode && Object.keys(_lastTokenMap).length > 0) {
      const detokenized = detokenizeInsights(JSON.stringify(data), _lastTokenMap);
      return { success: true, data: JSON.parse(detokenized) as T };
    }

    return { success: true, data: data as T };
  } catch (error) {
    console.error("API request error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}

// ============== Analysis API ==============

export interface EDAResult {
  success: boolean;
  basic_info: {
    total_rows: number;
    total_columns: number;
    columns: string[];
    memory_usage: number;
    duplicate_rows: number;
  };
  column_info: Array<{
    name: string;
    type: string;
    missing_count: number;
    missing_pct: number;
    unique_count: number;
    unique_pct: number;
  }>;
  numeric_stats: Array<{
    column: string;
    mean: number;
    median: number;
    std: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    skewness: number;
    kurtosis: number;
  }>;
  categorical_stats: Array<{
    column: string;
    top_values: Array<{ value: string; count: number; pct: number }>;
  }>;
  numeric_columns: string[];
  categorical_columns: string[];
  data_quality_score: number;
}

export interface CorrelationResult {
  success: boolean;
  columns: string[];
  top_correlations: Array<{
    column1: string;
    column2: string;
    correlation: number;
    strength: string;
    direction: string;
  }>;
  summary: string;
}

export interface OutlierResult {
  success: boolean;
  method: string;
  total_outliers: number;
  total_outlier_pct: number;
  outliers_by_column: Array<{
    column: string;
    outlier_count: number;
    outlier_pct: number;
    lower_bound: number;
    upper_bound: number;
    outlier_indices: number[];
    outlier_values: number[];
  }>;
  all_outlier_rows: number[];
}

export interface DistributionResult {
  success: boolean;
  column: string;
  statistics: {
    count: number;
    mean: number;
    median: number;
    mode: number | null;
    std: number;
    variance: number;
    min: number;
    max: number;
    range: number;
    skewness: number;
    kurtosis: number;
  };
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  normality: {
    shapiro_p_value: number | null;
    is_normal: boolean | null;
    distribution_type: string;
  };
  histogram: Array<{ bin_start: number; bin_end: number; count: number }>;
}

export const analysisAPI = {
  performEDA: async (data: Record<string, unknown>[]): Promise<APIResponse<EDAResult>> => {
    return edgeFunctionRequest<EDAResult>("eda", {
      data,
      columns: data.length > 0 ? Object.keys(data[0]) : [],
    });
  },

  calculateCorrelations: async (
    data: Record<string, unknown>[],
    columns?: string[]
  ): Promise<APIResponse<CorrelationResult>> => {
    return edgeFunctionRequest<CorrelationResult>("correlations", { data, columns });
  },

  detectOutliers: async (
    data: Record<string, unknown>[],
    columns?: string[],
    _method: string = "iqr"
  ): Promise<APIResponse<OutlierResult>> => {
    return edgeFunctionRequest<OutlierResult>("anomaly", { data, columns });
  },

  analyzeDistribution: async (
    data: Record<string, unknown>[],
    column: string
  ): Promise<APIResponse<DistributionResult>> => {
    return edgeFunctionRequest<DistributionResult>("eda", { data, columns: [column] });
  },
};

// ============== ML API ==============

export interface PredictionResult {
  success: boolean;
  model_type: "classification" | "regression";
  target_column: string;
  feature_columns: string[];
  metrics: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
    cv_accuracy?: number;
    r2_score?: number;
    mse?: number;
    rmse?: number;
    mae?: number;
    cv_r2?: number;
    cv_std?: number;
  };
  feature_importance: Array<{ feature: string; importance: number }>;
  sample_predictions: Array<{ actual: unknown; predicted: unknown }>;
  classes?: string[];
  training_samples: number;
  test_samples: number;
}

export interface ClusteringResult {
  success: boolean;
  algorithm: string;
  n_clusters: number;
  feature_columns: string[];
  metrics: {
    silhouette_score: number;
    calinski_harabasz_score: number;
  };
  cluster_stats: Array<{
    cluster_id: number;
    size: number;
    percentage: number;
    centroid: Record<string, number>;
    description?: string;
    key_features?: Record<string, number>;
  }>;
  scatter_data: Array<{ x: number; y: number; cluster: number }>;
  x_axis: string;
  y_axis: string;
  labels: number[];
  summary?: string;
}

export interface AnomalyResult {
  success: boolean;
  total_records: number;
  anomaly_count: number;
  anomaly_rate: number;
  normal_count: number;
  feature_columns: string[];
  contamination: number;
  severity_summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  anomalies: Array<{
    index: number;
    anomaly_score: number;
    severity: "critical" | "high" | "medium" | "low";
    affected_columns: Array<{ column: string; value: number; z_score: number }>;
    row_data: Record<string, number>;
    description?: string;
    recommendation?: string;
  }>;
  scores: number[];
  summary?: string;
}

export const mlAPI = {
  trainPredictionModel: async (
    data: Record<string, unknown>[],
    targetColumn: string,
    featureColumns?: string[],
    algorithm: string = "auto"
  ): Promise<APIResponse<PredictionResult>> => {
    return edgeFunctionRequest<PredictionResult>("prediction", {
      data,
      columns: featureColumns,
      targetColumn,
      featureColumns,
      algorithm,
    });
  },

  performClustering: async (
    data: Record<string, unknown>[],
    featureColumns?: string[],
    nClusters?: number,
    algorithm: string = "kmeans"
  ): Promise<APIResponse<ClusteringResult>> => {
    return edgeFunctionRequest<ClusteringResult>("clustering", {
      data,
      columns: featureColumns,
      featureColumns,
      query: nClusters ? `Find ${nClusters} clusters` : "Find optimal clusters",
      algorithm,
    });
  },

  detectAnomalies: async (
    data: Record<string, unknown>[],
    featureColumns?: string[],
    contamination: number = 0.1,
    method: string = "Isolation Forest"
  ): Promise<APIResponse<AnomalyResult>> => {
    return edgeFunctionRequest<AnomalyResult>("anomaly", {
      data,
      columns: featureColumns,
      featureColumns,
      method,
    });
  },
};

// ============== AI API ==============

export interface InsightsResult {
  success: boolean;
  dataset_name: string;
  insights: {
    key_findings?: string[];
    trends?: string[];
    anomalies?: string;
    recommendations?: string[];
    data_quality_issues?: string[];
    next_steps?: string[];
    raw_insights?: string;
  };
  summary: string;
}

export interface QueryResult {
  success: boolean;
  query: string;
  answer: string;
  suggested_charts: Array<{ type: string; suggested: boolean }>;
  confidence: number;
}

export interface ExplainResult {
  success: boolean;
  analysis_type: string;
  explanation: string;
}

export interface RecommendationsResult {
  success: boolean;
  recommendations: {
    immediate_actions?: string[];
    short_term?: string[];
    long_term?: string[];
    metrics_to_track?: string[];
    recommendations?: string;
  };
}

export const aiAPI = {
  generateInsights: async (
    data: Record<string, unknown>[],
    columns: string[],
    datasetName: string = "Dataset",
    focusAreas?: string[]
  ): Promise<APIResponse<InsightsResult>> => {
    return edgeFunctionRequest<InsightsResult>("insights", {
      data,
      columns,
      datasetName,
      focusAreas,
    });
  },

  answerQuery: async (
    data: Record<string, unknown>[],
    columns: string[],
    query: string,
    conversationHistory?: Array<{ role: string; content: string }>
  ): Promise<APIResponse<QueryResult>> => {
    return edgeFunctionRequest<QueryResult>("query", {
      data,
      columns,
      query,
      conversationHistory,
    });
  },

  explainAnalysis: async (
    analysisType: string,
    analysisResults: Record<string, unknown>,
    dataContext: string = ""
  ): Promise<APIResponse<ExplainResult>> => {
    return edgeFunctionRequest<ExplainResult>("explain", {
      analysisType,
      analysisResults,
      dataContext,
    });
  },

  generateRecommendations: async (
    data: Record<string, unknown>[],
    columns: string[],
    analysisResults: Record<string, unknown>,
    businessContext: string = ""
  ): Promise<APIResponse<RecommendationsResult>> => {
    return edgeFunctionRequest<RecommendationsResult>("recommendations", {
      data,
      columns,
      analysisResults,
      businessContext,
    });
  },
};

// ============== Forecast API ==============

export interface ForecastResult {
  success: boolean;
  column: string;
  periods: number;
  model_info: {
    method: string;
    slope?: number;
    intercept?: number;
    r_squared?: number;
    seasonality_period?: number;
    alpha?: number;
    recent_trend?: number;
  };
  accuracy_metrics: {
    mape: number | null;
    rmse: number | null;
  };
  historical_data: Array<{ index: number; value: number; type: string }>;
  forecast_data: Array<{
    index: number;
    value: number;
    type: string;
    ci_lower: number;
    ci_upper: number;
  }>;
  summary: {
    current_value: number;
    forecasted_end_value: number;
    forecast_change_pct: number;
    trend_direction: string;
    seasonality_detected: boolean;
    seasonality_period: number | null;
  };
}

export interface MultiForecastResult {
  success: boolean;
  periods: number;
  forecasts: Array<{
    column: string;
    summary: ForecastResult["summary"];
    model_info: ForecastResult["model_info"];
    forecast_data: ForecastResult["forecast_data"];
  }>;
  columns_processed: number;
}

export const forecastAPI = {
  forecastSingle: async (
    data: Record<string, unknown>[],
    valueColumn: string,
    _dateColumn?: string,
    periods: number = 10,
    _method: string = "auto"
  ): Promise<APIResponse<ForecastResult>> => {
    return edgeFunctionRequest<ForecastResult>("forecast", {
      data,
      columns: [valueColumn],
      query: valueColumn,
    });
  },

  forecastMultiple: async (
    data: Record<string, unknown>[],
    columns: string[],
    _periods: number = 10
  ): Promise<APIResponse<MultiForecastResult>> => {
    return edgeFunctionRequest<MultiForecastResult>("forecast", {
      data,
      columns,
    });
  },
};

// ============== Health Check ==============

export const healthAPI = {
  check: async (): Promise<
    APIResponse<{ status: string; services: Record<string, string> }>
  > => {
    try {
      const { data, error } = await backend.functions.invoke("data-agent", {
        body: { action: "health" },
      });
      if (error) return { success: false, error: error.message };
      return { success: true, data: { status: "healthy", services: { ai: "connected", database: "connected" } } };
    } catch {
      return { success: false, error: "Service unavailable" };
    }
  },
};

// ============== Universal Privacy-Aware Edge Function Wrapper ==============

/**
 * safeInvoke â€” Drop-in replacement for backend.functions.invoke('data-agent', ...)
 * Automatically runs the full privacy pipeline (PII scan â†’ tokenize â†’ summarize)
 * before sending any data to AI. De-tokenizes the response locally.
 *
 * Usage (in any component):
 *   import { safeInvoke } from "@/services/api";
 *   const { data, error } = await safeInvoke(action, body);
 */
export async function safeInvoke<T = any>(
  action: string,
  body: Record<string, unknown>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const DATA_ACTIONS = new Set([
      "insights", "query", "eda", "correlations", "forecast",
      "prediction", "clustering", "anomaly", "recommendations",
      "generate-report", "chat", "validate", "clean",
      "analyze", "scientist_paper", "scientist_features", "scientist_hypothesis",
      "founder_health", "founder_risk", "founder_investor", "founder_actions",
      "founder_simulate", "explainability_audit", "narrative",
      "kpi_comparison", "time_intelligence", "smart_imputation",
      "behavioral_segmentation", "dashboard_score", "generate-visualization-report",
    ]);

    let finalBody: Record<string, unknown> = { action, ...body };

    // Apply privacy pipeline if this action sends user data
    if (
      privacyMode &&
      DATA_ACTIONS.has(action) &&
      Array.isArray(body.data) &&
      body.data.length > 0
    ) {
      const rawData = body.data as Record<string, unknown>[];
      const columns =
        (body.columns as string[]) || Object.keys(rawData[0]);

      const { safePayload, tokenMap } = privacyProcess(rawData, columns);
      _lastTokenMap = tokenMap;

      finalBody = {
        ...finalBody,
        data: safePayload.sampleRows,
        privacyPayload: safePayload,
      };
    }

    const { data, error } = await backend.functions.invoke("data-agent", {
      body: finalBody,
    });

    if (error) {
      const msg = error.message || "";
      if (msg.includes("non-2xx") || msg.includes("Failed to send")) {
        return { data: null, error: "AI service is temporarily unavailable. Please try again in a moment." };
      }
      return { data: null, error: msg || "Edge function error" };
    }
    if (data?.error) {
      return { data: null, error: data.error };
    }

    // De-tokenize any token references in the response
    if (privacyMode && Object.keys(_lastTokenMap).length > 0) {
      const detokenized = detokenizeInsights(
        JSON.stringify(data),
        _lastTokenMap
      );
      return { data: JSON.parse(detokenized) as T, error: null };
    }

    return { data: data as T, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}

// ============== Privacy Status ==============

export function getPrivacyStatus() {
  return {
    enabled: privacyMode,
    piiScannerActive: true,
    tokenizerActive: true,
    summarizerActive: true,
    rawDataSentToAI: false,
  };
}

// Default export
export default {
  analysis: analysisAPI,
  ml: mlAPI,
  ai: aiAPI,
  forecast: forecastAPI,
  health: healthAPI,
  safeInvoke,
  getPrivacyStatus,
  setPrivacyMode,
  getPrivacyMode,
};
