export type ChartType =
  | "kpi" | "bar" | "line" | "area" | "pie" | "donut" | "scatter"
  | "heatmap" | "treemap" | "funnel" | "gauge" | "combo" | "table"
  | "slicer" | "dateSlicer";

export type Aggregation = "sum" | "avg" | "count" | "min" | "max" | "none";

export interface TileLayout { x: number; y: number; w: number; h: number; }

export interface FormatOptions {
  background?: string;
  border?: boolean;
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  showLabels?: boolean;
  colors?: string[];
  numberFormat?: "default" | "compact" | "currency" | "percent";
  xAxisLabel?: string;
  yAxisLabel?: string;
}

export interface BuilderTile {
  id: string;
  type: ChartType;
  title: string;
  layout: TileLayout;
  // field well
  xField?: string;        // category / x-axis
  yField?: string;        // measure
  yField2?: string;       // second measure (combo)
  legendField?: string;   // series breakdown
  valueField?: string;    // KPI / gauge value
  agg?: Aggregation;
  // slicer
  slicerField?: string;
  // formatting
  format?: FormatOptions;
  // calculated field id (instead of plain column)
  calcFieldId?: string;
}

export interface PageFilter {
  id: string;
  field: string;
  type: "multi" | "range" | "date";
  values?: (string | number)[];
  min?: number; max?: number;
  startDate?: string; endDate?: string;
}

export interface DashboardTheme {
  mode: "light" | "dark" | "auto";
  palette: string[];
  accent?: string;
}

export interface DashboardDoc {
  id?: string;
  name: string;
  description?: string;
  datasetId?: string;
  tiles: BuilderTile[];
  filters: PageFilter[];
  theme: DashboardTheme;
  calculatedFields: { id: string; name: string; formula: string }[];
}

export const DEFAULT_PALETTE = [
  "hsl(var(--primary))",
  "hsl(180 70% 50%)",
  "hsl(280 70% 60%)",
  "hsl(30 90% 55%)",
  "hsl(340 75% 55%)",
  "hsl(150 60% 45%)",
  "hsl(220 70% 60%)",
  "hsl(50 80% 55%)",
];

export const emptyDashboard = (): DashboardDoc => ({
  name: "Untitled Dashboard",
  tiles: [],
  filters: [],
  theme: { mode: "auto", palette: DEFAULT_PALETTE },
  calculatedFields: [],
});
