import { useState, useRef, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2, Bot, User, Sparkles } from "lucide-react";
import { backend } from "@/platform";
import { useFeatureHistory } from "@/hooks/useFeatureHistory";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ForecastChatbotProps {
  forecastResult?: Record<string, unknown> | null;
  datasetName: string;
  targetColumn: string;
  columns: string[];
  data?: Record<string, unknown>[];
}

const SUGGESTED_QUESTIONS = [
  "What drives this trend?",
  "When will it peak?",
  "What risks should I watch?",
  "How confident is this forecast?",
];

const ForecastChatbot = ({ forecastResult, datasetName, targetColumn, columns, data = [] }: ForecastChatbotProps) => {
  const { latest: predictHistory } = useFeatureHistory("predict", datasetName);
  const effectiveForecast = useMemo(() => {
    if (forecastResult) return forecastResult;
    const out = predictHistory?.output;
    if (out && typeof out === "object") return out as Record<string, unknown>;
    return null;
  }, [forecastResult, predictHistory]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;
    const userMsg: Message = { role: "user", content: question.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      // Build compact context from existing forecast result â€” no new heavy AI call
      const context = effectiveForecast
        ? `Forecast context for "${targetColumn}" in "${datasetName}":
Trend: ${(effectiveForecast as any).trend?.direction || "unknown"} (${(effectiveForecast as any).trend?.magnitude_percent || 0}%)
Confidence: ${effectiveForecast.confidence_score || 0}%
Summary: ${(effectiveForecast as any).summary || ""}
Seasonality: ${(effectiveForecast as any).seasonality?.detected ? (effectiveForecast as any).seasonality.period : "none"}
Forecasts: ${JSON.stringify(((effectiveForecast as any).forecasts || (effectiveForecast as any).forecast || []).slice(0, 3))}
Anomalies: ${((effectiveForecast as any).anomalies || []).length} detected
Columns: ${columns.join(", ")}`
        : `Dataset: "${datasetName}", Target: "${targetColumn}", Columns: ${columns.join(", ")}. Run Predict first for richer forecast context.`;

      const chatHistory = [...messages, userMsg].slice(-6); // keep last 6 messages for context

      const { data: res, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "chat",
          query: question,
          datasetName,
          columns,
          data: data.slice(0, 100), // sample for context
          additionalContext: context,
          chatHistory: chatHistory.map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const reply = res?.response || res?.answer || res?.explanation || 
                    (typeof res === "string" ? res : "I couldn't generate a response. Please try rephrasing.");

      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      console.error("Forecast chat error:", err);
      toast.error("Chat failed. Please try again.");
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="gap-1.5"
      >
        <MessageCircle className="w-4 h-4" />
        <span className="hidden sm:inline">Ask about forecast</span>
      </Button>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Forecast Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">1 credit/msg</Badge>
            {effectiveForecast ? (
              <Badge variant="outline" className="text-[10px]">Predict context loaded</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] text-amber-600">Run Predict for context</Badge>
            )}
            <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Messages */}
        <div ref={scrollRef} className="max-h-60 overflow-y-auto space-y-2 pr-1">
          {messages.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Ask questions about your forecast results
            </p>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && <Bot className="w-4 h-4 text-primary shrink-0 mt-1" />}
              <div className={`text-xs rounded-lg px-3 py-2 max-w-[85%] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                {msg.content}
              </div>
              {msg.role === "user" && <User className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />}
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <Bot className="w-4 h-4 text-primary shrink-0 mt-1" />
              <div className="bg-muted rounded-lg px-3 py-2">
                <Loader2 className="w-3 h-3 animate-spin" />
              </div>
            </div>
          )}
        </div>

        {/* Suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_QUESTIONS.map((q) => (
              <Button
                key={q}
                variant="outline"
                size="sm"
                className="text-[10px] h-6 px-2"
                onClick={() => sendMessage(q)}
                disabled={loading}
              >
                {q}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about predictions..."
            className="text-xs h-8"
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            disabled={loading}
          />
          <Button size="sm" className="h-8 w-8 p-0" onClick={() => sendMessage(input)} disabled={loading || !input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ForecastChatbot;
