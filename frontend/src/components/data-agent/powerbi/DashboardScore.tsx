import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Award, Loader2 } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import type { DashboardTile } from "./DraggableTile";

interface DashboardScoreProps {
  tiles: DashboardTile[];
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

interface ScoreResult {
  overall: number;
  coverage: number;
  redundancy: number;
  clarity: number;
  actionability: number;
  suggestions: string[];
}

const DashboardScore = ({ tiles, data, columns, datasetName }: DashboardScoreProps) => {
  const [score, setScore] = useState<ScoreResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleScore = async () => {
    if (tiles.length === 0) return;
    setIsLoading(true);
    try {
      const tileSummary = tiles.map(t => ({ type: t.type, title: t.title, size: t.size, column: t.column }));
      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'dashboard_score',
          tiles: tileSummary,
          data: data.slice(0, 50),
          columns,
          datasetName,
        }
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");
      if (result?.overall !== undefined) {
        setScore(result as ScoreResult);
      }
    } catch {
      toast.error("Failed to score dashboard");
    } finally {
      setIsLoading(false);
    }
  };

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 60) return "text-amber-600";
    return "text-red-500";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5 shrink-0"
          onClick={() => !score && handleScore()}
          disabled={tiles.length === 0}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Award className="h-4 w-4" />
          )}
          {score ? (
            <Badge variant="outline" className={`text-[10px] ${getScoreColor(score.overall)}`}>
              {score.overall}/100
            </Badge>
          ) : (
            <span className="hidden sm:inline text-xs">Score</span>
          )}
        </Button>
      </PopoverTrigger>
      {score && (
        <PopoverContent className="w-64 p-3" align="end">
          <div className="space-y-2">
            <div className="text-center">
              <span className={`text-2xl font-bold ${getScoreColor(score.overall)}`}>{score.overall}</span>
              <span className="text-sm text-muted-foreground">/100</span>
            </div>
            <div className="space-y-1.5">
              {[
                { label: "Coverage", value: score.coverage },
                { label: "Redundancy", value: score.redundancy },
                { label: "Clarity", value: score.clarity },
                { label: "Actionability", value: score.actionability },
              ].map((m) => (
                <div key={m.label} className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{m.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${m.value}%` }} />
                    </div>
                    <span className={`font-medium w-6 text-right ${getScoreColor(m.value)}`}>{m.value}</span>
                  </div>
                </div>
              ))}
            </div>
            {score.suggestions?.length > 0 && (
              <div className="pt-1.5 border-t border-border/50">
                <p className="text-[10px] font-medium text-muted-foreground mb-1">Suggestions</p>
                {score.suggestions.slice(0, 3).map((s, i) => (
                  <p key={i} className="text-[11px] text-muted-foreground">â€¢ {s}</p>
                ))}
              </div>
            )}
            <Button size="sm" variant="ghost" className="w-full text-xs h-7" onClick={handleScore}>
              Refresh
            </Button>
          </div>
        </PopoverContent>
      )}
    </Popover>
  );
};

export default DashboardScore;
