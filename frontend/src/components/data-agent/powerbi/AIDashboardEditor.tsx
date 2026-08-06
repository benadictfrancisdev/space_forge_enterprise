import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Send, RotateCcw } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import type { DashboardTile } from "./DraggableTile";

interface AIDashboardEditorProps {
  tiles: DashboardTile[];
  onTilesUpdate: (tiles: DashboardTile[]) => void;
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

const SUGGESTED_COMMANDS = [
  "Add churn by region",
  "Compare with last quarter",
  "Change to cumulative",
  "Make KPI cards smaller",
  "Add a moving average line",
  "Show top 5 only",
];

const AIDashboardEditor = ({ tiles, onTilesUpdate, data, columns, datasetName }: AIDashboardEditorProps) => {
  const [instruction, setInstruction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);

  const handleApply = async (cmd?: string) => {
    const command = cmd || instruction.trim();
    if (!command || tiles.length === 0) return;
    setIsProcessing(true);

    try {
      const tilesConfig = tiles.map(t => ({
        id: t.id,
        type: t.type,
        title: t.title,
        size: t.size,
        column: t.column,
        xAxis: t.xAxis,
        yAxis: t.yAxis,
        color: t.color,
        value: t.value,
        change: t.change,
      }));

      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'ai_edit_dashboard',
          instruction: command,
          tilesConfig,
          data: data.slice(0, 100),
          columns,
          datasetName,
        }
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      if (result?.tiles && Array.isArray(result.tiles)) {
        const updatedTiles: DashboardTile[] = result.tiles.map((aiTile: any) => {
          const existing = tiles.find(t => t.id === aiTile.id);
          if (existing) {
            return { ...existing, ...aiTile, data: aiTile.data || existing.data };
          }
          return {
            id: aiTile.id || `ai-edit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: aiTile.type || "kpi",
            title: aiTile.title || "New Tile",
            size: aiTile.size || "medium",
            data: aiTile.data,
            value: aiTile.value,
            change: aiTile.change,
            color: aiTile.color,
            column: aiTile.column,
            xAxis: aiTile.xAxis,
            yAxis: aiTile.yAxis,
          };
        });
        onTilesUpdate(updatedTiles);

        // Add to history
        setCommandHistory(prev => [command, ...prev.filter(c => c !== command)].slice(0, 5));
        toast.success("Dashboard updated by AI");
        setInstruction("");
      } else {
        toast.error("AI returned unexpected format");
      }
    } catch (err) {
      console.error("AI edit error:", err);
      toast.error("Failed to apply AI edit");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
        <Sparkles className="h-4 w-4 text-primary shrink-0" />
        <Input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder="Describe changes... e.g. 'make KPI cards smaller', 'add a moving average line'"
          className="h-8 text-sm border-none bg-transparent focus-visible:ring-0"
          onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleApply()}
          disabled={isProcessing}
        />
        <Button
          size="sm"
          onClick={() => handleApply()}
          disabled={isProcessing || !instruction.trim() || tiles.length === 0}
          className="shrink-0 gap-1"
        >
          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          Apply
        </Button>
      </div>

      {/* Suggested commands */}
      <div className="flex flex-wrap gap-1.5">
        {SUGGESTED_COMMANDS.map((cmd) => (
          <Badge
            key={cmd}
            variant="outline"
            className="cursor-pointer hover:bg-primary/10 hover:border-primary/40 transition-colors text-[10px] px-2 py-0.5"
            onClick={() => !isProcessing && handleApply(cmd)}
          >
            {cmd}
          </Badge>
        ))}
      </div>

      {/* Command history */}
      {commandHistory.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <RotateCcw className="h-3 w-3 text-muted-foreground shrink-0" />
          {commandHistory.map((cmd, i) => (
            <Badge
              key={`${cmd}-${i}`}
              variant="secondary"
              className="cursor-pointer hover:bg-primary/10 text-[10px] px-2 py-0.5"
              onClick={() => { setInstruction(cmd); }}
            >
              {cmd.length > 30 ? cmd.slice(0, 30) + "â€¦" : cmd}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};

export default AIDashboardEditor;
