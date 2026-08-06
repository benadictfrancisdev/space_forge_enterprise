/** Track 13 — shared platform insight contracts */
export type KPIFact = {
  name: string;
  value: number;
  status: string;
  variance_pct?: number | null;
};

export type AnalyticsFact = {
  operation: string;
  method: string;
  result: Record<string, unknown>;
};

export type RecommendationFact = {
  category: string;
  title: string;
  body: string;
  priority: number;
};

export type PlatformInsightBundle = {
  dataset_id: string;
  dataset_name: string;
  organization_id: string;
  workspace_id: string;
  computed_at: string;
  kpis: KPIFact[];
  business_rules: Record<string, unknown>;
  analytics: AnalyticsFact[];
  context: Record<string, unknown>;
  recommendations: RecommendationFact[];
  governance?: Record<string, unknown> | null;
  configuration: {
    currency: string;
    timezone: string;
    industry_profile: string;
  };
  quality_score?: number | null;
  executive_brief?: Record<string, unknown>;
};

export type JourneyDefinition = {
  id: string;
  name: string;
  journey_type: string;
  industry: string;
  dataset_id?: string | null;
  stage_column: string;
  stages: string[];
  is_template: boolean;
  description: string;
  owner_department?: string;
  time_column?: string;
  entity_column?: string;
};

export type JourneyAnalysisBundle = {
  journey_id: string;
  journey_name?: string;
  journey_type?: string;
  owner_department?: string;
  dataset_id: string;
  funnel: {
    stages?: Array<{ stage: string; count: number; conversion_pct?: number }>;
    sankey?: SankeyData;
  };
  cohort: { cohorts?: Array<{ cohort: string; count: number }> };
  drop_off_analysis: Array<{
    from_stage: string;
    to_stage: string;
    drop_off_count: number;
    drop_off_pct: number;
  }>;
  stage_conversion: Array<{ stage: string; count: number; conversion_pct?: number }>;
  time_in_stage: Array<{
    stage: string;
    avg_hours: number | null;
    sample_size: number;
    note?: string;
  }>;
  sankey: SankeyData & { flow_type?: string };
};

export type ReportTypeOption = { type: string; label: string };

export type DecisionSupport = {
  problem_summary: string;
  root_causes: string[];
  supporting_evidence: Array<{
    type: string;
    source: string;
    summary: string;
    data: Record<string, unknown>;
  }>;
  business_impact: Record<string, unknown>;
  confidence_score: number;
  risk_assessment: {
    level: string;
    score: number;
    factors: Array<{ factor: string; weight: number }>;
  };
  recommended_actions: Array<{
    title: string;
    description: string;
    priority: number;
    category: string;
  }>;
  expected_roi: Record<string, unknown>;
  assumptions_used: string[];
  linked_reports_and_kpis: Record<string, unknown>;
  executive_narrative: Record<string, unknown>;
};

export type ReasoningChainStage = {
  id: string;
  label: string;
  status: string;
};

export type DecisionAnalysisResult = {
  case_id: string;
  problem: string;
  decision_support: DecisionSupport;
  reasoning_chain: {
    stages: ReasoningChainStage[];
    business_problem: string;
    business_rules: Record<string, unknown>;
    analytics: Record<string, unknown>;
    intelligence: Record<string, unknown>;
    recommendations: Array<Record<string, unknown>>;
  };
  insight?: Record<string, unknown>;
  explanation?: Record<string, unknown>;
};

export type SankeyData = {
  nodes: Array<{ id: string; label: string }>;
  links: Array<{ source: string; target: string; value: number }>;
};