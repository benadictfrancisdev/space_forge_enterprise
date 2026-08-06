import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  History, Pin, PinOff, Trash2, RefreshCw, FileText, Search,
  BarChart3, MessageSquare, Activity, Brain, FlaskConical, PieChart,
  LayoutDashboard, Grid3X3, TrendingUp, FileBarChart, ServerCog, Loader2,
} from "lucide-react";
import { useFeatureHistoryList, type FeatureHistoryEntry } from "@/hooks/useFeatureHistory";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const FEATURE_META: Record<string, { label: string; icon: any }> = {
  predict: { label: "Predict", icon: Activity },
  nlp_engine: { label: "NLP Engine", icon: Search },
  analyze: { label: "Statistics", icon: BarChart3 },
  hypothesis: { label: "Hypothesis", icon: FlaskConical },
  ai_scientist: { label: "AI Scientist", icon: Brain },
  visualize: { label: "Charts", icon: PieChart },
  power_bi: { label: "Power BI", icon: Grid3X3 },
  kpi_cards: { label: "KPI Cards", icon: TrendingUp },
  master_dashboard: { label: "Dashboard", icon: LayoutDashboard },
  stakeholder_report: { label: "Stakeholder Report", icon: FileBarChart },
  report: { label: "Full Report", icon: FileText },
  chat: { label: "Chat with Data", icon: MessageSquare },
  system_status: { label: "System Status", icon: ServerCog },
};

interface FeatureHistoryPanelProps {
  onOpenEntry?: (entry: FeatureHistoryEntry) => void;
}

export default function FeatureHistoryPanel({ onOpenEntry }: FeatureHistoryPanelProps) {
  const { user } = useAuth();
  const { entries, loading, refresh, togglePin, remove } = useFeatureHistoryList();
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
      (e) =>
        (e.dataset_name || "").toLowerCase().includes(q) ||
        e.feature.toLowerCase().includes(q) ||
        (FEATURE_META[e.feature]?.label || "").toLowerCase().includes(q)
    );
  }, [entries, query]);

  if (!user) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            Saved History
          </CardTitle>
          <CardDescription>Sign in to save and revisit your AI analysis results.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Saved History
            </CardTitle>
            <CardDescription>
              Your past AI runs across every module. Pin favourites, delete what you don't need.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <RefreshCw className="w-4 h-4 mr-1" />}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by dataset or feature..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading history...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            <History className="w-10 h-10 mx-auto mb-2 opacity-30" />
            No saved results yet. Run any AI feature to see it appear here.
          </div>
        ) : (
          <ScrollArea className="h-[60vh] pr-3">
            <div className="space-y-2">
              {filtered.map((entry) => {
                const meta = FEATURE_META[entry.feature] || { label: entry.feature, icon: FileText };
                const Icon = meta.icon;
                const ts = new Date(entry.created_at);
                return (
                  <div
                    key={entry.id}
                    className="border border-border rounded-lg p-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{meta.label}</span>
                          {entry.pinned && (
                            <Badge variant="secondary" className="text-xs">
                              <Pin className="w-3 h-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {entry.dataset_name || "No dataset"} · {ts.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {onOpenEntry && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => onOpenEntry(entry)}
                            title="Open"
                          >
                            Open
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => togglePin(entry.id, !entry.pinned)}
                          title={entry.pinned ? "Unpin" : "Pin"}
                        >
                          {entry.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            remove(entry.id);
                            toast.success("Deleted");
                          }}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
        <Separator />
        <p className="text-xs text-muted-foreground">
          History is saved per account. Up to 100 most recent runs are shown — pinned items always stay on top.
        </p>
      </CardContent>
    </Card>
  );
}
