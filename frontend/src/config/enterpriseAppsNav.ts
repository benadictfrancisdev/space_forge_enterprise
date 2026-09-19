import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Brain,
  FileText,
  GitBranch,
  LineChart,
  Network,
  Settings2,
  Target,
  Workflow,
} from "lucide-react";

export type EnterpriseAppId =
  | "executive"
  | "journey"
  | "sankey"
  | "operations"
  | "decisions"
  | "scientist"
  | "forecast"
  | "reporting";

export type EnterpriseAppNavItem = {
  id: EnterpriseAppId;
  label: string;
  path: string;
  icon: LucideIcon;
  description: string;
};

export const ENTERPRISE_APPS: EnterpriseAppNavItem[] = [
  {
    id: "executive",
    label: "Executive Insights",
    path: "/v2/apps/executive",
    icon: BarChart3,
    description: "CEO operating dashboard",
  },
  {
    id: "journey",
    label: "Journey Analytics",
    path: "/v2/apps/journey",
    icon: Workflow,
    description: "Business journey funnels",
  },
  {
    id: "sankey",
    label: "Sankey Flows",
    path: "/v2/apps/sankey",
    icon: Network,
    description: "Journey visualization",
  },
  {
    id: "operations",
    label: "Operations",
    path: "/v2/apps/operations",
    icon: Settings2,
    description: "Operational intelligence",
  },
  {
    id: "decisions",
    label: "Decision Intelligence",
    path: "/v2/apps/decisions",
    icon: Target,
    description: "Evidence-backed decisions",
  },
  {
    id: "scientist",
    label: "AI Scientist",
    path: "/v2/apps/scientist",
    icon: Brain,
    description: "Enterprise context analyst",
  },
  {
    id: "forecast",
    label: "Forecast Studio",
    path: "/v2/apps/forecast",
    icon: LineChart,
    description: "Scenario forecasting",
  },
  {
    id: "reporting",
    label: "Enterprise Reports",
    path: "/v2/apps/reporting",
    icon: FileText,
    description: "Board-ready reporting",
  },
];

export const LEGACY_DATA_AGENT = {
  label: "Legacy Data Agent",
  path: "/v2/data-agent",
  icon: GitBranch,
};
