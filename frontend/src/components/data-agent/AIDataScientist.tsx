import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Loader2, Send, Bot, User, Sparkles, Shield, Target, TrendingUp, BarChart3, AlertTriangle, Lightbulb } from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useFeatureHistory } from "@/hooks/useFeatureHistory";

interface Props {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agentResult?: AgentResult;
  timestamp: Date;
}

interface AgentResult {
  agent_action: string;
  title: string;
  confidence: number;
  assumptions: string[];
  business_explanation: string;
  technical_detail: string;
  results: Record<string, unknown>;
  next_steps: string[];
  suggested_followups: string[];
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
  predict: <Target className="w-4 h-4" />,
  forecast: <TrendingUp className="w-4 h-4" />,
  analyze: <BarChart3 className="w-4 h-4" />,
  clean: <Shield className="w-4 h-4" />,
  root_cause: <AlertTriangle className="w-4 h-4" />,
  chart: <BarChart3 className="w-4 h-4" />,
  general: <Lightbulb className="w-4 h-4" />,
};

const EXAMPLE_PROMPTS = [
  "Predict next month's sales",
  "Find the drivers behind customer churn",
  "Build a demand forecasting model",
  "Check data quality and clean issues",
  "What are the strongest correlations?",
  "Run a statistical analysis on revenue",
];

const ConfidenceMeter = ({ value }: { value: number }) => {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "text-green-500" : pct >= 60 ? "text-amber-500" : "text-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${color}`}>{pct}%</span>
    </div>
  );
};

const AIDataScientist = ({ data, columns, columnTypes, datasetName }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, Set<string>>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const history = useFeatureHistory("ai_scientist", datasetName);
  const hydrated = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore conversation on mount
  useEffect(() => {
    if (hydrated.current) return;
    if (history.loading) return;
    const saved = history.latest?.output as { messages?: Message[] } | undefined;
    if (saved?.messages?.length) {
      const restored = saved.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
      setMessages(restored);
    }
    hydrated.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.loading, history.latest?.id]);

  // Debounced auto-save
  useEffect(() => {
    if (!hydrated.current) return;
    if (messages.length === 0) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      history.save({ messages }, { count: messages.length }).catch(() => {});
    }, 1500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const toggleSection = (msgId: string, section: string) => {
    setExpandedSections(prev => {
      const msgSections = new Set(prev[msgId] || []);
      if (msgSections.has(section)) msgSections.delete(section);
      else msgSections.add(section);
      return { ...prev, [msgId]: msgSections };
    });
  };

  const isSectionExpanded = (msgId: string, section: string) => {
    return expandedSections[msgId]?.has(section) || false;
  };

  const sendMessage = useCallback(async (text?: string) => {
    const query = (text || input).trim();
    if (!query || loading) return;
    setInput("");

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.role === "assistant" && m.agentResult
          ? `[${m.agentResult.title}] ${m.agentResult.business_explanation}`
          : m.content,
      }));

      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "data_scientist_agent",
          data: data.slice(0, 200),
          columns,
          columnTypes,
          datasetName,
          userId: user?.id,
          query,
          conversationHistory: conversationHistory.slice(-10),
        },
      });

      if (error) throw error;
      if (res?.error) throw new Error(typeof res.error === "string" ? res.error : "AI service error");

      const agentResult = res as AgentResult;
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: agentResult.business_explanation || (res as any).raw_response || "Analysis complete.",
        agentResult,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      toast.error(err.message || "Analysis failed");
      const errorMsg: Message = {
        id: `e-${Date.now()}`,
        role: "assistant",
        content: `I encountered an error: ${err.message}. Please try rephrasing your request.`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, data, columns, columnTypes, datasetName, user?.id]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const renderFeatureImportance = (features: any[]) => {
    if (!features?.length) return null;
    return (
      <div className="space-y-1.5 mt-2">
        {features.slice(0, 8).map((f: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground w-28 truncate">{f.feature}</span>
            <div className="flex-1 bg-secondary rounded-full h-1.5">
              <div className="bg-primary rounded-full h-1.5 transition-all" style={{ width: `${(f.importance || 0) * 100}%` }} />
            </div>
            <span className="text-[10px] text-foreground w-10 text-right">{((f.importance || 0) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </div>
    );
  };

  const renderMetrics = (metrics: Record<string, unknown>) => {
    if (!metrics) return null;
    const entries = Object.entries(metrics).filter(([, v]) => v !== null && v !== undefined);
    if (!entries.length) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
        {entries.map(([key, val]) => (
          <div key={key} className="p-2 rounded-md bg-secondary/40">
            <p className="text-[10px] text-muted-foreground uppercase">{key.replace(/_/g, " ")}</p>
            <p className="text-sm font-bold text-foreground">
              {typeof val === "number" ? (val < 1 ? `${(val * 100).toFixed(1)}%` : val.toFixed(2)) : String(val)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderAgentResult = (msg: Message) => {
    const r = msg.agentResult;
    if (!r) return null;

    return (
      <div className="space-y-3 mt-3">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-[10px] gap-1">
            {ACTION_ICONS[r.agent_action] || <Sparkles className="w-3 h-3" />}
            {r.agent_action}
          </Badge>
          <Badge variant="secondary" className="text-[10px]">{r.title}</Badge>
        </div>

        {/* Confidence */}
        <div>
          <p className="text-[10px] text-muted-foreground mb-1">Model Confidence</p>
          <ConfidenceMeter value={r.confidence} />
        </div>

        {/* Business Explanation */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
          <p className="text-[10px] font-semibold text-primary mb-1">Business Summary</p>
          <p className="text-sm text-foreground leading-relaxed">{r.business_explanation}</p>
        </div>

        {/* Assumptions */}
        {r.assumptions?.length > 0 && (
          <div>
            <button
              onClick={() => toggleSection(msg.id, "assumptions")}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Shield className="w-3 h-3" />
              Assumptions ({r.assumptions.length})
              <span className="text-[9px]">{isSectionExpanded(msg.id, "assumptions") ? "â–¼" : "â–¶"}</span>
            </button>
            {isSectionExpanded(msg.id, "assumptions") && (
              <ul className="mt-1 space-y-0.5">
                {r.assumptions.map((a, i) => (
                  <li key={i} className="text-[11px] text-muted-foreground pl-4">â€¢ {a}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Results â€” metrics, feature importance, etc. */}
        {r.results && (
          <>
            {r.results.metrics && renderMetrics(r.results.metrics as Record<string, unknown>)}
            {r.results.feature_importance && (
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">Feature Importance</p>
                {renderFeatureImportance(r.results.feature_importance as any[])}
              </div>
            )}
            {r.results.quality_score !== undefined && (
              <div className="flex items-center gap-2">
                <p className="text-[10px] text-muted-foreground">Data Quality Score:</p>
                <Badge variant={Number(r.results.quality_score) >= 80 ? "default" : "destructive"}>
                  {String(r.results.quality_score)}/100
                </Badge>
              </div>
            )}
            {Array.isArray(r.results.issues_found) && r.results.issues_found.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground">Issues Found</p>
                {(r.results.issues_found as any[]).slice(0, 5).map((issue: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[11px] p-1.5 rounded bg-destructive/5">
                    <AlertTriangle className="w-3 h-3 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <span className="font-medium text-foreground">{issue.column}</span>
                      <span className="text-muted-foreground"> â€” {issue.type}: {issue.count} rows. </span>
                      <span className="text-primary">{issue.recommendation}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(r.results.drivers) && r.results.drivers.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-semibold text-muted-foreground">Key Drivers</p>
                {(r.results.drivers as any[]).map((d: any, i: number) => (
                  <div key={i} className="p-2 rounded bg-secondary/30 text-[11px]">
                    <span className="font-medium text-foreground">{d.factor}</span>
                    <span className="text-muted-foreground"> ({d.direction}, {((d.contribution || 0) * 100).toFixed(0)}% contribution)</span>
                    <p className="text-muted-foreground mt-0.5">{d.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Technical Detail */}
        {r.technical_detail && (
          <div>
            <button
              onClick={() => toggleSection(msg.id, "technical")}
              className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <BarChart3 className="w-3 h-3" />
              Technical Detail
              <span className="text-[9px]">{isSectionExpanded(msg.id, "technical") ? "â–¼" : "â–¶"}</span>
            </button>
            {isSectionExpanded(msg.id, "technical") && (
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed whitespace-pre-line">{r.technical_detail}</p>
            )}
          </div>
        )}

        {/* Next Steps */}
        {r.next_steps?.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground mb-1">Recommended Next Steps</p>
            <ul className="space-y-0.5">
              {r.next_steps.map((s, i) => (
                <li key={i} className="text-[11px] text-foreground pl-3">â†’ {s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Follow-ups */}
        {r.suggested_followups?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {r.suggested_followups.map((q, i) => (
              <button
                key={i}
                onClick={() => sendMessage(q)}
                className="text-[10px] px-2 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="w-5 h-5 text-primary" />
            AI Data Scientist
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Ask me anything about your data in plain English. I'll clean, model, forecast, and explain.
          </p>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages Area */}
          <div ref={scrollRef} className="h-[500px] overflow-y-auto px-4 pb-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Bot className="w-10 h-10 text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground mb-1">Hi! I'm your AI Data Scientist.</p>
                <p className="text-xs text-muted-foreground mb-6">
                  Tell me what you want to know about <span className="font-medium text-foreground">{datasetName}</span> ({data.length} rows, {columns.length} columns)
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {EXAMPLE_PROMPTS.map((prompt, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(prompt)}
                      className="text-[11px] text-left p-2.5 rounded-lg border border-border bg-card hover:bg-accent hover:border-primary/20 transition-colors"
                    >
                      <Sparkles className="w-3 h-3 text-primary inline mr-1.5" />
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    {msg.role === "assistant" && (
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-xl p-3 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-card border border-border"}`}>
                      <p className={`text-sm leading-relaxed ${msg.role === "user" ? "" : "text-foreground"}`}>{msg.content}</p>
                      {msg.role === "assistant" && renderAgentResult(msg)}
                    </div>
                    {msg.role === "user" && (
                      <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <div className="bg-card border border-border rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Analyzing your data...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your data scientist... e.g. 'Predict churn drivers'"
                rows={1}
                className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring min-h-[38px] max-h-[120px]"
                style={{ height: "38px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "38px";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <Button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                size="sm"
                className="h-[38px] px-3"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AIDataScientist;
