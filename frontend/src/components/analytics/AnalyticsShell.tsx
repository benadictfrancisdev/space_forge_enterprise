import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Activity, BarChart3, TrendingUp, AlertTriangle, Users, ArrowLeftRight, Brain, FileText, Heart, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getActiveDataset } from "@/lib/datasetLibrary";
import { inferColumnTypes } from "./inferTypes";
import FilterBar, { FilterState, applyFilter, useDateColumns } from "./FilterBar";
import SavedViewsMenu from "./SavedViewsMenu";
import AnalyticsWidget from "./AnalyticsWidget";
import BusinessHealthHub from "./BusinessHealthHub";

// Lazy-load every panel — Hub stays fast, only the opened module pays the cost
const AutoInsightGenerator = lazy(() => import("@/components/data-agent/AutoInsightGenerator"));
const KPIIntelligenceLayer = lazy(() => import("@/components/data-agent/KPIIntelligenceLayer"));
const TimeIntelligenceEngine = lazy(() => import("@/components/data-agent/TimeIntelligenceEngine"));
const PredictiveAnalytics = lazy(() => import("@/components/data-agent/PredictiveAnalytics"));
const ProactiveAnomalyWatch = lazy(() => import("@/components/data-agent/ProactiveAnomalyWatch"));
const BehavioralSegmentation = lazy(() => import("@/components/data-agent/BehavioralSegmentation"));
const MultiDatasetComparison = lazy(() => import("@/components/data-agent/MultiDatasetComparison"));
const DecisionIntelligence = lazy(() => import("@/components/data-agent/DecisionIntelligence"));
const CEOMode = lazy(() => import("@/components/data-agent/CEOMode"));
const AutoNarrativeEngine = lazy(() => import("@/components/data-agent/AutoNarrativeEngine"));

export interface AnalyticsModule {
  id: string;
  label: string;
  description: string;
  icon: typeof Activity;
  badge?: string;
}

export const ANALYTICS_MODULES: AnalyticsModule[] = [
  { id: "overview", label: "Business Health", description: "KPIs, health score, runway", icon: Heart },
  { id: "kpis", label: "KPI Intelligence", description: "Auto-detected business KPIs", icon: BarChart3 },
  { id: "insights", label: "Auto Insights", description: "Pattern + anomaly findings", icon: Brain },
  { id: "trends", label: "Trends & Time", description: "Growth, seasonality, YoY", icon: LineChart },
  { id: "forecast", label: "Forecasting", description: "ARIMA, scenarios, ranges", icon: TrendingUp, badge: "AI" },
  { id: "anomalies", label: "Anomalies", description: "Spikes and outliers", icon: AlertTriangle },
  { id: "segments", label: "Segments", description: "Behavioral segmentation", icon: Users },
  { id: "compare", label: "Comparison", description: "Multi-dataset compare", icon: ArrowLeftRight },
  { id: "recommendations", label: "Decisions", description: "Act-now recommendations", icon: Activity, badge: "AI" },
  { id: "ceo", label: "Executive Brief", description: "CEO-grade narrative", icon: FileText },
];

const Spinner = () => (
  <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span className="text-xs">Loading module…</span>
  </div>
);

const AnalyticsShell = () => {
  const { module: routeModule } = useParams<{ module?: string }>();
  const navigate = useNavigate();
  const [active, setActive] = useState(routeModule || "overview");
  const [filter, setFilter] = useState<FilterState>({ dateColumn: null, preset: "all" });
  const [tick, setTick] = useState(0); // forces re-read when dataset changes via storage

  useEffect(() => {
    setActive(routeModule || "overview");
  }, [routeModule]);

  useEffect(() => {
    const onStorage = () => setTick((t) => t + 1);
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const dataset = useMemo(() => getActiveDataset(), [tick]);
  const columnTypes = useMemo(
    () => (dataset ? inferColumnTypes(dataset.rows, dataset.columns) : {}),
    [dataset],
  );
  const dateColumns = useDateColumns(columnTypes);

  // Auto-pick a date column when one exists
  useEffect(() => {
    if (!filter.dateColumn && dateColumns.length > 0) {
      setFilter((f) => ({ ...f, dateColumn: dateColumns[0] }));
    }
  }, [dateColumns, filter.dateColumn]);

  const filteredRows = useMemo(
    () => (dataset ? applyFilter(dataset.rows, filter) : []),
    [dataset, filter],
  );

  const goToModule = (id: string) => {
    setActive(id);
    navigate(`/analytics/${id}`, { replace: false });
  };

  if (!dataset) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-md space-y-3">
          <h2 className="text-xl font-semibold">No dataset loaded</h2>
          <p className="text-sm text-muted-foreground">
            Upload a spreadsheet in the Data Agent to unlock the Analytics Hub. Every module here
            reuses your active dataset.
          </p>
          <Button onClick={() => navigate("/data-agent")} className="mt-2">
            Go to Data Agent
          </Button>
        </div>
      </div>
    );
  }

  const sharedProps = {
    data: filteredRows,
    columns: dataset.columns,
    columnTypes,
    datasetName: dataset.name,
  };

  const renderPanel = () => {
    switch (active) {
      case "overview":
        return <BusinessHealthHub {...sharedProps} />;
      case "kpis":
        return (
          <AnalyticsWidget title="KPI Intelligence" description="Auto-detected operational KPIs">
            <Suspense fallback={<Spinner />}>
              <KPIIntelligenceLayer {...sharedProps} />
            </Suspense>
          </AnalyticsWidget>
        );
      case "insights":
        return (
          <AnalyticsWidget title="Auto Insights" description="AI surfaces the most important findings">
            <Suspense fallback={<Spinner />}>
              <AutoInsightGenerator
                dataset={{
                  name: dataset.name,
                  columns: dataset.columns,
                  rawData: filteredRows,
                  status: "ready",
                }}
              />
            </Suspense>
          </AnalyticsWidget>
        );
      case "trends":
        return (
          <AnalyticsWidget title="Time Intelligence" description="Growth, seasonality, period-over-period">
            <Suspense fallback={<Spinner />}>
              <TimeIntelligenceEngine {...sharedProps} />
            </Suspense>
          </AnalyticsWidget>
        );
      case "forecast":
        return (
          <AnalyticsWidget title="Predictive Forecast" description="Forecast ranges with scenarios">
            <Suspense fallback={<Spinner />}>
              <PredictiveAnalytics {...sharedProps} />
            </Suspense>
          </AnalyticsWidget>
        );
      case "anomalies":
        return (
          <AnalyticsWidget title="Proactive Anomaly Watch" description="Detect spikes and outliers">
            <Suspense fallback={<Spinner />}>
              <ProactiveAnomalyWatch {...sharedProps} />
            </Suspense>
          </AnalyticsWidget>
        );
      case "segments":
        return (
          <AnalyticsWidget title="Behavioral Segmentation" description="Cluster customers and behaviors">
            <Suspense fallback={<Spinner />}>
              <BehavioralSegmentation {...sharedProps} />
            </Suspense>
          </AnalyticsWidget>
        );
      case "compare":
        return (
          <AnalyticsWidget title="Multi-Dataset Comparison" description="Join, compare, A/B across datasets">
            <Suspense fallback={<Spinner />}>
              <MultiDatasetComparison
                primaryDataset={{
                  name: dataset.name,
                  columns: dataset.columns,
                  rawData: filteredRows,
                  status: "ready",
                }}
                onJoinComplete={() => {}}
              />
            </Suspense>
          </AnalyticsWidget>
        );
      case "recommendations":
        return (
          <AnalyticsWidget title="Decision Intelligence" description="Ranked Act-Now recommendations">
            <Suspense fallback={<Spinner />}>
              <DecisionIntelligence {...sharedProps} autoRun={false} />
            </Suspense>
          </AnalyticsWidget>
        );
      case "ceo":
        return (
          <div className="space-y-4">
            <AnalyticsWidget title="Executive Brief" description="CEO-grade narrative summary">
              <Suspense fallback={<Spinner />}>
                <CEOMode {...sharedProps} />
              </Suspense>
            </AnalyticsWidget>
            <AnalyticsWidget title="Auto Narrative" description="Plain-English story of the data">
              <Suspense fallback={<Spinner />}>
                <AutoNarrativeEngine {...sharedProps} />
              </Suspense>
            </AnalyticsWidget>
          </div>
        );
      default:
        return <BusinessHealthHub {...sharedProps} />;
    }
  };

  const activeModule = ANALYTICS_MODULES.find((m) => m.id === active) ?? ANALYTICS_MODULES[0];

  return (
    <div className="flex flex-col lg:flex-row min-h-[80vh] gap-4 p-4 lg:p-6 max-w-screen-2xl mx-auto w-full">
      {/* Left rail */}
      <aside className="lg:w-64 shrink-0">
        <div className="lg:sticky lg:top-20 space-y-1">
          <div className="px-2 pb-2">
            <h2 className="text-sm font-semibold tracking-tight">Analytics Hub</h2>
            <p className="text-xs text-muted-foreground truncate">{dataset.name}</p>
          </div>
          <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
            {ANALYTICS_MODULES.map((m) => {
              const Icon = m.icon;
              const isActive = active === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => goToModule(m.id)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left whitespace-nowrap lg:whitespace-normal transition-colors w-full",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted text-foreground/80",
                  )}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="flex-1 truncate">{m.label}</span>
                  {m.badge && (
                    <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">
                      {m.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 min-w-0 space-y-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{activeModule.label}</h1>
              <p className="text-xs text-muted-foreground">{activeModule.description}</p>
            </div>
            <SavedViewsMenu
              currentModule={active}
              currentFilter={filter}
              datasetName={dataset.name}
              onApply={(v) => {
                setFilter(v.filter);
                goToModule(v.module);
              }}
            />
          </div>
          <FilterBar
            dateColumns={dateColumns}
            value={filter}
            onChange={setFilter}
            rightSlot={
              <span className="text-[10px] text-muted-foreground">
                {filteredRows.length.toLocaleString()} / {dataset.rows.length.toLocaleString()} rows
              </span>
            }
          />
        </div>
        {renderPanel()}
      </main>
    </div>
  );
};

export default AnalyticsShell;
