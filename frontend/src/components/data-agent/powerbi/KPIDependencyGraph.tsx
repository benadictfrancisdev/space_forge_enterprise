import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { GitBranch, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { backend } from "@/platform";
import { toast } from "sonner";

interface KPINode {
  name: string;
  impact: number;
  children?: KPINode[];
  description?: string;
}

interface KPIDependencyGraphProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

const TreeNode = ({ node, depth = 0 }: { node: KPINode; depth?: number }) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = node.children && node.children.length > 0;

  const impactColor = node.impact > 0.7 ? "text-emerald-600" : node.impact > 0.4 ? "text-amber-600" : "text-muted-foreground";
  const barWidth = Math.max(node.impact * 100, 10);

  return (
    <div className="ml-4 first:ml-0">
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          expanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        ) : (
          <div className="w-3.5 h-3.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium truncate">{node.name}</span>
            <Badge variant="outline" className={`text-[10px] ${impactColor} shrink-0`}>
              {(node.impact * 100).toFixed(0)}%
            </Badge>
          </div>
          {node.description && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{node.description}</p>
          )}
          <div className="mt-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary/60 transition-all"
              style={{ width: `${barWidth}%` }}
            />
          </div>
        </div>
      </div>
      {expanded && hasChildren && (
        <div className="border-l border-border/50 ml-4 mt-0.5">
          {node.children!.map((child, i) => (
            <TreeNode key={`${child.name}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const KPIDependencyGraph = ({ data, columns, datasetName }: KPIDependencyGraphProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [graph, setGraph] = useState<KPINode[] | null>(null);
  const [summary, setSummary] = useState("");

  const handleGenerate = async () => {
    setIsLoading(true);
    try {
      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'kpi_dependency',
          data: data.slice(0, 200),
          columns,
          datasetName,
        }
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      if (result?.graph) {
        setGraph(result.graph);
        setSummary(result.summary || "");
      } else {
        toast.error("Unexpected response format");
      }
    } catch (err) {
      console.error("KPI dependency error:", err);
      toast.error("Failed to generate KPI dependency graph");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (o && !graph) handleGenerate(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <GitBranch className="h-4 w-4" />
          <span className="hidden sm:inline">KPI Graph</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-primary" />
            KPI Dependency Graph
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2 text-sm text-muted-foreground">Analyzing KPI relationships...</span>
          </div>
        )}

        {!isLoading && graph && (
          <div className="space-y-3">
            {summary && (
              <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded-md">{summary}</p>
            )}
            <div className="space-y-1">
              {graph.map((node, i) => (
                <TreeNode key={`${node.name}-${i}`} node={node} />
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KPIDependencyGraph;
