import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Brain, Trash2, Clock, Tag, RefreshCw } from "lucide-react";
import { useDataMemory } from "@/hooks/useDataMemory";
import { backend } from "@/platform";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props {
  datasetName: string;
}

const importanceColors: Record<string, string> = {
  high: "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  medium: "bg-primary/20 text-primary",
  low: "bg-muted text-muted-foreground",
};

const MemoryContextPanel = ({ datasetName }: Props) => {
  const { memories, loading, fetchMemories } = useDataMemory(datasetName);

  const deleteMemory = async (id: string) => {
    try {
      await backend.from("business_context_memory").delete().eq("id", id);
      await fetchMemories();
      toast.success("Memory entry removed");
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-primary" />
                Data Memory
              </CardTitle>
              <CardDescription>
                SpaceForge remembers your analyses across sessions â€” building a Data Brain for your organization
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMemories} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {memories.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-muted-foreground">
            <Brain className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No memories yet. Run analyses and SpaceForge will remember insights, decisions, and patterns.</p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {memories.map((m) => (
              <Card key={m.id}>
                <CardContent className="pt-3 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{m.contextType}</Badge>
                        <Badge className={`text-[10px] ${importanceColors[m.importance]}`}>{m.importance}</Badge>
                        {m.datasetName && <Badge variant="secondary" className="text-[10px]">{m.datasetName}</Badge>}
                      </div>
                      <h4 className="text-sm font-medium">{m.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {JSON.stringify(m.content).slice(0, 150)}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true })}
                        </span>
                        {m.tags.length > 0 && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Tag className="w-3 h-3" /> {m.tags.join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteMemory(m.id)} className="text-muted-foreground hover:text-destructive">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};

export default MemoryContextPanel;
