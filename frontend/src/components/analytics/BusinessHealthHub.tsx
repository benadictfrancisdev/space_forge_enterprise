import { lazy, Suspense, useMemo } from "react";
import { Loader2 } from "lucide-react";
import KpiTile from "./KpiTile";
import AnalyticsWidget from "./AnalyticsWidget";
import { TrendingUp, Hash, Database, Layers } from "lucide-react";

// Lazy-load the existing component so Hub stays light
const BusinessHealthDashboard = lazy(
  () => import("@/components/data-agent/founder/BusinessHealthDashboard"),
);

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "date" | "categorical">;
  datasetName: string;
}

const BusinessHealthHub = ({ data, columns, columnTypes, datasetName }: Props) => {
  const stats = useMemo(() => {
    const numericCols = columns.filter((c) => columnTypes[c] === "numeric");
    const dateCols = columns.filter((c) => columnTypes[c] === "date");
    const totalSum = numericCols.reduce((acc, col) => {
      const sum = data.reduce((s, r) => {
        const v = Number(r[col]);
        return Number.isFinite(v) ? s + v : s;
      }, 0);
      return acc + sum;
    }, 0);
    return {
      rows: data.length,
      cols: columns.length,
      numeric: numericCols.length,
      dateCols: dateCols.length,
      totalSum,
    };
  }, [data, columns, columnTypes]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiTile title="Rows analyzed" value={stats.rows} icon={Database} />
        <KpiTile title="Columns" value={stats.cols} icon={Layers} />
        <KpiTile title="Numeric measures" value={stats.numeric} icon={Hash} />
        <KpiTile
          title="Aggregate total"
          value={stats.totalSum.toLocaleString(undefined, {
            maximumFractionDigits: 0,
          })}
          icon={TrendingUp}
        />
      </div>

      <AnalyticsWidget
        title="Business Health Score"
        description="Auto-calculated CAC, LTV, churn, burn rate, runway with an overall health score."
      >
        <Suspense
          fallback={
            <div className="flex items-center gap-2 text-muted-foreground py-6">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Loading health module…</span>
            </div>
          }
        >
          <BusinessHealthDashboard
            data={data}
            columns={columns}
            columnTypes={columnTypes}
            datasetName={datasetName}
          />
        </Suspense>
      </AnalyticsWidget>
    </div>
  );
};

export default BusinessHealthHub;
