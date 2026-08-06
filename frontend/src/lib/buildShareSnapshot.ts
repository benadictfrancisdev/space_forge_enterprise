// Builds a public-viewer-compatible snapshot from current in-app state.
// Shape matches SharedDashboard.tsx's SharedSnapshot interface.

export interface ShareTile {
  id: string;
  type: "kpi" | "bar" | "line" | "pie" | "area" | "scatter";
  title: string;
  config?: Record<string, any>;
  value?: number;
  change?: number;
  insight?: string;
}

export interface ShareSnapshot {
  data?: Record<string, unknown>[];
  columns?: string[];
  tiles?: ShareTile[];
  insights?: string[];
  summary?: string;
}

const MAX_ROWS = 2000;

const isNumeric = (rows: Record<string, unknown>[], col: string) => {
  let n = 0, ok = 0;
  for (const r of rows.slice(0, 50)) {
    const v = r[col];
    if (v === null || v === undefined || v === "") continue;
    n++;
    if (typeof v === "number" || (!isNaN(Number(v)) && v !== "")) ok++;
  }
  return n > 0 && ok / n >= 0.7;
};

const sum = (rows: Record<string, unknown>[], col: string) =>
  rows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);

/** Build a snapshot from an analytics dataset (DataAgent share). */
export function buildAnalyticsSnapshot(args: {
  name: string;
  columns: string[];
  rows: Record<string, unknown>[];
  insights?: string[];
  summary?: string;
}): ShareSnapshot {
  const { name, columns, rows, insights, summary } = args;
  const sample = rows.slice(0, MAX_ROWS);

  const numericCols = columns.filter((c) => isNumeric(sample, c));
  const categoricalCols = columns.filter((c) => !numericCols.includes(c));

  const tiles: ShareTile[] = [];

  // Up to 3 KPI tiles from top numeric columns
  numericCols.slice(0, 3).forEach((col, i) =>
    tiles.push({
      id: `kpi-${i}`,
      type: "kpi",
      title: `Total ${col}`,
      value: sum(sample, col),
    }),
  );

  // One bar chart: first categorical × first numeric
  if (categoricalCols[0] && numericCols[0]) {
    tiles.push({
      id: "bar-1",
      type: "bar",
      title: `${numericCols[0]} by ${categoricalCols[0]}`,
      config: { xKey: categoricalCols[0], yKey: numericCols[0] },
    });
  }

  // One line/area trend if there's a 2nd numeric column
  if (numericCols[0] && numericCols[1]) {
    tiles.push({
      id: "line-1",
      type: "line",
      title: `${numericCols[0]} & ${numericCols[1]} trend`,
      config: { xKey: categoricalCols[0] || columns[0], yKeys: [numericCols[0], numericCols[1]] },
    });
  }

  return {
    data: sample,
    columns,
    tiles,
    insights: insights?.filter(Boolean).slice(0, 8),
    summary: summary || `Live analytics snapshot for ${name} (${rows.length.toLocaleString()} rows).`,
  };
}

/** Build a snapshot from a Decision Feed result. */
export function buildDecisionFeedSnapshot(result: {
  forgeScore: number;
  scoreLabel: string;
  scoreSummary: string;
  decisions: Array<{
    id?: string;
    problem: string;
    impact: string;
    impactValue: string | number;
    action: string;
    severity?: string;
  }>;
}): ShareSnapshot {
  const top = result.decisions.slice(0, 6);

  const tiles: ShareTile[] = [
    {
      id: "forge-score",
      type: "kpi",
      title: `Forge Score (${result.scoreLabel})`,
      value: result.forgeScore,
      insight: result.scoreSummary,
    },
    ...top.slice(0, 3).map((d, i) => ({
      id: `decision-${i}`,
      type: "kpi" as const,
      title: d.problem.length > 60 ? d.problem.slice(0, 57) + "…" : d.problem,
      value: typeof d.impactValue === "number" ? d.impactValue : 0,
      insight: `${d.impact} — Action: ${d.action}`,
    })),
  ];

  return {
    tiles,
    insights: top.map((d) => `${d.problem} → ${d.action} (${d.impact})`),
    summary: `${result.scoreSummary} · ${result.decisions.length} ranked decisions.`,
  };
}
