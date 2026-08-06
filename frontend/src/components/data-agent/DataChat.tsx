import { useState, useRef, useEffect, useCallback } from "react";
import { backend } from "@/platform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Bot, User, Loader2, Palette, MessageCircle, 
  Mic, MicOff, Volume2, VolumeX, Sparkles, TrendingUp, 
  BarChart3, PieChart, LineChart, ChevronDown,
  Lightbulb, Frown, Smile, HelpCircle, Zap, Brain, Trash2, 
  Download, Share2, FileDown
} from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useVoiceInput, speakText, stopSpeaking } from "@/hooks/useVoiceInput";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { usePdfExport } from "@/hooks/usePdfExport";
import { useAuth } from "@/hooks/useAuth";
import type { DatasetState } from "@/pages/DataAgent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { cleanMarkdown } from "@/lib/cleanMarkdown";
import type { Json } from "@/platform";
import { PlatformLoadingState } from "@/components/platform/PlatformStates";

interface DataChatProps {
  dataset: DatasetState;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sentiment?: {
    sentiment: string;
    confidence: number;
    tone: string;
  };
  suggestions?: string[];
  chartSuggestion?: {
    type: string;
    xAxis?: string;
    yAxis?: string;
  };
  timestamp: Date;
}

interface Suggestion {
  label: string;
  query: string;
  icon?: React.ReactNode;
}

const CHAT_COLORS = [
  { name: "Default", user: "bg-primary", assistant: "bg-muted/50" },
  { name: "Ocean", user: "bg-blue-600", assistant: "bg-blue-900/30" },
  { name: "Forest", user: "bg-green-600", assistant: "bg-green-900/30" },
  { name: "Sunset", user: "bg-orange-600", assistant: "bg-orange-900/30" },
  { name: "Purple", user: "bg-purple-600", assistant: "bg-purple-900/30" },
  { name: "Rose", user: "bg-pink-600", assistant: "bg-pink-900/30" },
];

const EXPERTISE_LEVELS = [
  { value: 'beginner', label: 'Beginner', description: 'Simple explanations with examples' },
  { value: 'intermediate', label: 'Intermediate', description: 'Standard technical detail' },
  { value: 'expert', label: 'Expert', description: 'Advanced insights, no hand-holding' },
];

const getSentimentIcon = (sentiment: string) => {
  switch (sentiment) {
    case 'positive': return <Smile className="w-3 h-3 text-green-500" />;
    case 'negative': return <Frown className="w-3 h-3 text-red-500" />;
    case 'frustrated': return <Frown className="w-3 h-3 text-orange-500" />;
    case 'curious': return <HelpCircle className="w-3 h-3 text-blue-500" />;
    case 'confused': return <HelpCircle className="w-3 h-3 text-yellow-500" />;
    default: return <MessageCircle className="w-3 h-3 text-muted-foreground" />;
  }
};

const getChartIcon = (type: string) => {
  switch (type) {
    case 'bar': return <BarChart3 className="w-4 h-4" />;
    case 'pie': return <PieChart className="w-4 h-4" />;
    case 'line': return <LineChart className="w-4 h-4" />;
    default: return <TrendingUp className="w-4 h-4" />;
  }
};

const DataChat = ({ dataset }: DataChatProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [selectedColor, setSelectedColor] = useState(CHAT_COLORS[0]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoSuggestions, setAutoSuggestions] = useState<Suggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { preferences, trackInteraction, trackQuery, setExpertiseLevel, updateUIPreferences } = useUserPreferences();
  const { exportChatToPdf, generateShareableLink } = usePdfExport();
  
  const { isListening, isSupported: voiceSupported, startListening, stopListening, transcript } = useVoiceInput({
    onFinalTranscript: (text) => {
      setInput(prev => prev + ' ' + text);
    },
  });

  // Export handlers
  const handleExportPdf = () => {
    if (messages.length === 0) {
      toast.error("No messages to export");
      return;
    }
    exportChatToPdf(messages, dataset.name, `Chat with ${dataset.name}`);
  };

  const handleShareChat = () => {
    if (messages.length === 0) {
      toast.error("No messages to share");
      return;
    }
    generateShareableLink(messages, dataset.name);
  };

  // Load or create session and messages on mount
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!user || !dataset.name) {
        setIsLoadingHistory(false);
        return;
      }

      try {
        // Find existing active session for this dataset
        const { data: existingSession } = await backend
          .from('conversation_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('dataset_name', dataset.name)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingSession) {
          setSessionId(existingSession.id);
          
          // Load messages for this session
          const { data: savedMessages } = await backend
            .from('chat_messages')
            .select('*')
            .eq('session_id', existingSession.id)
            .order('created_at', { ascending: true });

          if (savedMessages && savedMessages.length > 0) {
            const loadedMessages: Message[] = savedMessages.map(m => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
              sentiment: m.sentiment as Message['sentiment'],
              suggestions: m.suggestions || undefined,
              chartSuggestion: m.chart_suggestion as Message['chartSuggestion'],
              timestamp: new Date(m.created_at),
            }));
            setMessages(loadedMessages);
          }
        } else {
          // Create new session
          const { data: newSession } = await backend
            .from('conversation_sessions')
            .insert([{
              user_id: user.id,
              dataset_name: dataset.name,
              title: `Chat with ${dataset.name}`,
            }])
            .select()
            .single();

          if (newSession) {
            setSessionId(newSession.id);
          }
        }
      } catch (error) {
        console.error('Failed to load chat history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadChatHistory();
  }, [user, dataset.name]);

  // Save message to database
  const saveMessage = async (message: Message) => {
    if (!user || !sessionId) return;

    try {
      await backend
        .from('chat_messages')
        .insert([{
          session_id: sessionId,
          user_id: user.id,
          role: message.role,
          content: message.content,
          sentiment: message.sentiment as unknown as Json,
          suggestions: message.suggestions || null,
          chart_suggestion: message.chartSuggestion as unknown as Json,
        }]);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  // Clear chat history
  const clearHistory = async () => {
    if (!sessionId) return;

    try {
      await backend
        .from('chat_messages')
        .delete()
        .eq('session_id', sessionId);

      setMessages([]);
      toast.success('Chat history cleared');
    } catch (error) {
      console.error('Failed to clear history:', error);
      toast.error('Failed to clear history');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Update input when transcript changes
  useEffect(() => {
    if (transcript && isListening) {
      setInput(prev => {
        const words = prev.split(' ').filter(w => w);
        const newWords = transcript.split(' ').filter(w => w);
        return [...words, ...newWords.slice(-1)].join(' ');
      });
    }
  }, [transcript, isListening]);

  // Generate suggestions based on input
   const generateSuggestions = useCallback(async (text: string) => {
    if (text.length < 3 || isLoading) return;
    
    // Local suggestion generation â€” no AI call needed (saves cost)
    const lowerText = text.toLowerCase();
    const cols = dataset.columns;
    const localSuggestions: Suggestion[] = [];

    if (lowerText.includes('trend') || lowerText.includes('over time')) {
      localSuggestions.push({ label: `Show trends in ${cols[0] || 'data'}`, query: `What are the trends in ${cols[0] || 'the data'}?`, icon: <TrendingUp className="w-3 h-3" /> });
    }
    if (lowerText.includes('compar') || lowerText.includes('differ')) {
      localSuggestions.push({ label: `Compare top categories`, query: `Compare the top categories in this data`, icon: <BarChart3 className="w-3 h-3" /> });
    }
    if (lowerText.includes('outl') || lowerText.includes('anomal')) {
      localSuggestions.push({ label: `Find outliers`, query: `Find outliers and anomalies in this dataset`, icon: <Lightbulb className="w-3 h-3" /> });
    }
    // Column-based suggestions
    const matchingCols = cols.filter(c => c.toLowerCase().includes(lowerText));
    matchingCols.slice(0, 2).forEach(col => {
      localSuggestions.push({ label: `Analyze ${col}`, query: `Analyze the ${col} column in detail`, icon: <Sparkles className="w-3 h-3" /> });
    });

    if (localSuggestions.length === 0) {
      localSuggestions.push(
        { label: `Summarize this data`, query: `Give me a summary of this dataset`, icon: <Brain className="w-3 h-3" /> },
        { label: `Show distribution`, query: `Show the distribution of key columns`, icon: <BarChart3 className="w-3 h-3" /> },
      );
    }

    setAutoSuggestions(localSuggestions.slice(0, 5));
    setDidYouMean(null);
    setShowSuggestions(localSuggestions.length > 0);
  }, [dataset, isLoading]);

  // Debounced suggestion generation
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.length >= 3 && preferences.uiPreferences.autoSuggestions) {
        generateSuggestions(input);
      } else {
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [input, generateSuggestions, preferences.uiPreferences.autoSuggestions]);

  // Analyze sentiment
  // Local sentiment detection â€” no AI call needed (saves cost)
  const analyzeSentiment = async (message: string): Promise<any> => {
    const lower = message.toLowerCase();
    const positiveWords = ['great', 'good', 'excellent', 'amazing', 'helpful', 'thanks', 'perfect'];
    const negativeWords = ['bad', 'wrong', 'error', 'fail', 'broken', 'issue', 'problem', 'not working'];
    const questionWords = ['what', 'why', 'how', 'when', 'where', 'which', 'can', 'could', 'would'];
    
    const posCount = positiveWords.filter(w => lower.includes(w)).length;
    const negCount = negativeWords.filter(w => lower.includes(w)).length;
    const isQuestion = questionWords.some(w => lower.startsWith(w)) || message.includes('?');
    
    let sentiment = 'neutral';
    if (posCount > negCount) sentiment = 'positive';
    else if (negCount > posCount) sentiment = 'negative';
    
    return {
      sentiment,
      confidence: 0.7,
      tone: isQuestion ? 'inquisitive' : sentiment === 'positive' ? 'appreciative' : 'analytical',
    };
  };

  // Adapt response based on user context
  // Local response adaptation â€” no AI call needed
  const adaptResponse = async (originalResponse: string, _sentiment: any): Promise<string> => {
    return originalResponse;
  };

  // Get AI chart recommendation
  // Local chart recommendation â€” no AI call needed (saves cost)
  const getChartRecommendation = async () => {
    const numericCols = dataset.columns.filter(col => {
      const sample = dataset.rawData.slice(0, 10).map(row => row[col]);
      return sample.filter(v => !isNaN(Number(v))).length > 7;
    });
    const categoricalCols = dataset.columns.filter(c => !numericCols.includes(c));
    
    let type = 'bar';
    let xAxis = categoricalCols[0] || dataset.columns[0];
    let yAxis = numericCols[0] || dataset.columns[1];
    
    if (numericCols.length >= 2) type = 'scatter';
    if (categoricalCols.length > 0 && numericCols.length === 1) type = 'bar';
    if (dataset.columns.some(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time'))) {
      type = 'line';
      xAxis = dataset.columns.find(c => c.toLowerCase().includes('date') || c.toLowerCase().includes('time')) || xAxis;
    }
    
    return { recommendedChart: { type }, configuration: { xAxis, yAxis } };
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // Track interaction
    trackInteraction('message', input.length);
    if (input.includes('?')) trackInteraction('question');
    trackQuery(input);

    const userSentiment = await analyzeSentiment(input);
    
    const userMessage: Message = { 
      role: "user", 
      content: input,
      sentiment: userSentiment,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    // Save user message to database
    saveMessage(userMessage);
    
    setInput("");
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const dataToChat = dataset.cleanedData || dataset.rawData;
      const { data, error } = await backend.functions.invoke('data-agent', {
        body: { 
          action: 'chat', 
          data: dataToChat.slice(0, 200),
          datasetName: dataset.name,
          question: input,
          conversationHistory: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        }
      });

      if (error) throw error;

      // Adapt response based on user context
      const adaptedContent = await adaptResponse(data.response, userSentiment);
      
      // Get chart recommendation if relevant
      let chartSuggestion = null;
      if (input.toLowerCase().includes('visualiz') || 
          input.toLowerCase().includes('chart') || 
          input.toLowerCase().includes('graph') ||
          input.toLowerCase().includes('show me')) {
        trackInteraction('visualization');
        const chartRec = await getChartRecommendation();
        if (chartRec?.recommendedChart) {
          chartSuggestion = {
            type: chartRec.recommendedChart.type,
            xAxis: chartRec.configuration?.xAxis,
            yAxis: chartRec.configuration?.yAxis,
          };
        }
      }

      const assistantMessage: Message = { 
        role: "assistant", 
        content: adaptedContent,
        suggestions: data.suggestions || [
          "Tell me more about this",
          "What are the trends?",
          "Show me a visualization",
        ],
        chartSuggestion,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      // Save assistant message to database
      saveMessage(assistantMessage);
      
      // Speak response if voice enabled
      if (voiceEnabled && preferences.uiPreferences.voiceEnabled) {
        speakText(adaptedContent);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to get response");
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setInput(suggestion.query);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleFollowUpClick = (question: string) => {
    setInput(question);
    setTimeout(() => handleSend(), 100);
  };

  const toggleVoice = () => {
    const newValue = !voiceEnabled;
    setVoiceEnabled(newValue);
    updateUIPreferences({ voiceEnabled: newValue });
    if (!newValue) stopSpeaking();
  };

  const defaultSuggestions: Suggestion[] = [
    { label: "What are the key trends?", query: "What are the key trends in this data?", icon: <TrendingUp className="w-3 h-3" /> },
    { label: "Find anomalies", query: "Are there any anomalies or outliers in this data?", icon: <Lightbulb className="w-3 h-3" /> },
    { label: "Summarize findings", query: "Summarize the main findings from this dataset", icon: <Brain className="w-3 h-3" /> },
    { label: "Best visualization", query: "What's the best way to visualize this data?", icon: <BarChart3 className="w-3 h-3" /> },
  ];

  return (
    <div className="flex flex-col h-[650px] bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border/50 bg-card/80">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">AI Data Assistant</span>
              <Badge variant="secondary" className="text-xs gap-1">
                <Sparkles className="w-3 h-3" />
                {preferences.expertiseLevel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">Emotionally intelligent â€¢ Voice enabled</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Expertise Level */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-1 h-8">
                <Brain className="w-4 h-4" />
                <ChevronDown className="w-3 h-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2">
              <p className="text-xs font-medium mb-2 px-2">Expertise Level</p>
              {EXPERTISE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setExpertiseLevel(level.value as any)}
                  className={cn(
                    "w-full flex flex-col items-start p-2 rounded-lg hover:bg-muted/50 transition-colors text-left",
                    preferences.expertiseLevel === level.value && 'bg-muted'
                  )}
                >
                  <span className="text-sm font-medium">{level.label}</span>
                  <span className="text-xs text-muted-foreground">{level.description}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>

          {/* Voice Toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={toggleVoice}
            className={cn("h-8 w-8 p-0", voiceEnabled && "text-primary")}
          >
            {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>

          {/* Export & Share */}
          {messages.length > 0 && (
            <>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleExportPdf}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                title="Export chat to PDF"
              >
                <FileDown className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleShareChat}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                title="Copy shareable link"
              >
                <Share2 className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearHistory}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                title="Clear chat history"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </>
          )}

          {/* Color Theme */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Palette className="w-4 h-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-40 p-2">
              <p className="text-xs font-medium mb-2 px-2">Theme</p>
              {CHAT_COLORS.map((color) => (
                <button
                  key={color.name}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors",
                    selectedColor.name === color.name && 'bg-muted'
                  )}
                >
                  <div className={cn("w-4 h-4 rounded-full", color.user)} />
                  <span className="text-sm">{color.name}</span>
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Loading History Indicator */}
      {isLoadingHistory && <PlatformLoadingState label="Loading chat history…" size="sm" />}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary via-cyan-400 to-purple-500 flex items-center justify-center shadow-glow animate-pulse">
              <Bot className="w-10 h-10 text-primary-foreground" />
            </div>
            <div className="text-center max-w-md">
              <h3 className="text-xl font-bold mb-2 gradient-text">Smart Data Conversations</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                I adapt to your expertise level and understand your emotions. 
                Use voice or text to explore your data naturally.
              </p>
            </div>
            
            {/* Quick Actions */}
            <div className="flex flex-wrap gap-2 justify-center max-w-lg">
              {defaultSuggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(s)}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-muted/50 hover:bg-muted rounded-full border border-border/50 hover:border-primary/50 transition-all hover:shadow-button"
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>

            {/* Voice Hint */}
            {voiceSupported && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 px-4 py-2 rounded-full">
                <Mic className="w-3 h-3" />
                <span>Click the mic button or press and hold to speak</span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-3 animate-fade-in",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                )}
                <div className="max-w-[80%] space-y-2">
                  <div
                    className={cn(
                      "p-3 rounded-2xl",
                      message.role === "user"
                        ? `${selectedColor.user} text-white`
                        : `${selectedColor.assistant} text-foreground border border-border/30`
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{cleanMarkdown(message.content)}</p>
                  </div>
                  
                  {/* Sentiment indicator */}
                  {message.sentiment && message.role === "user" && (
                    <div className="flex items-center gap-1 justify-end text-xs text-muted-foreground">
                      {getSentimentIcon(message.sentiment.sentiment)}
                      <span className="capitalize">{message.sentiment.sentiment}</span>
                    </div>
                  )}

                  {/* Chart suggestion */}
                  {message.chartSuggestion && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                      {getChartIcon(message.chartSuggestion.type)}
                      <span>Recommended: <strong className="capitalize">{message.chartSuggestion.type}</strong> chart</span>
                      {message.chartSuggestion.xAxis && (
                        <Badge variant="secondary" className="text-xs">{message.chartSuggestion.xAxis} â†’ {message.chartSuggestion.yAxis}</Badge>
                      )}
                    </div>
                  )}

                  {/* Follow-up suggestions */}
                  {message.suggestions && message.role === "assistant" && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {message.suggestions.slice(0, 3).map((s, j) => (
                        <button
                          key={j}
                          onClick={() => handleFollowUpClick(s)}
                          className="text-xs px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted border border-border/50 hover:border-primary/30 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-secondary-foreground" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start animate-fade-in">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-400/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div className={cn("p-3 rounded-2xl", selectedColor.assistant)}>
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border/50 bg-card/80 space-y-2">
        {/* Did you mean? */}
        {didYouMean && (
          <button
            onClick={() => {
              setInput(didYouMean);
              setDidYouMean(null);
            }}
            className="w-full text-left text-xs text-muted-foreground hover:text-foreground p-2 rounded-lg bg-muted/30 transition-colors"
          >
            Did you mean: <span className="text-primary font-medium">{didYouMean}</span>?
          </button>
        )}

        {/* Auto-suggestions dropdown */}
        {showSuggestions && autoSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-muted/30 border border-border/50">
            {autoSuggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-full bg-background hover:bg-muted border border-border/50 hover:border-primary/30 transition-colors"
              >
                {s.icon}
                {s.label}
              </button>
            ))}
            {isLoadingSuggestions && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          {/* Voice Input Button */}
          {voiceSupported && (
            <Button
              type="button"
              variant={isListening ? "default" : "outline"}
              size="icon"
              onClick={isListening ? stopListening : startListening}
              className={cn(
                "shrink-0 transition-all",
                isListening && "bg-red-500 hover:bg-red-600 animate-pulse"
              )}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
          )}
          
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isListening ? "Listening..." : "Ask about your data..."}
            disabled={isLoading}
            className="flex-1 bg-background/50 border-border/50 focus:border-primary rounded-xl"
          />
          <Button 
            type="submit" 
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90 rounded-xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default DataChat;