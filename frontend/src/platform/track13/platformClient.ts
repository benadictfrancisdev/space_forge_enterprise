/**
 * Track 13 — Platform client for Track 12 + application orchestration APIs.
 */
import { httpRequest } from "../httpClient";
import { djangoApi, type PlatformJob } from "../djangoAdapter";
import type {
  PlatformInsightBundle,
  JourneyDefinition,
  JourneyAnalysisBundle,
  DecisionAnalysisResult,
  ReportTypeOption,
  SankeyData,
} from "./contracts";

async function tenantIds() {
  const tenant = await djangoApi.ensureTenant();
  if (tenant.error || !tenant.data) throw tenant.error ?? new Error("tenant required");
  return tenant.data;
}

export const platformClient = {
  async prepareDataset(datasetId: string): Promise<{ pipeline_run_id: string; job: PlatformJob }> {
    const envelope = await httpRequest<{ pipeline_run_id: string; job: PlatformJob }>({
      method: "POST",
      path: "/api/v1/applications/executive/prepare/",
      body: { dataset_id: datasetId },
    });
    if (!envelope.data) throw new Error("Empty prepare response");
    return envelope.data;
  },

  async pollJob(jobId: string, maxAttempts = 60): Promise<PlatformJob> {
    for (let i = 0; i < maxAttempts; i++) {
      const result = await djangoApi.getJob(jobId);
      if (result.error || !result.data) throw result.error ?? new Error("job poll failed");
      const job = result.data;
      if (job.status === "succeeded" || job.status === "failed" || job.status === "cancelled") {
        return job;
      }
      await new Promise((r) => setTimeout(r, 500));
    }
    throw new Error("Job polling timeout");
  },

  async scheduleExecutiveBrief(datasetId: string, frequency = "daily") {
    const envelope = await httpRequest<{
      schedule_id: string;
      frequency: string;
      job: PlatformJob;
    }>({
      method: "POST",
      path: "/api/v1/applications/executive/schedule-brief/",
      body: { dataset_id: datasetId, frequency },
    });
    if (!envelope.data) throw new Error("Empty schedule response");
    return envelope.data;
  },

  async downloadReportMarkdown(datasetId: string, reportType = "executive") {
    const envelope = await httpRequest<{ markdown: string }>({
      method: "POST",
      path: "/api/v1/applications/reporting/generate/",
      body: { dataset_id: datasetId, report_type: reportType },
    });
    return envelope.data?.markdown ?? "";
  },

  async getInsightBundle(datasetId: string, includeAi = false): Promise<PlatformInsightBundle> {
    const envelope = await httpRequest<PlatformInsightBundle>({
      method: "GET",
      path: "/api/v1/applications/executive/bundle/",
      query: { dataset_id: datasetId, include_ai: includeAi ? "true" : "false" },
    });
    if (!envelope.data) throw new Error("Empty insight bundle");
    return envelope.data;
  },

  async listJourneys(): Promise<JourneyDefinition[]> {
    const { organizationId } = await tenantIds();
    const envelope = await httpRequest<JourneyDefinition[]>({
      method: "GET",
      path: "/api/v1/applications/journeys/",
      query: { organization_id: organizationId },
    });
    return envelope.data ?? [];
  },

  async seedJourneyTemplates(workspaceId: string): Promise<number> {
    const { organizationId } = await tenantIds();
    const envelope = await httpRequest<{ seeded: number }>({
      method: "POST",
      path: "/api/v1/applications/journeys/seed-templates/",
      body: { organization_id: organizationId, workspace_id: workspaceId },
    });
    return envelope.data?.seeded ?? 0;
  },

  async createJourney(body: Record<string, unknown>) {
    const envelope = await httpRequest<JourneyDefinition>({
      method: "POST",
      path: "/api/v1/applications/journeys/",
      body,
    });
    return envelope.data;
  },

  async analyzeJourney(journeyId: string, datasetId?: string): Promise<JourneyAnalysisBundle> {
    const envelope = await httpRequest<JourneyAnalysisBundle>({
      method: "GET",
      path: `/api/v1/applications/journeys/${journeyId}/analyze/`,
      query: datasetId ? { dataset_id: datasetId } : undefined,
    });
    return envelope.data ?? ({} as JourneyAnalysisBundle);
  },

  async explainJourney(journeyId: string, datasetId: string) {
    const envelope = await httpRequest<Record<string, unknown>>({
      method: "POST",
      path: `/api/v1/applications/journeys/${journeyId}/explain/`,
      body: { dataset_id: datasetId },
    });
    return envelope.data ?? {};
  },

  async analyzeDecision(datasetId: string, problem: string) {
    const envelope = await httpRequest<DecisionAnalysisResult>({
      method: "POST",
      path: "/api/v1/applications/decisions/",
      body: { dataset_id: datasetId, problem },
    });
    return envelope.data ?? ({} as DecisionAnalysisResult);
  },

  async getDecisionCase(caseId: string) {
    const envelope = await httpRequest<{
      id: string;
      dataset_id: string;
      problem: string;
      status: string;
      result_bundle: Record<string, unknown>;
    }>({
      method: "GET",
      path: `/api/v1/applications/decisions/${caseId}/`,
    });
    return envelope.data;
  },

  async forecastScenarios(datasetId: string, horizon = 7) {
    const envelope = await httpRequest<Record<string, unknown>>({
      method: "POST",
      path: "/api/v1/applications/forecast/scenarios/",
      body: { dataset_id: datasetId, horizon },
    });
    return envelope.data ?? {};
  },

  async visualizeSankey(params: {
    journey_id?: string;
    dataset_id?: string;
    flow_type?: string;
  }): Promise<SankeyData & { flow_label?: string; flow_type?: string }> {
    const envelope = await httpRequest<SankeyData & { flow_label?: string; flow_type?: string }>({
      method: "POST",
      path: "/api/v1/applications/sankey/visualize/",
      body: params,
    });
    return envelope.data ?? { nodes: [], links: [] };
  },

  async listReportTypes(): Promise<ReportTypeOption[]> {
    const envelope = await httpRequest<ReportTypeOption[]>({
      method: "GET",
      path: "/api/v1/applications/reporting/types/",
    });
    return envelope.data ?? [];
  },

  async scheduleReport(datasetId: string, reportType = "executive", frequency = "daily") {
    const envelope = await httpRequest<{
      schedule_id: string;
      report_type: string;
      job: PlatformJob;
    }>({
      method: "POST",
      path: "/api/v1/applications/reporting/schedule/",
      body: { dataset_id: datasetId, report_type: reportType, frequency },
    });
    if (!envelope.data) throw new Error("Empty schedule response");
    return envelope.data;
  },

  async generateReport(datasetId: string, reportType = "executive") {
    const envelope = await httpRequest<Record<string, unknown>>({
      method: "POST",
      path: "/api/v1/applications/reporting/generate/",
      body: { dataset_id: datasetId, report_type: reportType },
    });
    return envelope.data ?? {};
  },

  async getOpsDashboard() {
    const { organizationId } = await tenantIds();
    const envelope = await httpRequest<Record<string, unknown>>({
      method: "GET",
      path: "/api/v1/applications/operations/",
      query: { organization_id: organizationId },
    });
    return envelope.data ?? {};
  },

  async getScientistContext(datasetId: string) {
    const envelope = await httpRequest<Record<string, unknown>>({
      method: "GET",
      path: "/api/v1/applications/scientist/context/",
      query: { dataset_id: datasetId },
    });
    return envelope.data ?? {};
  },

  async enterpriseSearch(query: string) {
    const { organizationId } = await tenantIds();
    const envelope = await httpRequest<Array<Record<string, unknown>>>({
      method: "GET",
      path: "/api/v1/enterprise-services/search/",
      query: { organization_id: organizationId, q: query },
    });
    return envelope.data ?? [];
  },
};
