import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Users, UserCheck, UserPlus, Crown } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";
import FeatureGate from "./FeatureGate";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface Segment {
  name: string;
  size: number;
  percentage: number;
  characteristics: string[];
  avg_value: number;
  discount_sensitivity: string;
}

interface SegmentResult {
  segments: Segment[];
  rules: string[];
  insights: string[];
}

const segmentIcons: Record<string, any> = {
  "New": UserPlus,
  "Returning": UserCheck,
  "Loyal": Crown,
};

const segmentColors: Record<string, string> = {
  "New": "bg-blue-500/10 text-blue-500 border-blue-500/20",
  "Returning": "bg-amber-500/10 text-amber-500 border-amber-500/20",
  "Loyal": "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
};

const BehavioralSegmentation = ({ data, columns, columnTypes, datasetName }: Props) => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SegmentResult | null>(null);

  const runSegmentation = async () => {
    setLoading(true);
    try {
      const sampleData = data.slice(0, 200);
      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "behavioral_segmentation",
          data: sampleData,
          columns,
          datasetName,
        },
      });
      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");
      const parsed = typeof res?.result === "string" ? JSON.parse(res.result) : res?.result;
      if (parsed?.segments) {
        setResult(parsed);
        toast.success(`Identified ${parsed.segments.length} behavioral segments`);
      }
    } catch (e: any) {
      toast.error(e.message || "Segmentation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FeatureGate feature="Behavioral Segmentation" creditCost={3} requiredPlan="pro">
      <div className="space-y-4">
        <Card className="linear-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Behavioral Segmentation
              <Badge variant="outline" className="ml-auto text-[10px]">PRO</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Auto-create New / Returning / Loyal cohorts from purchase frequency with discount behaviour analysis.
            </p>
            <Button size="sm" onClick={runSegmentation} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Segmenting...</> : "Run Segmentation"}
            </Button>
          </CardContent>
        </Card>

        {result && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {result.segments.map((seg, i) => {
                const Icon = segmentIcons[seg.name] || Users;
                const colorClass = segmentColors[seg.name] || "bg-primary/10 text-primary border-primary/20";
                return (
                  <Card key={i} className={`linear-card border ${colorClass.split(" ").pop()}`}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center ${colorClass}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{seg.name}</p>
                          <p className="text-[10px] text-muted-foreground">{seg.size} users ({seg.percentage}%)</p>
                        </div>
                      </div>
                      <div className="space-y-1 pt-2 border-t border-border/30">
                        {seg.characteristics.slice(0, 3).map((c, j) => (
                          <p key={j} className="text-[10px] text-muted-foreground">â€¢ {c}</p>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-muted-foreground">Avg Value</span>
                        <span className="text-xs font-semibold">${seg.avg_value?.toLocaleString()}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] w-full justify-center">
                        Discount: {seg.discount_sensitivity}
                      </Badge>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="linear-card">
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold">Segmentation Rules</p>
                {result.rules.map((r, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground">â€¢ {r}</p>
                ))}
                <p className="text-xs font-semibold pt-2">Key Insights</p>
                {result.insights.map((ins, i) => (
                  <p key={i} className="text-[10px] text-muted-foreground">â€¢ {ins}</p>
                ))}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </FeatureGate>
  );
};

export default BehavioralSegmentation;
