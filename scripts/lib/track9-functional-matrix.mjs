/**
 * Track 9.1 — Functional certification matrix (26 Data Agent modules).
 * Single source of truth for validate-track9.mjs and certification docs.
 */

/** @typedef {"api" | "client" | "local" | "manual"} CertMode */

/**
 * @typedef {Object} ModuleCert
 * @property {string} id
 * @property {string} label
 * @property {string} group
 * @property {CertMode} mode
 * @property {string} expectedBehavior
 * @property {string[]} testScenarios
 * @property {string} [apiPath]
 * @property {string} [aiOperation]
 * @property {string} [component]
 */

/** @type {ModuleCert[]} */
export const FUNCTIONAL_CERT_MATRIX = [
  // DATA
  {
    id: "upload",
    label: "Upload",
    group: "DATA",
    mode: "api",
    component: "DataUpload",
    expectedBehavior: "CSV upload creates storage object and dataset; profile can be enqueued.",
    testScenarios: ["Upload CSV via storage API", "Create dataset bound to storage", "Profile returns 202"],
    apiPath: "POST /api/v1/storage/objects/ + POST /api/v1/datasets/",
  },
  {
    id: "live_connectors",
    label: "Live Connectors",
    group: "DATA",
    mode: "local",
    component: "LiveConnectors",
    expectedBehavior: "Connector CRUD works in browser localStorage until Sprint 2 REST API.",
    testScenarios: ["Add connector", "List connectors", "Sync preview"],
  },
  {
    id: "preview",
    label: "Preview",
    group: "DATA",
    mode: "client",
    component: "AutonomousPipeline",
    expectedBehavior: "Dataset rows render in preview table after upload.",
    testScenarios: ["Dataset has row_count > 0", "Schema columns present"],
    apiPath: "GET /api/v1/datasets/{id}/",
  },
  // ANALYZE
  {
    id: "analyze",
    label: "Statistics",
    group: "ANALYZE",
    mode: "api",
    component: "AnalysisPanel",
    expectedBehavior: "Statistics endpoint returns profile_status, schema, and column stats.",
    testScenarios: ["GET statistics after profile", "Numeric columns have mean/std"],
    apiPath: "GET /api/v1/datasets/{id}/statistics/",
  },
  {
    id: "chat",
    label: "Chat with Data",
    group: "ANALYZE",
    mode: "api",
    component: "DataChat",
    aiOperation: "chat",
    expectedBehavior: "AI chat returns ai@v1 envelope with answer/summary.",
    testScenarios: ["Ask question with profiled dataset", "Response has evaluation metadata"],
    apiPath: "POST /api/v1/ai/chat/",
  },
  {
    id: "predict",
    label: "Predict",
    group: "ANALYZE",
    mode: "api",
    component: "PredictiveAnalytics",
    aiOperation: "forecast",
    expectedBehavior: "Forecast returns horizon points with confidence.",
    testScenarios: ["Forecast horizon=5", "Points array length matches horizon"],
    apiPath: "POST /api/v1/ai/forecast/",
  },
  {
    id: "ai_scientist",
    label: "AI Scientist",
    group: "ANALYZE",
    mode: "api",
    component: "AIDataScientist",
    aiOperation: "scientist",
    expectedBehavior: "Scientist analysis returns findings/summary envelope.",
    testScenarios: ["Run scientist on profiled dataset"],
    apiPath: "POST /api/v1/ai/scientist/",
  },
  {
    id: "hypothesis",
    label: "Hypothesis",
    group: "ANALYZE",
    mode: "api",
    component: "HypothesisTestingPanel",
    aiOperation: "hypothesis",
    expectedBehavior: "Hypothesis test returns statistical interpretation.",
    testScenarios: ["Submit hypothesis string"],
    apiPath: "POST /api/v1/ai/hypothesis/",
  },
  {
    id: "nlp_engine",
    label: "NLP Engine",
    group: "ANALYZE",
    mode: "api",
    component: "NaturalLanguageEngine",
    aiOperation: "nlp",
    expectedBehavior: "NLP query returns structured answer.",
    testScenarios: ["Natural language query on dataset"],
    apiPath: "POST /api/v1/ai/nlp/",
  },
  {
    id: "narrative_full",
    label: "Full Narrative",
    group: "ANALYZE",
    mode: "api",
    component: "AutoNarrativeEngine",
    aiOperation: "narrative",
    expectedBehavior: "Narrative generator returns executive summary.",
    testScenarios: ["Generate narrative for dataset"],
    apiPath: "POST /api/v1/ai/narrative/",
  },
  {
    id: "anomaly_watch",
    label: "Anomaly Watch",
    group: "ANALYZE",
    mode: "api",
    component: "ProactiveAnomalyWatch",
    aiOperation: "anomaly",
    expectedBehavior: "Anomaly scan returns severity-classified findings.",
    testScenarios: ["Scan profiled numeric dataset"],
    apiPath: "POST /api/v1/ai/anomaly/",
  },
  {
    id: "decision_intel",
    label: "Decisions",
    group: "ANALYZE",
    mode: "api",
    component: "DecisionIntelligence",
    aiOperation: "decisions",
    expectedBehavior: "Decision intelligence returns prioritized recommendations.",
    testScenarios: ["Request decisions for org"],
    apiPath: "POST /api/v1/ai/decisions/",
  },
  {
    id: "forecast_chat",
    label: "Forecast",
    group: "ANALYZE",
    mode: "api",
    component: "ForecastChatbot",
    aiOperation: "forecast",
    expectedBehavior: "Conversational forecast returns trend points.",
    testScenarios: ["Forecast with horizon=7"],
    apiPath: "POST /api/v1/ai/forecast/",
  },
  // INDIAN INTEL
  {
    id: "ibi_churn",
    label: "Churn Predictor",
    group: "INDIAN INTEL",
    mode: "api",
    component: "IndianBusinessIntelModule",
    aiOperation: "indian-intel",
    expectedBehavior: "Churn module returns risk segments and recommendations.",
    testScenarios: ["module=churn"],
    apiPath: "POST /api/v1/ai/indian-intel/",
  },
  {
    id: "ibi_inventory",
    label: "Inventory Optimizer",
    group: "INDIAN INTEL",
    mode: "api",
    component: "IndianBusinessIntelModule",
    aiOperation: "indian-intel",
    expectedBehavior: "Inventory module returns restock guidance.",
    testScenarios: ["module=inventory"],
    apiPath: "POST /api/v1/ai/indian-intel/",
  },
  {
    id: "ibi_revenue",
    label: "Revenue Drop",
    group: "INDIAN INTEL",
    mode: "api",
    component: "IndianBusinessIntelModule",
    aiOperation: "indian-intel",
    expectedBehavior: "Revenue drop diagnosis by region/product.",
    testScenarios: ["module=revenue_drop"],
    apiPath: "POST /api/v1/ai/indian-intel/",
  },
  {
    id: "ibi_segments",
    label: "Segmentation",
    group: "INDIAN INTEL",
    mode: "api",
    component: "IndianBusinessIntelModule",
    aiOperation: "indian-intel",
    expectedBehavior: "Customer segmentation with actionable groups.",
    testScenarios: ["module=segmentation"],
    apiPath: "POST /api/v1/ai/indian-intel/",
  },
  {
    id: "ibi_sales",
    label: "Sales Performance",
    group: "INDIAN INTEL",
    mode: "api",
    component: "IndianBusinessIntelModule",
    aiOperation: "indian-intel",
    expectedBehavior: "Sales rep/region comparison with AI recommendations.",
    testScenarios: ["module=sales_performance"],
    apiPath: "POST /api/v1/ai/indian-intel/",
  },
  // VISUALIZE
  {
    id: "master_dashboard",
    label: "Dashboard",
    group: "VISUALIZE",
    mode: "client",
    component: "MasterDashboard",
    expectedBehavior: "Dashboard renders KPIs from local dataset state.",
    testScenarios: ["Dataset statistics available", "Numeric columns detected"],
    apiPath: "GET /api/v1/datasets/{id}/statistics/",
  },
  {
    id: "power_bi",
    label: "Power BI",
    group: "VISUALIZE",
    mode: "client",
    component: "PowerBIDashboard",
    expectedBehavior: "Drag-drop dashboard builder loads with dataset schema.",
    testScenarios: ["Schema columns present for tile binding"],
    apiPath: "GET /api/v1/datasets/{id}/",
  },
  {
    id: "kpi_cards",
    label: "KPI Cards",
    group: "VISUALIZE",
    mode: "client",
    component: "KPIComparisonCards",
    expectedBehavior: "Auto-detects numeric KPIs or shows empty state.",
    testScenarios: ["Numeric columns in statistics"],
    apiPath: "GET /api/v1/datasets/{id}/statistics/",
  },
  {
    id: "visualize",
    label: "Charts",
    group: "VISUALIZE",
    mode: "client",
    component: "VisualizationDashboard",
    expectedBehavior: "Chart builder renders with dataset columns.",
    testScenarios: ["Schema has ≥1 column"],
    apiPath: "GET /api/v1/datasets/{id}/",
  },
  // EXPORT
  {
    id: "stakeholder_report",
    label: "Stakeholder Report",
    group: "EXPORT",
    mode: "api",
    component: "StakeholderReport",
    aiOperation: "narrative",
    expectedBehavior: "Stakeholder report AI generation succeeds.",
    testScenarios: ["Narrative for executives"],
    apiPath: "POST /api/v1/ai/narrative/",
  },
  {
    id: "report",
    label: "Full Report",
    group: "EXPORT",
    mode: "api",
    component: "ReportGenerator",
    aiOperation: "scientist",
    expectedBehavior: "Full report uses scientist + export paths.",
    testScenarios: ["Scientist analysis", "Export manifest available"],
    apiPath: "POST /api/v1/ai/scientist/ + GET /api/v1/datasets/{id}/export/",
  },
  {
    id: "history",
    label: "History",
    group: "EXPORT",
    mode: "local",
    component: "FeatureHistoryPanel",
    expectedBehavior: "Feature history list/save/pin works in localStorage.",
    testScenarios: ["Save run", "List history", "Pin entry"],
  },
  {
    id: "system_status",
    label: "System Status",
    group: "EXPORT",
    mode: "api",
    component: "EdgeFunctionStatus",
    expectedBehavior: "Platform and AI health endpoints return ok.",
    testScenarios: ["GET /health/", "GET /api/v1/ai/health/"],
    apiPath: "GET /health/ + GET /api/v1/ai/health/",
  },
];

export const AI_OPERATIONS = [
  "chat",
  "forecast",
  "scientist",
  "hypothesis",
  "nlp",
  "narrative",
  "anomaly",
  "decisions",
];

export const IBI_MODULES = {
  ibi_churn: "churn",
  ibi_inventory: "inventory",
  ibi_revenue: "revenue_drop",
  ibi_segments: "segmentation",
  ibi_sales: "sales_performance",
};

/** Map module id → harness test key */
export function modulesForHarness() {
  return FUNCTIONAL_CERT_MATRIX;
}
