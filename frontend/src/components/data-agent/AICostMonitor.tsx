import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingDown, Zap, Database, RefreshCw } from "lucide-react";
import { backend } from "@/platform";

interface CostEntry {
  action: string;
  model_used: string;
  tier: string;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  credit_cost: number;
  cached: boolean;
  latency_ms: number | null;
  created_at: string;
}

interface CostSummary {
  totalRequests: number;
  totalCredits: number;
  cacheHits: number;
  avgLatency: number;
  byTier: Record<string, { count: number; credits: number }>;
  byAction: Record<string, { count: number; credits: number }>;
  totalTokens: number;
  estimatedSavings: number;
}

const AICostMonitor = () => {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [recentLogs, setRecentLogs] = useState<CostEntry[]>([]);

  const fetchCostData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await backend
        .from("credit_transactions")
        .select("action, amount, feature, created_at")
        .order("created_at", { ascending: false })
        .limit(200);

      if (error) throw error;
      const logs: CostEntry[] = ((data || []) as unknown as Array<Record<string, unknown>>).map(d => ({
        action: String(d.action ?? ""),
        model_used: "",
        tier: "FLASH",
        prompt_tokens: 0,
        completion_tokens: 0,
        credit_cost: Number(d.amount ?? 0),
        cached: false,
        latency_ms: 0,
        created_at: String(d.created_at ?? ""),
      }));
      setRecentLogs(logs.slice(0, 10));

      const totalRequests = logs.length;
      const totalCredits = logs.reduce((s, l) => s + l.credit_cost, 0);
      const cacheHits = logs.filter((l) => l.cached).length;
      const latencies = logs.filter((l) => l.latency_ms).map((l) => l.latency_ms!);
      const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0;

      const byTier: CostSummary["byTier"] = {};
      const byAction: CostSummary["byAction"] = {};
      let totalTokens = 0;

      for (const log of logs) {
        const t = log.tier || "UNKNOWN";
        if (!byTier[t]) byTier[t] = { count: 0, credits: 0 };
        byTier[t].count++;
        byTier[t].credits += log.credit_cost;

        const a = log.action;
        if (!byAction[a]) byAction[a] = { count: 0, credits: 0 };
        byAction[a].count++;
        byAction[a].credits += log.credit_cost;

        totalTokens += (log.prompt_tokens || 0) + (log.completion_tokens || 0);
      }

      // Estimate savings: if all requests used Pro (2 credits), how much would it cost?
      const worstCaseCost = totalRequests * 2;
      const estimatedSavings = worstCaseCost > 0 ? Math.round(((worstCaseCost - totalCredits) / worstCaseCost) * 100) : 0;

      setSummary({ totalRequests, totalCredits, cacheHits, avgLatency, byTier, byAction, totalTokens, estimatedSavings });
    } catch (err) {
      console.error("Failed to fetch cost data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCostData();
  }, []);

  const tierColor = (tier: string) => {
    if (tier === "PRO") return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    if (tier === "FLASH") return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    return "bg-green-500/15 text-green-400 border-green-500/30";
  };

  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-primary" />
            AI Cost Monitor
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchCostData} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!summary ? (
          <p className="text-sm text-muted-foreground">No cost data available yet. AI requests will be logged here.</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  <span className="text-[10px] text-muted-foreground uppercase">Credits Used</span>
                </div>
                <span className="text-lg font-bold text-foreground">{summary.totalCredits}</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Database className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-[10px] text-muted-foreground uppercase">Cache Hits</span>
                </div>
                <span className="text-lg font-bold text-foreground">{summary.cacheHits}</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-[10px] text-muted-foreground uppercase">Est. Savings</span>
                </div>
                <span className="text-lg font-bold text-green-500">{summary.estimatedSavings}%</span>
              </div>
              <div className="p-3 rounded-lg border border-border/50 bg-muted/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Activity className="w-3.5 h-3.5 text-purple-500" />
                  <span className="text-[10px] text-muted-foreground uppercase">Avg Latency</span>
                </div>
                <span className="text-lg font-bold text-foreground">{summary.avgLatency}ms</span>
              </div>
            </div>

            {/* Tier breakdown */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">By Tier</h4>
              <div className="flex flex-wrap gap-2">
                {Object.entries(summary.byTier).map(([tier, stats]) => (
                  <Badge key={tier} variant="outline" className={tierColor(tier)}>
                    {tier}: {stats.count} calls, {stats.credits} credits
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recent requests */}
            {recentLogs.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Recent Requests</h4>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {recentLogs.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-[11px] py-1 px-2 rounded bg-muted/20">
                      <span className="font-mono text-foreground">{log.action}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-[9px] py-0 ${tierColor(log.tier)}`}>
                          {log.tier}
                        </Badge>
                        {log.cached && <Badge variant="outline" className="text-[9px] py-0 bg-green-500/15 text-green-400">CACHED</Badge>}
                        <span className="text-muted-foreground">{log.credit_cost}cr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Total tokens */}
            <p className="text-[10px] text-muted-foreground">
              Total: {summary.totalRequests} requests, {summary.totalTokens.toLocaleString()} tokens, {summary.totalCredits} credits
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AICostMonitor;
