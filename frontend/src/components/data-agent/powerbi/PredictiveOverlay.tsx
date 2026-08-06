import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Loader2 } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import type { DashboardTile } from "./DraggableTile";

interface PredictiveOverlayProps {
  tiles: DashboardTile[];
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  onTilesUpdate: (tiles: DashboardTile[]) => void;
}

const PredictiveOverlay = ({ tiles, data, columns, datasetName, onTilesUpdate }: PredictiveOverlayProps) => {
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const togglePredictions = useCallback(async () => {
    if (isActive) {
      // Remove prediction badges
      const cleaned = tiles.map(t => {
        const { config, ...rest } = t;
        const newConfig = config ? { ...config } : {};
        delete newConfig.forecast;
        return { ...rest, config: Object.keys(newConfig).length ? newConfig : undefined };
      });
      onTilesUpdate(cleaned);
      setIsActive(false);
      toast.success("Predictions hidden");
      return;
    }

    setIsLoading(true);
    try {
      // Get forecasts for KPI tiles
      const kpiTiles = tiles.filter(t => t.type === "kpi" && t.column);
      const forecasts: Record<string, any> = {};

      for (const tile of kpiTiles.slice(0, 6)) {
        try {
          const { data: result } = await backend.functions.invoke('data-agent', {
            body: {
              action: 'forecast',
              data: data.slice(0, 200),
              columns,
              datasetName,
              query: tile.column,
            }
          });
          if (result?.forecasted_values) {
            forecasts[tile.id] = {
              forecast30: result.forecasted_values[0]?.value,
              trend: result.trend_direction,
              change: result.forecast_change_pct,
            };
          }
        } catch {
          // Skip individual forecast failures
        }
      }

      const updated = tiles.map(t => {
        if (forecasts[t.id]) {
          return {
            ...t,
            config: { ...t.config, forecast: forecasts[t.id] },
          };
        }
        return t;
      });

      onTilesUpdate(updated);
      setIsActive(true);
      toast.success(`Added predictions to ${Object.keys(forecasts).length} tiles`);
    } catch (err) {
      console.error("Prediction error:", err);
      toast.error("Failed to generate predictions");
    } finally {
      setIsLoading(false);
    }
  }, [isActive, tiles, data, columns, datasetName, onTilesUpdate]);

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="sm"
      onClick={togglePredictions}
      disabled={isLoading || tiles.length === 0}
      className={`gap-1.5 shrink-0 ${isActive ? "bg-gradient-to-r from-violet-500 to-purple-600" : ""}`}
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
      <span className="hidden sm:inline">{isActive ? "Hide Predictions" : "Predictions"}</span>
    </Button>
  );
};

export default PredictiveOverlay;
