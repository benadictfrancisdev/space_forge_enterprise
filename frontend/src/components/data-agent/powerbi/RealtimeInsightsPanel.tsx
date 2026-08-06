import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  RefreshCw,
  Loader2,
  ChevronRight,
  ChevronLeft,
  BarChart3,
} from "lucide-react";
import { backend } from "@/platform";
import type { DashboardTile } from "./DraggableTile";

interface Insight {
  type: "trend" | "anomaly" | "correlation" | "summary";
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
}

interface RealtimeInsightsPanelProps {
  tiles: DashboardTile[];
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

const ICON_MAP = {
  trend: TrendingUp,
  anomaly: AlertTriangle,
  correlation: BarChart3,
  summary: Lightbulb,
};

const SEVERITY_COLORS = {
  high: "border-destructive/50 bg-destructive/5",
  medium: "border-yellow-500/50 bg-yellow-500/5",
  low: "border-primary/30 bg-primary/5",
};

const RealtimeInsightsPanel = ({ tiles, data, columns, datasetName }: RealtimeInsightsPanelProps) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const lastTilesHash = useRef("");

  const fetchInsights = useCallback(async () => {
    if (tiles.length === 0 || data.length === 0) return;
    setIsLoading(true);

    try {
      const tileSummary = tiles.map(t => ({
        type: t.type,
        title: t.title,
        column: t.column,
        value: t.value,
        change: t.change,
        dataPointCount: t.data?.length,
      }));

      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'realtime_insights',
          tiles: tileSummary,
          data: data.slice(0, 50),
          columns,
          datasetName,
        }
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      if (result?.insights && Array.isArray(result.insights)) {
        setInsights(result.insights);
      }
    } catch (err) {
      console.error("Insights error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [tiles, data, columns, datasetName]);

  // Auto-refresh with debounce when tiles change
  useEffect(() => {
    const hash = JSON.stringify(tiles.map(t => t.id + t.type + t.size));
    if (hash === lastTilesHash.current) return;
    lastTilesHash.current = hash;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchInsights();
    }, 2000);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [tiles, fetchInsights]);

  if (isCollapsed) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsCollapsed(false)}
        className="fixed right-2 top-1/2 -translate-y-1/2 z-30 gap-1 flex-col h-auto py-3 px-2"
      >
        <Brain className="h-4 w-4" />
        <ChevronLeft className="h-3 w-3" />
        <span className="text-[9px] writing-mode-vertical">Insights</span>
      </Button>
    );
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Brain className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-sm">AI Insights</CardTitle>
            {isLoading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={fetchInsights} disabled={isLoading}>
              <RefreshCw className={`h-3 w-3 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsCollapsed(true)}>
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-3 pt-0">
        <ScrollArea className="h-[400px]">
          {insights.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-xs">Generate a dashboard to see AI insights</p>
            </div>
          )}
          <div className="space-y-2">
            {insights.map((insight, idx) => {
              const Icon = ICON_MAP[insight.type] || Lightbulb;
              return (
                <div key={idx} className={`p-3 rounded-lg border ${SEVERITY_COLORS[insight.severity]}`}>
                  <div className="flex items-start gap-2">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0 text-foreground/70" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{insight.title}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{insight.description}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default RealtimeInsightsPanel;
