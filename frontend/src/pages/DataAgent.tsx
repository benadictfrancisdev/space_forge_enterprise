import { useState, useEffect, lazy, Suspense, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import Navbar from "@/components/Navbar";
import DataUpload from "@/components/data-agent/DataUpload";
import CognitiveModeSelector, { CognitiveMode } from "@/components/data-agent/CognitiveModeSelector";
import RoleOnboardingModal from "@/components/data-agent/RoleOnboardingModal";
import DataPreview from "@/components/data-agent/DataPreview";
import AutoInsightGenerator from "@/components/data-agent/AutoInsightGenerator";
import FeatureGate from "@/components/data-agent/FeatureGate";
import { MobileBottomNav, ResponsiveSidebar, ResponsiveContainer } from "@/components/layout";
import { DashboardSkeleton } from "@/components/data-agent/skeletons";
import { cn } from "@/lib/utils";
import { detectColumnTypes } from "@/lib/statisticsEngine";
import { useRollback } from "@/hooks/useRollback";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  Upload, Table, Loader2,
  Trash2, Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ShareDashboardButton from "@/components/sharing/ShareDashboardButton";
import { UniversalShareButton } from "@/components/sharing/UniversalShareButton";
import { buildAnalyticsSnapshot } from "@/lib/buildShareSnapshot";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { isApiConfigured } from "@/platform";
import {
  listDatasets, saveDataset as libSaveDataset, setActiveDataset as libSetActive,
  removeDataset as libRemoveDataset, getActiveDataset, type StoredDataset,
} from "@/lib/datasetLibrary";
import {
  getNavGroups,
  getPageDescription,
  isValidDataAgentTab,
} from "@/config/dataAgentNav";

// ─── Lazy imports ───
const AnalysisPanel = lazy(() => import("@/components/data-agent/AnalysisPanel"));
const DataChat = lazy(() => import("@/components/data-agent/DataChat"));
const VisualizationDashboard = lazy(() => import("@/components/data-agent/VisualizationDashboard"));
const ReportGenerator = lazy(() => import("@/components/data-agent/ReportGenerator"));
const PredictiveAnalytics = lazy(() => import("@/components/data-agent/PredictiveAnalytics"));
const MasterDashboard = lazy(() => import("@/components/data-agent/MasterDashboard"));
const AutonomousPipeline = lazy(() => import("@/components/data-agent/AutonomousPipeline"));
const UnifiedResultsView = lazy(() => import("@/components/data-agent/UnifiedResultsView"));
const AIDataScientist = lazy(() => import("@/components/data-agent/AIDataScientist"));
const HypothesisTestingPanel = lazy(() => import("@/components/data-agent/HypothesisTestingPanel"));
const NaturalLanguageEngine = lazy(() => import("@/components/data-agent/NaturalLanguageEngine"));
const PowerBIDashboard = lazy(() => import("@/components/data-agent/PowerBIDashboard"));
const KPIComparisonCards = lazy(() => import("@/components/data-agent/KPIComparisonCards"));
const StakeholderReport = lazy(() => import("@/components/data-agent/StakeholderReport"));
const EdgeFunctionStatus = lazy(() => import("@/components/data-agent/EdgeFunctionStatus"));
const FeatureHistoryPanel = lazy(() => import("@/components/data-agent/FeatureHistoryPanel"));
const LiveConnectors = lazy(() => import("@/components/data-agent/LiveConnectors"));
const IndianBusinessIntelModule = lazy(() => import("@/components/data-agent/IndianBusinessIntelModule"));
const AutoNarrativeEngine = lazy(() => import("@/components/data-agent/AutoNarrativeEngine"));
const ProactiveAnomalyWatch = lazy(() => import("@/components/data-agent/ProactiveAnomalyWatch"));
const DecisionIntelligence = lazy(() => import("@/components/data-agent/DecisionIntelligence"));
const ForecastChatbot = lazy(() => import("@/components/data-agent/ForecastChatbot"));

export interface DatasetState {
  id?: string;
  name: string;
  rawData: Record<string, unknown>[];
  cleanedData?: Record<string, unknown>[];
  columns: string[];
  status: string;
}

// ─── NAVIGATION: shared config in @/config/dataAgentNav ───

import { workspacePath } from "@/config/workspaceNav";

type DataAgentProps = {
  /** Render inside unified workspace shell (no marketing Navbar). */
  embedded?: boolean;
};

const DataAgent = ({ embedded = false }: DataAgentProps) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dataset, setDataset] = useState<DatasetState | null>(null);
  const [library, setLibrary] = useState<StoredDataset[]>([]);
  const [activeTab, setActiveTab] = useState(() => {
    const fromUrl = searchParams.get("tab");
    return isValidDataAgentTab(fromUrl) ? fromUrl : "upload";
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pipelineResults, setPipelineResults] = useState<any>(null);
  const [cognitiveMode, setCognitiveMode] = useState<CognitiveMode>(() => {
    if (typeof window === "undefined") return "analyst";
    return (localStorage.getItem("spaceforge-cognitive-mode") as CognitiveMode) || "analyst";
  });
  useEffect(() => {
    try { localStorage.setItem("spaceforge-cognitive-mode", cognitiveMode); } catch {}
  }, [cognitiveMode]);
  const rollback = useRollback();

  const handleTabChange = useCallback(
    (tab: string) => {
      if (!isValidDataAgentTab(tab)) return;
      setActiveTab(tab);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", tab);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  useEffect(() => {
    const fromUrl = searchParams.get("tab");
    if (isValidDataAgentTab(fromUrl) && fromUrl !== activeTab) {
      setActiveTab(fromUrl);
    }
  }, [searchParams, activeTab]);

  useEffect(() => {
    const isDemoMode = searchParams.get("demo") === "true";
    if (isDemoMode) return;
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate, searchParams]);

  const refreshLibrary = useCallback(() => setLibrary(listDatasets()), []);

  // Rehydrate active dataset from the persistent dataset library on mount.
  // Survives page refreshes and tab switches (localStorage-backed).
  useEffect(() => {
    refreshLibrary();
    if (dataset) return;
    const active = getActiveDataset();
    if (active?.rows?.length && Array.isArray(active.columns)) {
      setDataset({
        id: active.id,
        name: active.name,
        columns: active.columns,
        rawData: active.rows,
        status: "uploaded",
      });
      if (!isValidDataAgentTab(searchParams.get("tab"))) {
        handleTabChange("preview");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDataLoaded = (data: DatasetState) => {
    if (dataset) {
      rollback.createSnapshot(`Before loading ${data.name}`, "dataset", dataset, "Auto-saved before new dataset load");
    }
    const saved = libSaveDataset({
      id: data.id,
      name: data.name,
      columns: data.columns,
      rows: data.rawData,
    });
    setDataset({ ...data, id: saved.id });
    handleTabChange("preview");
    refreshLibrary();
    try {
      sessionStorage.setItem("spacebot-data-context", JSON.stringify({
        datasetName: data.name,
        rowCount: data.rawData.length,
        columnCount: data.columns.length,
        columns: data.columns.slice(0, 20),
        sampleRow: data.rawData[0] ?? {},
      }));
    } catch { /* ignore quota */ }
  };

  const handleSwitchDataset = (id: string) => {
    if (!id || id === dataset?.id) return;
    libSetActive(id);
    const next = listDatasets().find(d => d.id === id);
    if (next) {
      setDataset({
        id: next.id,
        name: next.name,
        columns: next.columns,
        rawData: next.rows,
        status: "uploaded",
      });
      setPipelineResults(null);
      handleTabChange("preview");
      toast.success(`Switched to ${next.name}`);
    }
  };

  const handleClearDataset = () => {
    if (!dataset) return;
    const removed = dataset.name;
    const fallback = dataset.id ? libRemoveDataset(dataset.id) : null;
    refreshLibrary();
    setPipelineResults(null);
    if (fallback) {
      setDataset({
        id: fallback.id,
        name: fallback.name,
        columns: fallback.columns,
        rawData: fallback.rows,
        status: "uploaded",
      });
      handleTabChange("preview");
      toast.success(`Removed ${removed}`, { description: `Switched to ${fallback.name}` });
    } else {
      setDataset(null);
      handleTabChange("upload");
      toast.success(`Removed ${removed}`);
    }
  };

  const handlePipelineComplete = useCallback((results: any) => {
    setPipelineResults(results);
  }, []);

  const handleDataCleaned = (cleanedData: Record<string, unknown>[]) => {
    if (dataset) {
      const prevData = dataset.cleanedData || dataset.rawData;
      rollback.pushAction({
        type: "clean",
        label: `Cleaned ${dataset.name}`,
        category: "data",
        undoFn: () => setDataset(d => d ? { ...d, cleanedData: prevData === dataset.rawData ? undefined : prevData, status: prevData === dataset.rawData ? "uploaded" : "cleaned" } : d),
        redoFn: () => setDataset(d => d ? { ...d, cleanedData, status: "cleaned" } : d),
      });
      setDataset({ ...dataset, cleanedData, status: "cleaned" });
    }
  };

  const getColumnTypes = () => {
    if (!dataset) return {};
    return detectColumnTypes(dataset.cleanedData || dataset.rawData, dataset.columns) as Record<string, "numeric" | "categorical" | "date">;
  };

  if (loading) {
    return (
      <div className={cn(embedded ? "h-full" : "min-h-screen", "flex items-center justify-center bg-background")}>
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  const isDemoMode = searchParams.get("demo") === "true";
  if (!user && !isDemoMode) return null;

  const navGroups = getNavGroups();

  const dataProps = {
    data: dataset?.cleanedData || dataset?.rawData || [],
    columns: dataset?.columns || [],
    columnTypes: getColumnTypes(),
    datasetName: dataset?.name || "",
  };

  return (
    <div className={cn(embedded ? "h-full" : "h-screen", "flex flex-col bg-background overflow-hidden")}>
      <RoleOnboardingModal />
      {!embedded && <Navbar />}

      <div className={cn("flex-1 flex min-h-0", !embedded && "pt-16")}>
        <ResponsiveSidebar
          navGroups={navGroups}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          hasData={!!dataset}
          datasetInfo={dataset ? {
            name: dataset.name,
            rowCount: dataset.rawData.length,
            columnCount: dataset.columns.length
          } : undefined}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />

        <main 
          data-share-root
          className={cn(
            "flex-1 min-h-0 overflow-y-auto transition-all duration-200",
            "pb-24 md:pb-6",
            sidebarCollapsed ? "md:ml-14" : "md:ml-56"
          )}
        >
          <ResponsiveContainer maxWidth="xl" className="py-4 sm:py-6">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div>
                <h1 className="text-lg sm:text-xl font-semibold text-foreground tracking-tight">
                  {navGroups.flatMap(g => g.items).find(t => t.value === activeTab)?.label || "Data Agent"}
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                  {getPageDescription(activeTab)}
                </p>
              </div>

              {(library.length > 0 || dataset) && (
                <div className="flex flex-wrap items-center justify-end gap-2 w-full sm:w-auto">
                  <Database className="w-4 h-4 text-muted-foreground shrink-0" />
                  {user && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() =>
                        navigate(
                          dataset?.id && isApiConfigured()
                            ? `${workspacePath("/apps/executive")}?dataset=${dataset.id}`
                            : workspacePath("/apps/executive")
                        )
                      }
                    >
                      Enterprise Suite
                    </Button>
                  )}
                  <Select
                    value={dataset?.id ?? ""}
                    onValueChange={handleSwitchDataset}
                  >
                    <SelectTrigger className="h-8 min-w-[120px] max-w-[200px] text-xs rounded-full">
                      <SelectValue placeholder="Select dataset" />
                    </SelectTrigger>
                    <SelectContent>
                      {library.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs">
                          {d.name} <span className="text-muted-foreground ml-1">· {d.sampledRowCount.toLocaleString()} rows</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleTabChange("upload")}
                    className="h-8 px-2.5 text-xs rounded-full"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5" />
                    Add
                  </Button>
                  {dataset && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearDataset}
                      className="h-8 px-2.5 text-xs rounded-full text-muted-foreground hover:text-destructive"
                      title="Remove current dataset"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Clear
                    </Button>
                  )}
                  {dataset && (
                    <ShareDashboardButton
                      title={`SpaceForge Analytics — ${dataset.name}`}
                      datasetName={dataset.name}
                      snapshot={buildAnalyticsSnapshot({
                        name: dataset.name,
                        columns: dataset.columns,
                        rows: dataset.cleanedData || dataset.rawData,
                      })}
                    />
                  )}
                  <UniversalShareButton floating={false} />
                </div>
              )}
            </div>

            <div key={activeTab} className="animate-fade-in tab-content-enter">
              {/* ─── Upload ─── */}
              {activeTab === "upload" && <DataUpload onDataLoaded={handleDataLoaded} />}

              {/* ─── Live Connectors ─── */}
              {activeTab === "live_connectors" && (
                <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                  <LiveConnectors onDataLoaded={handleDataLoaded} />
                </Suspense></ErrorBoundary>
              )}

              {/* ─── Preview ─── */}
              {activeTab === "preview" && dataset && (
                <>
                  <AutoInsightGenerator dataset={dataset} onNavigateToAnalyze={() => handleTabChange("analyze")} />
                  <DataPreview dataset={dataset} onDataCleaned={handleDataCleaned} />
                </>
              )}

              {/* Auto-Analyze Pipeline was removed to reduce AI/cloud cost. */}

              {/* ─── Statistics ─── */}
              {activeTab === "analyze" && dataset && (
                <FeatureGate feature="Statistics" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <AnalysisPanel dataset={dataset} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Chat with Data ─── */}
              {activeTab === "chat" && dataset && (
                <FeatureGate feature="Chat with Data" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <DataChat dataset={dataset} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Predict ─── */}
              {activeTab === "predict" && dataset && (
                <FeatureGate feature="Predictive Analytics" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <PredictiveAnalytics {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── AI Scientist ─── */}
              {activeTab === "ai_scientist" && dataset && (
                <FeatureGate feature="AI Scientist" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <AIDataScientist {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Hypothesis ─── */}
              {activeTab === "hypothesis" && dataset && (
                <FeatureGate feature="Hypothesis Testing" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <HypothesisTestingPanel {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── NLP Engine ─── */}
              {activeTab === "nlp_engine" && dataset && (
                <FeatureGate feature="NLP Engine" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <NaturalLanguageEngine {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Full Narrative ─── */}
              {activeTab === "narrative_full" && dataset && (
                <FeatureGate feature="Full Narrative" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <AutoNarrativeEngine {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Anomaly Watch ─── */}
              {activeTab === "anomaly_watch" && dataset && (
                <FeatureGate feature="Anomaly Watch" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <ProactiveAnomalyWatch {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Decision Intelligence ─── */}
              {activeTab === "decision_intel" && dataset && (
                <FeatureGate feature="Decisions" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <DecisionIntelligence {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Forecast Chatbot ─── */}
              {activeTab === "forecast_chat" && dataset && (
                <FeatureGate feature="Forecast" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <ForecastChatbot
                      forecastResult={pipelineResults?.predictiveModel || null}
                      datasetName={dataProps.datasetName}
                      targetColumn={dataProps.columns[0] || ""}
                      columns={dataProps.columns}
                      data={dataProps.data}
                    />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Dashboard ─── */}
              {activeTab === "master_dashboard" && dataset && (
                <FeatureGate feature="Dashboard" creditCost={0} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <MasterDashboard {...dataProps} pipelineResults={pipelineResults} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Power BI ─── */}
              {activeTab === "power_bi" && dataset && (
                <FeatureGate feature="Power BI Dashboard" creditCost={0} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <PowerBIDashboard {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── KPI Cards ─── */}
              {activeTab === "kpi_cards" && dataset && (
                <FeatureGate feature="KPI Cards" creditCost={0} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <KPIComparisonCards {...dataProps} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Charts ─── */}
              {activeTab === "visualize" && dataset && (
                <FeatureGate feature="Charts" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <VisualizationDashboard dataset={dataset} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Stakeholder Report ─── */}
              {activeTab === "stakeholder_report" && dataset && (
                <FeatureGate feature="Stakeholder Report" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <StakeholderReport data={dataProps.data} columns={dataProps.columns} datasetName={dataProps.datasetName} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── Full Report ─── */}
              {activeTab === "report" && dataset && (
                <FeatureGate feature="Report" creditCost={1} requiredPlan="free">
                  <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                    <ReportGenerator dataset={dataset} />
                  </Suspense></ErrorBoundary>
                </FeatureGate>
              )}

              {/* ─── History (no data required) ─── */}
              {activeTab === "history" && (
                <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                  <FeatureHistoryPanel />
                </Suspense></ErrorBoundary>
              )}

              {/* ─── System Status (no data required) ─── */}
              {activeTab === "system_status" && (
                <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                  <EdgeFunctionStatus />
                </Suspense></ErrorBoundary>
              )}

              {/* ─── Indian Business Intelligence Modules ─── */}
              {activeTab.startsWith("ibi_") && dataset && (() => {
                const moduleMap: Record<string, "churn" | "inventory" | "revenue_drop" | "segmentation" | "sales_performance"> = {
                  ibi_churn: "churn",
                  ibi_inventory: "inventory",
                  ibi_revenue: "revenue_drop",
                  ibi_segments: "segmentation",
                  ibi_sales: "sales_performance",
                };
                const mod = moduleMap[activeTab];
                if (!mod) return null;
                return (
                  <FeatureGate feature={`Indian Intel: ${mod}`} creditCost={1} requiredPlan="free">
                    <ErrorBoundary><Suspense fallback={<DashboardSkeleton />}>
                      <IndianBusinessIntelModule
                        module={mod}
                        data={dataProps.data}
                        columns={dataProps.columns}
                        datasetName={dataProps.datasetName}
                      />
                    </Suspense></ErrorBoundary>
                  </FeatureGate>
                );
              })()}
            </div>
          </ResponsiveContainer>
        </main>
      </div>

      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasData={!!dataset}
      />
    </div>
  );
};

export default DataAgent;
