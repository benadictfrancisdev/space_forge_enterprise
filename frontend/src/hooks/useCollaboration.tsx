import { useState, useEffect, useCallback, useRef } from "react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { RealtimeChannel } from "@/platform";
import { toast } from "@/hooks/use-toast";

export interface CollaborationUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  color: string;
  cursor?: { x: number; y: number };
  isTyping?: boolean;
  lastSeen: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userColor: string;
  content: string;
  timestamp: string;
  isAI?: boolean;
  mentions?: string[];
}

export interface CollaborationEvent {
  type: "query_submitted" | "chart_created" | "data_loaded" | "insight_shared";
  userId: string;
  userName: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface UseCollaborationOptions {
  roomId: string;
  datasetName?: string;
}

const USER_COLORS = [
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", 
  "#22C55E", "#14B8A6", "#06B6D4", "#0EA5E9",
  "#3B82F6", "#6366F1", "#8B5CF6", "#A855F7",
  "#D946EF", "#EC4899", "#F43F5E"
];

const getRandomColor = () => USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

export const useCollaboration = ({ roomId, datasetName }: UseCollaborationOptions) => {
  const { user } = useAuth();
  const [users, setUsers] = useState<CollaborationUser[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<CollaborationEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const userColorRef = useRef<string>(getRandomColor());
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Get current user info
  const getCurrentUserInfo = useCallback((): CollaborationUser | null => {
    if (!user) return null;
    return {
      id: user.id,
      email: user.email || "",
      displayName: user.user_metadata?.display_name || user.email?.split("@")[0] || "Anonymous",
      avatarUrl: (user.user_metadata as any)?.avatar_url,
      color: userColorRef.current,
      lastSeen: new Date().toISOString()
    };
  }, [user]);

  // Initialize channel
  const initializeChannel = useCallback(() => {
    if (!user || !roomId) return;

    const currentUser = getCurrentUserInfo();
    if (!currentUser) return;

    // Clean up existing channel
    if (channelRef.current) {
      backend.removeChannel(channelRef.current);
    }

    const channel = backend.channel(`collaboration:${roomId}`, {
      config: {
        presence: { key: user.id },
        broadcast: { self: false }
      }
    });

    // Handle presence sync
    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      const presentUsers: CollaborationUser[] = [];
      
      Object.entries(state).forEach(([_, presences]) => {
        if (Array.isArray(presences) && presences.length > 0) {
          const presence = presences[0] as unknown as CollaborationUser;
          if (presence.id && presence.displayName) {
            presentUsers.push(presence);
          }
        }
      });
      
      setUsers(presentUsers);
    });

    // Handle user join
    channel.on("presence", { event: "join" }, ({ key, newPresences }) => {
      console.log("User joined:", key, newPresences);
      if (newPresences && newPresences.length > 0) {
        const newUser = newPresences[0] as unknown as CollaborationUser;
        if (newUser.id && newUser.id !== user.id && newUser.displayName) {
          toast({
            title: "User Joined",
            description: `${newUser.displayName} joined the session`
          });
        }
      }
    });

    // Handle user leave
    channel.on("presence", { event: "leave" }, ({ key, leftPresences }) => {
      console.log("User left:", key, leftPresences);
      if (leftPresences && leftPresences.length > 0) {
        const leftUser = leftPresences[0] as unknown as CollaborationUser;
        if (leftUser.id && leftUser.id !== user.id && leftUser.displayName) {
          toast({
            title: "User Left",
            description: `${leftUser.displayName} left the session`
          });
        }
      }
    });

    // Handle broadcast messages
    channel.on("broadcast", { event: "chat_message" }, ({ payload }) => {
      const message = payload as ChatMessage;
      setMessages(prev => [...prev, message]);
    });

    channel.on("broadcast", { event: "cursor_move" }, ({ payload }) => {
      const { userId, cursor } = payload as { userId: string; cursor: { x: number; y: number } };
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, cursor } : u
      ));
    });

    channel.on("broadcast", { event: "typing_indicator" }, ({ payload }) => {
      const { userId, isTyping } = payload as { userId: string; isTyping: boolean };
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isTyping } : u
      ));
    });

    channel.on("broadcast", { event: "collaboration_event" }, ({ payload }) => {
      const event = payload as CollaborationEvent;
      setEvents(prev => [...prev.slice(-49), event]); // Keep last 50 events
    });

    channel.on("broadcast", { event: "ai_response" }, ({ payload }) => {
      const message = payload as ChatMessage;
      setMessages(prev => [...prev, message]);
      setIsAITyping(false);
    });

    channel.on("broadcast", { event: "ai_typing" }, ({ payload }) => {
      setIsAITyping(payload.isTyping as boolean);
    });

    // Subscribe and track presence
    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        await channel.track(currentUser);
        console.log("Collaboration channel subscribed:", roomId);
      } else if (status === "CHANNEL_ERROR") {
        setIsConnected(false);
        handleReconnect();
      } else if (status === "CLOSED") {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;
  }, [user, roomId, getCurrentUserInfo]);

  // Reconnection logic
  const handleReconnect = useCallback(() => {
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      toast({
        title: "Connection Lost",
        description: "Unable to reconnect to collaboration session",
        variant: "destructive"
      });
      return;
    }

    reconnectAttempts.current += 1;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
    
    setTimeout(() => {
      console.log(`Reconnecting... attempt ${reconnectAttempts.current}`);
      initializeChannel();
    }, delay);
  }, [initializeChannel]);

  // Send chat message
  const sendMessage = useCallback(async (content: string) => {
    if (!channelRef.current || !user) return;

    const currentUser = getCurrentUserInfo();
    if (!currentUser) return;

    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      userName: currentUser.displayName,
      userColor: currentUser.color,
      content,
      timestamp: new Date().toISOString(),
      mentions: extractMentions(content)
    };

    // Add to local messages immediately
    setMessages(prev => [...prev, message]);

    // Broadcast to others
    await channelRef.current.send({
      type: "broadcast",
      event: "chat_message",
      payload: message
    });

    // Check for AI mention
    if (content.toLowerCase().includes("@ai") || content.toLowerCase().includes("@assistant")) {
      await handleAIMention(content, message);
    }
  }, [user, getCurrentUserInfo]);

  // Handle AI mentions
  const handleAIMention = useCallback(async (content: string, originalMessage: ChatMessage) => {
    if (!channelRef.current) return;

    // Show AI typing indicator
    setIsAITyping(true);
    await channelRef.current.send({
      type: "broadcast",
      event: "ai_typing",
      payload: { isTyping: true }
    });

    try {
      // Call data-agent for AI response
      const { data: response, error } = await backend.functions.invoke("data-agent", {
        body: {
          action: "chat",
          query: content.replace(/@ai|@assistant/gi, "").trim(),
          context: {
            datasetName,
            recentMessages: messages.slice(-10).map(m => ({
              role: m.isAI ? "assistant" : "user",
              content: m.content
            }))
          }
        }
      });

      if (error) throw error;
      if (response?.error) throw new Error(typeof response.error === "string" ? response.error : "AI service error");

      const aiMessage: ChatMessage = {
        id: `ai_${Date.now()}`,
        userId: "ai-assistant",
        userName: "AI Assistant",
        userColor: "#8B5CF6",
        content: response?.result || response?.response || "I'm here to help! What would you like to analyze?",
        timestamp: new Date().toISOString(),
        isAI: true
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsAITyping(false);

      await channelRef.current.send({
        type: "broadcast",
        event: "ai_response",
        payload: aiMessage
      });

      await channelRef.current.send({
        type: "broadcast",
        event: "ai_typing",
        payload: { isTyping: false }
      });
    } catch (error) {
      console.error("AI response error:", error);
      setIsAITyping(false);
      
      const errorMessage: ChatMessage = {
        id: `ai_error_${Date.now()}`,
        userId: "ai-assistant",
        userName: "AI Assistant",
        userColor: "#8B5CF6",
        content: "Sorry, I encountered an error processing your request. Please try again.",
        timestamp: new Date().toISOString(),
        isAI: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  }, [datasetName, messages]);

  // Extract @mentions from message
  const extractMentions = (content: string): string[] => {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  };

  // Send cursor position
  const sendCursorPosition = useCallback(async (x: number, y: number) => {
    if (!channelRef.current || !user) return;

    await channelRef.current.send({
      type: "broadcast",
      event: "cursor_move",
      payload: { userId: user.id, cursor: { x, y } }
    });
  }, [user]);

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user) return;

    await channelRef.current.send({
      type: "broadcast",
      event: "typing_indicator",
      payload: { userId: user.id, isTyping }
    });
  }, [user]);

  // Broadcast collaboration event
  const broadcastEvent = useCallback(async (
    type: CollaborationEvent["type"],
    data: Record<string, unknown>
  ) => {
    if (!channelRef.current || !user) return;

    const currentUser = getCurrentUserInfo();
    if (!currentUser) return;

    const event: CollaborationEvent = {
      type,
      userId: user.id,
      userName: currentUser.displayName,
      data,
      timestamp: new Date().toISOString()
    };

    setEvents(prev => [...prev.slice(-49), event]);

    await channelRef.current.send({
      type: "broadcast",
      event: "collaboration_event",
      payload: event
    });
  }, [user, getCurrentUserInfo]);

  // Leave room
  const leaveRoom = useCallback(async () => {
    if (channelRef.current) {
      await channelRef.current.untrack();
      await backend.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setIsConnected(false);
    setUsers([]);
    setMessages([]);
    setEvents([]);
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (roomId && user) {
      initializeChannel();
    }

    return () => {
      leaveRoom();
    };
  }, [roomId, user, initializeChannel, leaveRoom]);

  return {
    users,
    messages,
    events,
    isConnected,
    isAITyping,
    currentUser: getCurrentUserInfo(),
    sendMessage,
    sendCursorPosition,
    sendTypingIndicator,
    broadcastEvent,
    leaveRoom
  };
};
