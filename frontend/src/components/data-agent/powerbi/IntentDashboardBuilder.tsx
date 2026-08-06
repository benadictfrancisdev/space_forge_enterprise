import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TrendingUp, Users, DollarSign, Settings2, Brain, Loader2, Target } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import type { DashboardTile } from "./DraggableTile";
import { POWER_BI_COLORS } from "./DraggableTile";

interface IntentDashboardBuilderProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  cognitiveMode?: string;
  onTilesGenerated: (tiles: DashboardTile[]) => void;
}

const INTENTS = [
  { id: "revenue_growth", label: "Revenue Growth", icon: TrendingUp, description: "Optimize revenue, conversion, and pricing", color: "from-emerald-500 to-green-600" },
  { id: "retention", label: "Retention", icon: Users, description: "Reduce churn, improve engagement and loyalty", color: "from-blue-500 to-indigo-600" },
  { id: "cost_reduction", label: "Cost Reduction", icon: DollarSign, description: "Cut expenses, improve efficiency", color: "from-amber-500 to-orange-600" },
  { id: "operational_efficiency", label: "Operations", icon: Settings2, description: "Streamline processes, reduce bottlenecks", color: "from-cyan-500 to-teal-600" },
  { id: "model_performance", label: "Model Performance", icon: Brain, description: "Track accuracy, precision, and model health", color: "from-purple-500 to-pink-600" },
];

const IntentDashboardBuilder = ({ data, columns, datasetName, cognitiveMode, onTilesGenerated }: IntentDashboardBuilderProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async (intentId: string) => {
    setSelectedIntent(intentId);
    setIsGenerating(true);

    try {
      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'intent_dashboard',
          intent: intentId,
          cognitiveMode: cognitiveMode || 'analyst',
          data: data.slice(0, 200),
          columns,
          datasetName,
        }
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      if (result?.tiles && Array.isArray(result.tiles)) {
        const tiles: DashboardTile[] = result.tiles.map((t: any, i: number) => ({
          id: `intent-${t.type}-${i}-${Date.now()}`,
          type: t.type || "kpi",
          title: t.title || "Tile",
          size: t.size || "medium",
          data: t.data,
          value: t.config?.value ?? t.value,
          change: t.config?.change ?? t.change,
          color: POWER_BI_COLORS[i % POWER_BI_COLORS.length],
          aiInsight: t.insight,
          config: t.config,
          column: t.column,
          xAxis: t.xAxis,
          yAxis: t.yAxis,
        }));
        onTilesGenerated(tiles);
        setIsOpen(false);
        toast.success(`Generated ${tiles.length} tiles optimized for ${INTENTS.find(i => i.id === intentId)?.label}`);
      } else {
        toast.error("AI returned unexpected format");
      }
    } catch (err) {
      console.error("Intent dashboard error:", err);
      toast.error("Failed to generate intent-based dashboard");
    } finally {
      setIsGenerating(false);
      setSelectedIntent(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <Target className="h-4 w-4" />
          <span className="hidden sm:inline">Intent Build</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            What outcome are you optimizing?
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {INTENTS.map((intent) => (
            <Card
              key={intent.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedIntent === intent.id ? "ring-2 ring-primary" : ""
              }`}
              onClick={() => !isGenerating && handleGenerate(intent.id)}
            >
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${intent.color} text-white`}>
                  <intent.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{intent.label}</p>
                  <p className="text-xs text-muted-foreground">{intent.description}</p>
                </div>
                {isGenerating && selectedIntent === intent.id && (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                )}
                {cognitiveMode && (
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {cognitiveMode}
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IntentDashboardBuilder;
