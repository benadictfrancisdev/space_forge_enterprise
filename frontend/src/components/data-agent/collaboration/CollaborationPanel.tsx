import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Users, 
  MessageSquare, 
  Send, 
  Circle, 
  Sparkles, 
  Wifi, 
  WifiOff,
  ChevronRight,
  ChevronLeft,
  Activity,
  BarChart3,
  Database,
  Lightbulb,
  Loader2
} from "lucide-react";
import { CollaborationUser, ChatMessage, CollaborationEvent } from "@/hooks/useCollaboration";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface CollaborationPanelProps {
  users: CollaborationUser[];
  messages: ChatMessage[];
  events: CollaborationEvent[];
  isConnected: boolean;
  isAITyping: boolean;
  currentUser: CollaborationUser | null;
  onSendMessage: (content: string) => void;
  onTypingChange: (isTyping: boolean) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const getEventIcon = (type: CollaborationEvent["type"]) => {
  switch (type) {
    case "query_submitted": return Database;
    case "chart_created": return BarChart3;
    case "data_loaded": return Activity;
    case "insight_shared": return Lightbulb;
    default: return Activity;
  }
};

const getEventDescription = (event: CollaborationEvent): string => {
  switch (event.type) {
    case "query_submitted":
      return `ran a query`;
    case "chart_created":
      return `created a ${event.data.chartType || "chart"}`;
    case "data_loaded":
      return `loaded ${event.data.rowCount || "new"} records`;
    case "insight_shared":
      return `shared an insight`;
    default:
      return "performed an action";
  }
};

export const CollaborationPanel = ({
  users,
  messages,
  events,
  isConnected,
  isAITyping,
  currentUser,
  onSendMessage,
  onTypingChange,
  isExpanded,
  onToggleExpand
}: CollaborationPanelProps) => {
  const [message, setMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "activity">("chat");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;
    onSendMessage(message.trim());
    setMessage("");
    onTypingChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputChange = (value: string) => {
    setMessage(value);
    
    // Debounced typing indicator
    onTypingChange(true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTypingChange(false);
    }, 2000);
  };

  const typingUsers = users.filter(u => u.isTyping && u.id !== currentUser?.id);

  // Collapsed state
  if (!isExpanded) {
    return (
      <div className="fixed right-4 top-24 z-50 flex flex-col items-end gap-2">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onToggleExpand}
                size="icon"
                className="h-12 w-12 rounded-full shadow-lg bg-primary hover:bg-primary/90"
              >
                <Users className="h-5 w-5" />
                {users.length > 1 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    variant="secondary"
                  >
                    {users.length}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{users.length} user{users.length !== 1 ? "s" : ""} in session</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Connection status indicator */}
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
          isConnected 
            ? "bg-green-500/10 text-green-600 dark:text-green-400" 
            : "bg-red-500/10 text-red-600 dark:text-red-400"
        )}>
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? "Live" : "Offline"}
        </div>

        {/* User avatars stack */}
        <div className="flex -space-x-2">
          {users.slice(0, 4).map((user) => (
            <TooltipProvider key={user.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <AvatarImage src={user.avatarUrl} />
                    <AvatarFallback 
                      style={{ backgroundColor: user.color }}
                      className="text-white text-xs"
                    >
                      {user.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{user.displayName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
          {users.length > 4 && (
            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
              +{users.length - 4}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="fixed right-4 top-24 z-50 w-80 h-[calc(100vh-8rem)] flex flex-col shadow-xl border-border/50 bg-card/95 backdrop-blur-sm">
      {/* Header */}
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Collaboration</CardTitle>
            <div className={cn(
              "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs",
              isConnected 
                ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                : "bg-red-500/10 text-red-600 dark:text-red-400"
            )}>
              <Circle className={cn("h-2 w-2 fill-current", isConnected && "animate-pulse")} />
              {isConnected ? "Live" : "Offline"}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleExpand}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {/* Users section */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{users.length} Online</span>
        </div>
        <div className="flex flex-wrap gap-1">
          {users.map((user) => (
            <TooltipProvider key={user.id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Avatar className="h-8 w-8 border-2" style={{ borderColor: user.color }}>
                      <AvatarImage src={user.avatarUrl} />
                      <AvatarFallback 
                        style={{ backgroundColor: user.color }}
                        className="text-white text-xs"
                      >
                        {user.displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {user.isTyping && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="animate-pulse text-white text-[8px]">...</span>
                      </span>
                    )}
                    {user.id === currentUser?.id && (
                      <span className="absolute -top-0.5 -right-0.5 h-3 w-3 bg-primary rounded-full" />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{user.displayName}{user.id === currentUser?.id ? " (You)" : ""}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>

      <Separator />

      {/* Tabs */}
      <div className="flex border-b flex-shrink-0">
        <button
          onClick={() => setActiveTab("chat")}
          className={cn(
            "flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
            activeTab === "chat" 
              ? "border-b-2 border-primary text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <MessageSquare className="h-4 w-4" />
          Chat
        </button>
        <button
          onClick={() => setActiveTab("activity")}
          className={cn(
            "flex-1 py-2 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors",
            activeTab === "activity" 
              ? "border-b-2 border-primary text-primary" 
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Activity className="h-4 w-4" />
          Activity
        </button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-4">
        {activeTab === "chat" ? (
          <div className="py-2 space-y-3">
            {messages.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No messages yet</p>
                <p className="text-xs mt-1">Type @AI to get help from the assistant</p>
              </div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={cn(
                  "flex gap-2",
                  msg.userId === currentUser?.id && "flex-row-reverse"
                )}>
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    {msg.isAI ? (
                      <AvatarFallback className="bg-violet-500 text-white">
                        <Sparkles className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    ) : (
                      <AvatarFallback 
                        style={{ backgroundColor: msg.userColor }}
                        className="text-white text-xs"
                      >
                        {msg.userName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className={cn(
                    "flex flex-col max-w-[75%]",
                    msg.userId === currentUser?.id && "items-end"
                  )}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-xs font-medium">
                        {msg.isAI ? "AI Assistant" : msg.userName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                      </span>
                    </div>
                    <div className={cn(
                      "px-3 py-2 rounded-lg text-sm",
                      msg.isAI 
                        ? "bg-violet-500/10 border border-violet-500/20" 
                        : msg.userId === currentUser?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))
            )}
            
            {/* AI typing indicator */}
            {isAITyping && (
              <div className="flex gap-2">
                <Avatar className="h-7 w-7 flex-shrink-0">
                  <AvatarFallback className="bg-violet-500 text-white">
                    <Sparkles className="h-3.5 w-3.5" />
                  </AvatarFallback>
                </Avatar>
                <div className="px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}

            {/* Typing indicator for other users */}
            {typingUsers.length > 0 && (
              <div className="text-xs text-muted-foreground italic">
                {typingUsers.map(u => u.displayName).join(", ")} {typingUsers.length === 1 ? "is" : "are"} typing...
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="py-2 space-y-2">
            {events.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
                <p className="text-xs mt-1">Actions will appear here in real-time</p>
              </div>
            ) : (
              events.slice().reverse().map((event, idx) => {
                const Icon = getEventIcon(event.type);
                return (
                  <div key={`${event.timestamp}-${idx}`} className="flex items-start gap-2 py-1.5">
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <Icon className="h-3 w-3 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium">{event.userName}</span>
                        {" "}
                        <span className="text-muted-foreground">{getEventDescription(event)}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(event.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </ScrollArea>

      {/* Chat input */}
      {activeTab === "chat" && (
        <div className="p-3 border-t flex-shrink-0">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type message... (@AI for help)"
              className="flex-1 h-9"
              disabled={!isConnected}
            />
            <Button 
              size="icon" 
              className="h-9 w-9" 
              onClick={handleSendMessage}
              disabled={!message.trim() || !isConnected}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};
