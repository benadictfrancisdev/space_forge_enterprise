/**
 * Single source of truth for Data Agent sidebar + mobile navigation (Track 8.1).
 */
import type { LucideIcon } from "lucide-react";
import {
  Upload,
  Table,
  BarChart3,
  MessageSquare,
  PieChart,
  FileText,
  Activity,
  LayoutDashboard,
  Brain,
  FlaskConical,
  Search,
  Grid3X3,
  TrendingUp,
  FileBarChart,
  ServerCog,
  History,
  Plug,
  Users,
  Package,
  TrendingDown,
  Target,
} from "lucide-react";

export type NavTier = "free" | "pro" | "enterprise";

export interface NavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  requiresData?: boolean;
  tier?: NavTier;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const DATA_AGENT_NAV_GROUPS: NavGroup[] = [
  {
    label: "DATA",
    items: [
      { value: "upload", label: "Upload", icon: Upload, tier: "free" },
      { value: "live_connectors", label: "Live Connectors", icon: Plug, tier: "free" },
      { value: "preview", label: "Preview", icon: Table, requiresData: true, tier: "free" },
    ],
  },
  {
    label: "ANALYZE",
    items: [
      { value: "analyze", label: "Statistics", icon: BarChart3, requiresData: true, tier: "free" },
      { value: "chat", label: "Chat with Data", icon: MessageSquare, requiresData: true, tier: "free" },
      { value: "predict", label: "Predict", icon: Activity, requiresData: true, tier: "free" },
      { value: "ai_scientist", label: "AI Scientist", icon: Brain, requiresData: true, tier: "free" },
      { value: "hypothesis", label: "Hypothesis", icon: FlaskConical, requiresData: true, tier: "free" },
      { value: "nlp_engine", label: "NLP Engine", icon: Search, requiresData: true, tier: "free" },
      { value: "narrative_full", label: "Full Narrative", icon: FileText, requiresData: true, tier: "free" },
      { value: "anomaly_watch", label: "Anomaly Watch", icon: Activity, requiresData: true, tier: "free" },
      { value: "decision_intel", label: "Decisions", icon: Target, requiresData: true, tier: "free" },
      { value: "forecast_chat", label: "Forecast", icon: TrendingUp, requiresData: true, tier: "free" },
    ],
  },
  {
    label: "INDIAN INTEL",
    items: [
      { value: "ibi_churn", label: "Churn Predictor", icon: Users, requiresData: true, tier: "free" },
      { value: "ibi_inventory", label: "Inventory Optimizer", icon: Package, requiresData: true, tier: "free" },
      { value: "ibi_revenue", label: "Revenue Drop", icon: TrendingDown, requiresData: true, tier: "free" },
      { value: "ibi_segments", label: "Segmentation", icon: Target, requiresData: true, tier: "free" },
      { value: "ibi_sales", label: "Sales Performance", icon: BarChart3, requiresData: true, tier: "free" },
    ],
  },
  {
    label: "VISUALIZE",
    items: [
      { value: "master_dashboard", label: "Dashboard", icon: LayoutDashboard, requiresData: true, tier: "free" },
      { value: "power_bi", label: "Power BI", icon: Grid3X3, requiresData: true, tier: "free" },
      { value: "kpi_cards", label: "KPI Cards", icon: TrendingUp, requiresData: true, tier: "free" },
      { value: "visualize", label: "Charts", icon: PieChart, requiresData: true, tier: "free" },
    ],
  },
  {
    label: "EXPORT",
    items: [
      { value: "stakeholder_report", label: "Stakeholder Report", icon: FileBarChart, requiresData: true, tier: "free" },
      { value: "report", label: "Full Report", icon: FileText, requiresData: true, tier: "free" },
      { value: "history", label: "History", icon: History, requiresData: false, tier: "free" },
      { value: "system_status", label: "System Status", icon: ServerCog, requiresData: false, tier: "free" },
    ],
  },
];

export const DATA_AGENT_TAB_IDS = new Set(
  DATA_AGENT_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.value))
);

export const DATA_AGENT_PAGE_DESCRIPTIONS: Record<string, string> = {
  upload: "Upload your data files (CSV, Excel, JSON) to get started",
  live_connectors: "Connect Google Sheets, databases, Shopify, S3, REST APIs, and webhooks for live data sync",
  preview: "Preview, clean, and validate your dataset",
  analyze: "Deep statistical analysis of your data",
  chat: "Ask questions about your data in plain English",
  predict: "Generate predictions using AI-powered analysis",
  ai_scientist: "Conversational AI agent for advanced data science tasks",
  hypothesis: "Statistical hypothesis testing — t-test, correlation, p-values",
  nlp_engine: "Ask questions in natural language, get structured answers",
  narrative_full: "Executive narrative briefing with full what/why/where/when analysis",
  anomaly_watch: "Continuous anomaly monitoring across all numeric columns",
  decision_intel: "Prioritised actions with reasoning, ROI estimates, and risks",
  forecast_chat: "Conversational forecasting — ask about trends, peaks, and risks",
  master_dashboard: "Unified dashboard with KPIs, charts, and recommendations",
  power_bi: "Drag-and-drop dashboard builder with AI tiles",
  kpi_cards: "Auto-detected KPI comparison cards from your dataset",
  visualize: "Create custom charts and visualizations",
  stakeholder_report: "Generate executive stakeholder reports with AI",
  report: "Generate and export full analysis reports",
  history: "All your past AI runs — pinned, searchable, and per-account",
  system_status: "Live health checks and diagnostics for the AI edge function",
  ibi_churn: "Identify high-risk customers and the reasons they may leave",
  ibi_inventory: "AI-powered restock recommendations from your sales + stock data",
  ibi_revenue: "Diagnose revenue drops by region, product, and customer segment",
  ibi_segments: "Group customers into actionable segments — high value, at risk, frequent",
  ibi_sales: "Compare sales reps, regions, and products with AI recommendations",
};

/** Mobile bottom bar — tab values MUST match sidebar `value` fields. */
export const MOBILE_PRIMARY_NAV: NavItem[] = [
  { value: "upload", label: "Upload", icon: Upload, requiresData: false },
  { value: "preview", label: "Preview", icon: Table, requiresData: true },
  { value: "power_bi", label: "Dashboard", icon: Grid3X3, requiresData: true },
  { value: "chat", label: "Chat", icon: MessageSquare, requiresData: true },
];

export const MOBILE_SECONDARY_NAV: NavItem[] = [
  { value: "live_connectors", label: "Connectors", icon: Plug, requiresData: false },
  { value: "nlp_engine", label: "NLP Engine", icon: Search, requiresData: true },
  { value: "analyze", label: "Statistics", icon: BarChart3, requiresData: true },
  { value: "predict", label: "Predict", icon: Activity, requiresData: true },
  { value: "ai_scientist", label: "AI Scientist", icon: Brain, requiresData: true },
  { value: "visualize", label: "Charts", icon: PieChart, requiresData: true },
  { value: "master_dashboard", label: "Dashboard", icon: LayoutDashboard, requiresData: true },
  { value: "forecast_chat", label: "Forecast", icon: TrendingUp, requiresData: true },
  { value: "report", label: "Report", icon: FileText, requiresData: true },
  { value: "history", label: "History", icon: History, requiresData: false },
  { value: "system_status", label: "Status", icon: ServerCog, requiresData: false },
];

export function getNavGroups(): NavGroup[] {
  return DATA_AGENT_NAV_GROUPS;
}

export function getPageDescription(tab: string): string {
  return DATA_AGENT_PAGE_DESCRIPTIONS[tab] || "";
}

export function isValidDataAgentTab(tab: string | null | undefined): tab is string {
  return !!tab && DATA_AGENT_TAB_IDS.has(tab);
}
