import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Palette, 
  BarChart3,
  TrendingUp,
  Target,
  Lightbulb,
  Loader2,
  Server
} from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/platform";
import { cleanMarkdown } from "@/lib/cleanMarkdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface VisualizationAIChatProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onChartSuggestion?: (suggestion: { type: string; xAxis: string; yAxis: string }) => void;
}

const CHAT_COLORS = [
  { name: "Cyan", value: "from-cyan-500 to-blue-500", bg: "bg-cyan-500/10", text: "text-cyan-500" },
  { name: "Purple", value: "from-purple-500 to-pink-500", bg: "bg-purple-500/10", text: "text-purple-500" },
  { name: "Green", value: "from-green-500 to-emerald-500", bg: "bg-green-500/10", text: "text-green-500" },
  { name: "Orange", value: "from-orange-500 to-red-500", bg: "bg-orange-500/10", text: "text-orange-500" },
  { name: "Blue", value: "from-blue-500 to-indigo-500", bg: "bg-blue-500/10", text: "text-blue-500" },
];

const VisualizationAIChat = ({ data, columns, columnTypes, datasetName, onChartSuggestion }: VisualizationAIChatProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `Hi! I'm your AI visualization assistant. I can help you understand your "${datasetName}" dataset and suggest the best visualizations. Ask me anything about your data patterns, trends, or which charts would work best!`,
      timestamp: new Date(),
      suggestions: [
        "What are the key insights in my data?",
        "Suggest the best chart for my data",
        "What trends can you identify?",
        "How should I visualize correlations?"
      ]
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedColor, setSelectedColor] = useState(CHAT_COLORS[0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const getDataSummary = () => {
    const numericCols = columns.filter(c => columnTypes[c] === "numeric");
    const categoricalCols = columns.filter(c => columnTypes[c] === "categorical");
    
    const stats = numericCols.map(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      return { column: col, avg: avg.toFixed(2), min: Math.min(...values).toFixed(2), max: Math.max(...values).toFixed(2) };
    });

    return `Dataset: ${datasetName}
Rows: ${data.length}, Columns: ${columns.length}
Numeric columns: ${numericCols.join(", ") || "None"}
Categorical columns: ${categoricalCols.join(", ") || "None"}
Sample stats: ${stats.slice(0, 3).map(s => `${s.column}(avg:${s.avg})`).join(", ")}`;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: "user",
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const conversationHistory = messages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Use edge function for AI query
      const { data: responseData, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'query',
          data: data.slice(0, 500),
          columns,
          query: input.trim(),
          conversationHistory
        }
      });

      if (error) throw new Error(error.message || "Failed to get AI response");
      if (!responseData?.success) throw new Error(responseData?.error || "Failed to get AI response");

      // Clean markdown from response
      let answerText = responseData.answer || "I analyzed your data and here are my insights...";
      answerText = answerText.replace(/\*\*/g, '');
      answerText = answerText.replace(/\*/g, '');
      answerText = answerText.replace(/#{1,6}\s*/g, '');
      answerText = answerText.replace(/`{1,3}/g, '');
      answerText = answerText.replace(/__/g, '');
      answerText = answerText.replace(/\n{3,}/g, '\n\n');
      answerText = answerText.trim();

      const assistantMessage: Message = {
        role: "assistant",
        content: answerText,
        timestamp: new Date(),
        suggestions: (responseData.suggested_charts || []).map((c: any) => `Create a ${c.type} chart`)
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Handle chart suggestions if available
      if (responseData.suggested_charts?.length && onChartSuggestion) {
        const chartType = responseData.suggested_charts[0].type;
        const numericCols = columns.filter(c => columnTypes[c] === "numeric");
        const categoricalCols = columns.filter(c => columnTypes[c] === "categorical");
        
        onChartSuggestion({
          type: chartType,
          xAxis: categoricalCols[0] || columns[0],
          yAxis: numericCols[0] || columns[1] || columns[0]
        });
      }

    } catch (error) {
      console.error('Chat error:', error);
      toast.error("Failed to get AI response");
      setMessages(prev => [...prev, {
        role: "assistant",
        content: "I apologize, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[500px] flex flex-col bg-gradient-to-br from-background to-muted/20 border-border/50">
      <CardHeader className="pb-3 flex-shrink-0 border-b border-border/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-r ${selectedColor.value}`}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            Visualization AI Assistant
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <BarChart3 className="h-3 w-3 mr-1" />
              {columns.length} fields
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Palette className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-2" align="end">
                <div className="flex gap-2">
                  {CHAT_COLORS.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => setSelectedColor(color)}
                      className={`w-6 h-6 rounded-full bg-gradient-to-r ${color.value} ring-2 ring-offset-2 ring-offset-background transition-all ${
                        selectedColor.name === color.name ? "ring-primary" : "ring-transparent hover:ring-muted-foreground"
                      }`}
                      title={color.name}
                    />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === "user" 
                  ? `bg-gradient-to-r ${selectedColor.value}` 
                  : "bg-muted"
              }`}>
                {message.role === "user" ? (
                  <User className="h-4 w-4 text-white" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
              </div>
              <div className={`flex-1 space-y-2 ${message.role === "user" ? "text-right" : ""}`}>
                <div className={`inline-block p-3 rounded-xl max-w-[85%] ${
                  message.role === "user"
                    ? `bg-gradient-to-r ${selectedColor.value} text-white`
                    : "bg-muted"
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{cleanMarkdown(message.content)}</p>
                </div>
                {message.suggestions && message.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.suggestions.map((suggestion, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        className="text-xs h-7 hover:bg-primary/10 hover:border-primary/50"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="inline-block p-3 rounded-xl bg-muted">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing your data...</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border/50 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your data visualizations..."
            className="min-h-[44px] max-h-[120px] resize-none bg-background"
            rows={1}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!input.trim() || isLoading}
            className={`bg-gradient-to-r ${selectedColor.value} hover:opacity-90`}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Lightbulb className="h-3 w-3" />
            Ask for chart recommendations
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Explore data patterns
          </span>
          <span className="flex items-center gap-1">
            <Target className="h-3 w-3" />
            Get actionable insights
          </span>
        </div>
      </div>
    </Card>
  );
};

export default VisualizationAIChat;
