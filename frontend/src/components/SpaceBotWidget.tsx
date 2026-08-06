import { backend } from "@/platform";
import { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Brain,
  X,
  Send,
  Loader2,
  MessageSquare,
  Sparkles,
  Trash2,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface DataContext {
  datasetName?: string;
  columns?: string[];
  rowCount?: number;
  sampleData?: Record<string, unknown>[];
}

const SpaceBotWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Try to load data context from sessionStorage (set by DataAgent page)
  const getDataContext = (): DataContext | null => {
    try {
      const ctx = sessionStorage.getItem("spacebot-data-context");
      return ctx ? JSON.parse(ctx) : null;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = useCallback(
    async (userMessages: { role: string; content: string }[]) => {
      const dataContext = getDataContext();
      const { data, error } = await backend.functions.invoke("spacebot", {
        body: { messages: userMessages, dataContext },
      });

      if (error) {
        toast.error("SpaceBot is temporarily unavailable.");
        return;
      }

      const content =
        typeof data === "object" && data && "content" in (data as object)
          ? String((data as { content?: string }).content ?? "")
          : typeof data === "string"
            ? data
            : JSON.stringify(data ?? "");

      if (!content) {
        toast.error("SpaceBot is temporarily unavailable.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content,
          timestamp: new Date(),
        },
      ]);
    },
    []
  );

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    const history = [...messages, userMsg].map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      await streamChat(history);
    } catch (err) {
      console.error("SpaceBot error:", err);
      toast.error("Failed to get response from SpaceBot.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/25 flex items-center justify-center hover:scale-110 transition-transform duration-200 group"
        aria-label="Open SpaceBot"
      >
        <Brain className="w-6 h-6 group-hover:hidden" />
        <MessageSquare className="w-6 h-6 hidden group-hover:block" />
      </button>
    );
  }

  const widgetSize = isExpanded
    ? "fixed inset-4 sm:inset-8 z-50"
    : "fixed bottom-6 right-6 z-50 w-[380px] h-[560px] max-h-[80vh]";

  return (
    <div className={`${widgetSize} rounded-2xl border border-border bg-background shadow-2xl shadow-black/20 flex flex-col overflow-hidden`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">SpaceBot</h3>
            <p className="text-[10px] text-muted-foreground">AI Data Assistant</p>
          </div>
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse ml-1" />
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={clearChat} title="Clear chat">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsOpen(false)}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef as any}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <h4 className="text-base font-semibold text-foreground mb-2">Hey! I'm SpaceBot</h4>
            <p className="text-sm text-muted-foreground mb-6 max-w-[260px]">
              Ask me anything about your data. I can analyze trends, find anomalies, and suggest automated actions.
            </p>
            <div className="space-y-2 w-full max-w-[280px]">
              {[
                "What's my best-selling product?",
                "Show me revenue trends",
                "Find anomalies in my data",
                "Compare last two quarters",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => {
                    setInput(q);
                    setTimeout(() => textareaRef.current?.focus(), 50);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg border border-border bg-card/50 text-xs text-muted-foreground hover:border-primary/30 hover:text-foreground transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted border border-border rounded-bl-sm"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Brain className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-medium text-primary">SpaceBot</span>
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                  {msg.role === "assistant" && !msg.content && isLoading && (
                    <div className="flex items-center gap-1.5 py-1">
                      <Loader2 className="w-3 h-3 animate-spin text-primary" />
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="px-3 py-3 border-t border-border bg-card">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask SpaceBot anything..."
            className="min-h-[40px] max-h-[100px] resize-none text-sm rounded-xl border-border bg-background"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground flex-shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SpaceBotWidget;
