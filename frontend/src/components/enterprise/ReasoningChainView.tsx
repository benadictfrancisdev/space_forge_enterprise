import { CheckCircle2, Circle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ReasoningChainStage } from "@/platform/track13/contracts";

export function ReasoningChainView({
  stages,
}: {
  stages: ReasoningChainStage[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reasoning Chain</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {stages.map((stage, i) => (
            <li key={stage.id} className="flex items-start gap-3 text-sm">
              {stage.status === "complete" ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{stage.label}</span>
                {i < stages.length - 1 && (
                  <div className="h-3 w-px bg-border ml-2 mt-1" />
                )}
              </div>
              <Badge variant="outline" className="text-[10px] shrink-0">{stage.status}</Badge>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
