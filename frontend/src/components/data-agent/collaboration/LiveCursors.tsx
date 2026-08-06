import { useEffect, useRef, useCallback } from "react";
import { CollaborationUser } from "@/hooks/useCollaboration";

interface LiveCursorsProps {
  users: CollaborationUser[];
  currentUserId?: string;
  onCursorMove: (x: number, y: number) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export const LiveCursors = ({ 
  users, 
  currentUserId, 
  onCursorMove,
  containerRef 
}: LiveCursorsProps) => {
  const throttleRef = useRef<number>(0);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const now = Date.now();
    // Throttle to max 30 updates per second
    if (now - throttleRef.current < 33) return;
    throttleRef.current = now;

    let x = e.clientX;
    let y = e.clientY;

    // If container ref provided, make coordinates relative to container
    if (containerRef?.current) {
      const rect = containerRef.current.getBoundingClientRect();
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }

    onCursorMove(x, y);
  }, [onCursorMove, containerRef]);

  useEffect(() => {
    const target = containerRef?.current || document;
    target.addEventListener("mousemove", handleMouseMove as EventListener);

    return () => {
      target.removeEventListener("mousemove", handleMouseMove as EventListener);
    };
  }, [handleMouseMove, containerRef]);

  // Filter out current user and users without cursor positions
  const otherUsers = users.filter(
    u => u.id !== currentUserId && u.cursor
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[60] overflow-hidden">
      {otherUsers.map((user) => (
        <div
          key={user.id}
          className="absolute transition-all duration-75 ease-out"
          style={{
            left: user.cursor!.x,
            top: user.cursor!.y,
            transform: "translate(-2px, -2px)"
          }}
        >
          {/* Cursor pointer */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-md"
          >
            <path
              d="M5.65 3.35L19.5 12.65L12.15 13.65L9.15 20.65L5.65 3.35Z"
              fill={user.color}
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          
          {/* User name label */}
          <div
            className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs font-medium text-white whitespace-nowrap shadow-sm"
            style={{ backgroundColor: user.color }}
          >
            {user.displayName}
          </div>
        </div>
      ))}
    </div>
  );
};
