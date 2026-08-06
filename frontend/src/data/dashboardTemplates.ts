import type { BuilderTile } from "@/components/data-agent/powerbi/builder/types";

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tiles: BuilderTile[];
}

const id = () => Math.random().toString(36).slice(2, 9);

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "sales-overview",
    name: "Sales Overview",
    description: "Revenue KPIs, trends, and top categories",
    category: "Business",
    tiles: [
      { id: id(), type: "kpi", title: "Total Revenue", agg: "sum", valueField: "revenue", layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Orders", agg: "count", valueField: "id", layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Avg Order Value", agg: "avg", valueField: "revenue", layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Customers", agg: "count", valueField: "customer_id", layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: id(), type: "line", title: "Revenue Over Time", xField: "date", yField: "revenue", agg: "sum", layout: { x: 0, y: 2, w: 8, h: 4 } },
      { id: id(), type: "pie", title: "Revenue by Category", xField: "category", yField: "revenue", agg: "sum", layout: { x: 8, y: 2, w: 4, h: 4 } },
      { id: id(), type: "bar", title: "Top Products", xField: "product", yField: "revenue", agg: "sum", layout: { x: 0, y: 6, w: 6, h: 4 } },
      { id: id(), type: "table", title: "Recent Transactions", layout: { x: 6, y: 6, w: 6, h: 4 } },
    ],
  },
  {
    id: "marketing-funnel",
    name: "Marketing Funnel",
    description: "Acquisition, conversion, retention",
    category: "Marketing",
    tiles: [
      { id: id(), type: "kpi", title: "Visitors", agg: "count", valueField: "session_id", layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Signups", agg: "count", valueField: "signup", layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Conversion %", agg: "avg", valueField: "converted", layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "CAC", agg: "avg", valueField: "cac", layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: id(), type: "area", title: "Funnel by Channel", xField: "channel", yField: "conversions", agg: "sum", layout: { x: 0, y: 2, w: 12, h: 4 } },
    ],
  },
  {
    id: "finance-kpi",
    name: "Finance KPI",
    description: "P&L, expenses, margin tracking",
    category: "Finance",
    tiles: [
      { id: id(), type: "kpi", title: "Revenue", agg: "sum", valueField: "revenue", layout: { x: 0, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Expenses", agg: "sum", valueField: "expense", layout: { x: 3, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Net Profit", agg: "sum", valueField: "profit", layout: { x: 6, y: 0, w: 3, h: 2 } },
      { id: id(), type: "kpi", title: "Margin %", agg: "avg", valueField: "margin", layout: { x: 9, y: 0, w: 3, h: 2 } },
      { id: id(), type: "bar", title: "Expense by Category", xField: "category", yField: "expense", agg: "sum", layout: { x: 0, y: 2, w: 6, h: 4 } },
      { id: id(), type: "line", title: "Profit Trend", xField: "date", yField: "profit", agg: "sum", layout: { x: 6, y: 2, w: 6, h: 4 } },
    ],
  },
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level business pulse",
    category: "Executive",
    tiles: [
      { id: id(), type: "kpi", title: "Top KPI", agg: "sum", valueField: "value", layout: { x: 0, y: 0, w: 4, h: 2 } },
      { id: id(), type: "kpi", title: "Growth", agg: "avg", valueField: "growth", layout: { x: 4, y: 0, w: 4, h: 2 } },
      { id: id(), type: "kpi", title: "Health Score", agg: "avg", valueField: "score", layout: { x: 8, y: 0, w: 4, h: 2 } },
      { id: id(), type: "line", title: "Trend", xField: "date", yField: "value", agg: "sum", layout: { x: 0, y: 2, w: 12, h: 5 } },
    ],
  },
];
