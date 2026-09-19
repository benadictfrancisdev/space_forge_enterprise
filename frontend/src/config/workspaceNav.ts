import type { LucideIcon } from "lucide-react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Brain,
  Database,
  FileCode2,
  FileText,
  LayoutDashboard,
  LayoutGrid,
  LineChart,
  Network,
  Plug,
  Search,
  Settings as SettingsIcon,
  Table2,
  Target,
  Workflow,
  Settings2,
} from "lucide-react";

/** Canonical authenticated product shell — all workspace routes live under this prefix. */
export const WORKSPACE_BASE = "/v2";

export function workspacePath(subpath: string): string {
  const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
  if (normalized === WORKSPACE_BASE || normalized.startsWith(`${WORKSPACE_BASE}/`)) {
    return normalized;
  }
  return `${WORKSPACE_BASE}${normalized}`;
}

export type WorkspaceNavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  end?: boolean;
  children?: WorkspaceNavItem[];
  inspectorTitle?: string;
  inspectorBody?: string;
};

export type WorkspaceNavGroup = {
  title: string;
  items: WorkspaceNavItem[];
};

const EVENT_ENGINE_ITEMS: WorkspaceNavItem[] = [
  { label: "Dashboard", to: workspacePath("/events"), icon: LayoutDashboard, end: true },
  { label: "Explorer", to: workspacePath("/events/explorer"), icon: Table2 },
  { label: "Sources", to: workspacePath("/events/sources"), icon: Plug },
  { label: "Monitoring", to: workspacePath("/events/monitoring"), icon: Activity },
  { label: "Search", to: workspacePath("/events/search"), icon: Search },
  { label: "Analytics", to: workspacePath("/events/analytics"), icon: BarChart3 },
  { label: "Settings", to: workspacePath("/events/settings"), icon: SettingsIcon },
];

export const WORKSPACE_NAV_GROUPS: WorkspaceNavGroup[] = [
  {
    title: "Home",
    items: [
      {
        label: "Home",
        to: WORKSPACE_BASE,
        icon: LayoutGrid,
        end: true,
        inspectorTitle: "Control center",
        inspectorBody: "What needs attention in this workspace: incidents, telemetry, and next investigations.",
      },
    ],
  },
  {
    title: "Intelligence",
    items: [
      {
        label: "Executive Insights",
        to: workspacePath("/apps/executive"),
        icon: BarChart3,
        inspectorTitle: "Executive Insights",
        inspectorBody: "KPI health and verified narratives for the selected dataset.",
      },
      {
        label: "Decision Intelligence",
        to: workspacePath("/apps/decisions"),
        icon: Target,
        inspectorTitle: "Decision",
        inspectorBody: "Evidence-backed problem, root cause, confidence, impact, and recommendation.",
      },
      {
        label: "Operational Intelligence",
        to: workspacePath("/apps/operations"),
        icon: Settings2,
        inspectorTitle: "Operations",
        inspectorBody: "Operational signals from the platform pipeline — not a second Event Engine.",
      },
      {
        label: "Journey Intelligence",
        to: workspacePath("/apps/journey"),
        icon: Workflow,
        inspectorTitle: "Journey",
        inspectorBody: "Stages, drop-offs, and conversion. Sankey is a visualization of the same domain.",
      },
      {
        label: "Sankey Flows",
        to: workspacePath("/apps/sankey"),
        icon: Network,
        inspectorTitle: "Sankey",
        inspectorBody: "Flow visualization for a journey definition and dataset.",
      },
      {
        label: "AI Scientist",
        to: workspacePath("/apps/scientist"),
        icon: Brain,
        inspectorTitle: "AI Scientist",
        inspectorBody: "Dataset-scoped analysis. Prefer this over a floating chatbot.",
      },
      {
        label: "Forecast Studio",
        to: workspacePath("/apps/forecast"),
        icon: LineChart,
        inspectorTitle: "Forecast",
        inspectorBody: "Scenario forecasts for the selected dataset.",
      },
    ],
  },
  {
    title: "Data",
    items: [
      {
        label: "Data Agent",
        to: workspacePath("/data-agent"),
        icon: Database,
        inspectorTitle: "Dataset",
        inspectorBody: "Profile, schema, quality, and analysis for the active dataset.",
      },
      {
        label: "Connectors",
        to: `${workspacePath("/data-agent")}?tab=live_connectors`,
        icon: Plug,
        inspectorTitle: "Connectors",
        inspectorBody: "Live sources attached to this workspace.",
      },
      {
        label: "Analytics Hub",
        to: workspacePath("/analytics"),
        icon: BarChart3,
      },
      {
        label: "Dashboards",
        to: workspacePath("/dashboards"),
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: "Decisions",
    items: [
      {
        label: "Decision Feed",
        to: workspacePath("/apps/decisions"),
        icon: Target,
        inspectorTitle: "Decisions",
        inspectorBody: "Active decision analysis for the selected dataset. Lifecycle actions require API support.",
      },
    ],
  },
  {
    title: "Operations",
    items: [
      {
        label: "Events",
        to: workspacePath("/events"),
        icon: LayoutDashboard,
        end: true,
        inspectorTitle: "Event Engine",
        inspectorBody: "Ingest, query, and monitor workspace telemetry.",
        children: EVENT_ENGINE_ITEMS,
      },
      {
        label: "Live Metrics",
        to: workspacePath("/metrics"),
        icon: Activity,
        inspectorTitle: "Live Metrics",
        inspectorBody: "P50 / P90 / P99, throughput, and error rate from event stats.",
      },
      {
        label: "Incidents",
        to: workspacePath("/incidents"),
        icon: AlertTriangle,
        inspectorTitle: "Incident",
        inspectorBody: "CAUSE, PREDICT, and blast radius for the selected incident.",
      },
    ],
  },
  {
    title: "Knowledge",
    items: [
      {
        label: "Rules",
        to: workspacePath("/rules"),
        icon: FileCode2,
        inspectorTitle: "Rules",
        inspectorBody: "Markdown-as-Logic. Entities, validation, and deploy status belong here.",
      },
    ],
  },
  {
    title: "Reports",
    items: [
      {
        label: "Enterprise Reports",
        to: workspacePath("/apps/reporting"),
        icon: FileText,
        inspectorTitle: "Report",
        inspectorBody: "Board-ready output from the reporting pipeline.",
      },
    ],
  },
];

/** Flat Event Engine items for page frames that still list subviews. */
export const EVENT_ENGINE_NAV: WorkspaceNavItem[] = EVENT_ENGINE_ITEMS;

/** Canonical Decision Intelligence route (platform API-backed). */
export const DECISION_INTELLIGENCE_PATH = workspacePath("/apps/decisions");

export const MOBILE_DOMAIN_NAV: WorkspaceNavItem[] = [
  { label: "Home", to: WORKSPACE_BASE, icon: LayoutGrid, end: true },
  { label: "Decisions", to: DECISION_INTELLIGENCE_PATH, icon: Target },
  { label: "Operations", to: workspacePath("/incidents"), icon: AlertTriangle },
  { label: "Data", to: workspacePath("/data-agent"), icon: Database },
];

export function navItemMatches(pathname: string, item: WorkspaceNavItem): boolean {
  const pathOnly = item.to.split("?")[0];
  if (item.end) return pathname === pathOnly || pathname === `${pathOnly}/`;
  if (pathOnly === WORKSPACE_BASE) return pathname === WORKSPACE_BASE || pathname === `${WORKSPACE_BASE}/`;
  return pathname === pathOnly || pathname.startsWith(`${pathOnly}/`);
}

export function itemOrChildActive(pathname: string, item: WorkspaceNavItem): boolean {
  if (navItemMatches(pathname, item)) return true;
  return Boolean(item.children?.some((c) => navItemMatches(pathname, c)));
}

export function flattenNavItems(groups: WorkspaceNavGroup[] = WORKSPACE_NAV_GROUPS): WorkspaceNavItem[] {
  const out: WorkspaceNavItem[] = [];
  for (const g of groups) {
    for (const item of g.items) {
      out.push(item);
      if (item.children) out.push(...item.children);
    }
  }
  return out;
}

export function inspectorCopyForPath(pathname: string): { title: string; body: string } {
  const items = flattenNavItems();
  const match =
    items
      .filter((i) => navItemMatches(pathname, i) && i.to.split("?")[0] !== WORKSPACE_BASE)
      .sort((a, b) => b.to.split("?")[0].length - a.to.split("?")[0].length)[0] ??
    items.find((i) => i.to === WORKSPACE_BASE);
  return {
    title: match?.inspectorTitle ?? match?.label ?? "Workspace",
    body:
      match?.inspectorBody ??
      "Ask SpaceForge about the current view. Select a dataset, incident, or decision to load context.",
  };
}

const BREADCRUMB_LABELS: Record<string, string> = {
  v2: "Home",
  rules: "Rules",
  incidents: "Incidents",
  metrics: "Live Metrics",
  analytics: "Analytics Hub",
  dashboards: "Dashboards",
  "data-agent": "Data Agent",
  apps: "Intelligence",
  executive: "Executive Insights",
  journey: "Journey Intelligence",
  sankey: "Sankey Flows",
  operations: "Operational Intelligence",
  decisions: "Decision Intelligence",
  scientist: "AI Scientist",
  forecast: "Forecast Studio",
  reporting: "Enterprise Reports",
  events: "Events",
  explorer: "Explorer",
  sources: "Sources",
  monitoring: "Monitoring",
  search: "Search",
  settings: "Settings",
};

export type BreadcrumbPart = { label: string; to?: string };

export function workspaceBreadcrumbs(pathname: string): BreadcrumbPart[] {
  const parts = pathname.split("/").filter(Boolean);
  const crumbs: BreadcrumbPart[] = [];
  let acc = "";
  for (let i = 0; i < parts.length; i++) {
    acc += `/${parts[i]}`;
    const key = parts[i];
    crumbs.push({
      label: BREADCRUMB_LABELS[key] ?? key,
      to: i < parts.length - 1 ? acc : undefined,
    });
  }
  return crumbs;
}
