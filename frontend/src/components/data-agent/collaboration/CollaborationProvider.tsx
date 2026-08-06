import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useCollaboration, CollaborationUser, ChatMessage, CollaborationEvent } from "@/hooks/useCollaboration";
import { CollaborationPanel } from "./CollaborationPanel";
import { LiveCursors } from "./LiveCursors";
import { useAuth } from "@/hooks/useAuth";

interface CollaborationContextType {
  isEnabled: boolean;
  roomId: string | null;
  users: CollaborationUser[];
  messages: ChatMessage[];
  events: CollaborationEvent[];
  isConnected: boolean;
  joinRoom: (roomId: string, datasetName?: string) => void;
  leaveRoom: () => void;
  sendMessage: (content: string) => void;
  broadcastEvent: (type: CollaborationEvent["type"], data: Record<string, unknown>) => void;
}

const CollaborationContext = createContext<CollaborationContextType | null>(null);

export const useCollaborationContext = () => {
  const context = useContext(CollaborationContext);
  if (!context) {
    throw new Error("useCollaborationContext must be used within CollaborationProvider");
  }
  return context;
};

interface CollaborationProviderProps {
  children: ReactNode;
}

export const CollaborationProvider = ({ children }: CollaborationProviderProps) => {
  const { user } = useAuth();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [datasetName, setDatasetName] = useState<string>();
  const [isPanelExpanded, setIsPanelExpanded] = useState(true);
  const [showCursors, setShowCursors] = useState(true);

  const {
    users,
    messages,
    events,
    isConnected,
    isAITyping,
    currentUser,
    sendMessage,
    sendCursorPosition,
    sendTypingIndicator,
    broadcastEvent,
    leaveRoom: leaveCollaboration
  } = useCollaboration({
    roomId: roomId || "",
    datasetName
  });

  const joinRoom = useCallback((newRoomId: string, newDatasetName?: string) => {
    setRoomId(newRoomId);
    setDatasetName(newDatasetName);
    setIsPanelExpanded(true);
  }, []);

  // Listen for custom event to auto-join from URL
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.roomId) {
        joinRoom(detail.roomId, detail.datasetName);
      }
    };
    window.addEventListener("join-collaboration-room", handler);
    return () => window.removeEventListener("join-collaboration-room", handler);
  }, [joinRoom]);

  const leaveRoom = useCallback(() => {
    leaveCollaboration();
    setRoomId(null);
    setDatasetName(undefined);
  }, [leaveCollaboration]);

  const contextValue: CollaborationContextType = {
    isEnabled: !!roomId && !!user,
    roomId,
    users,
    messages,
    events,
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    broadcastEvent
  };

  return (
    <CollaborationContext.Provider value={contextValue}>
      {children}
      
      {/* Render collaboration UI when room is active */}
      {roomId && user && (
        <>
          {showCursors && (
            <LiveCursors
              users={users}
              currentUserId={currentUser?.id}
              onCursorMove={sendCursorPosition}
            />
          )}
          
          <CollaborationPanel
            users={users}
            messages={messages}
            events={events}
            isConnected={isConnected}
            isAITyping={isAITyping}
            currentUser={currentUser}
            onSendMessage={sendMessage}
            onTypingChange={sendTypingIndicator}
            isExpanded={isPanelExpanded}
            onToggleExpand={() => setIsPanelExpanded(!isPanelExpanded)}
          />
        </>
      )}
    </CollaborationContext.Provider>
  );
};
