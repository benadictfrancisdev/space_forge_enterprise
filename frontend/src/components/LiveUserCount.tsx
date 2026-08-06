import { memo, useState, useEffect } from "react";
import { Users } from "lucide-react";

/**
 * Animated live user counter — shows a dynamic "X users analyzing data right now"
 * Creates urgency and social proof on the landing page.
 */
const LiveUserCount = () => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Simulate realistic active user count (12-48 range)
    const base = 12 + Math.floor(Math.random() * 20);
    setCount(base);

    const interval = setInterval(() => {
      setCount((prev) => {
        const delta = Math.random() > 0.5 ? 1 : -1;
        return Math.max(8, Math.min(55, prev + delta));
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (count === 0) return null;

  return (
    <div className="fixed bottom-4 left-4 z-40 hidden md:flex items-center gap-2 bg-card/90 backdrop-blur-md border border-border/60 rounded-full px-4 py-2 shadow-lg">
      <span className="relative flex h-2.5 w-2.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
      </span>
      <Users className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="text-xs font-semibold text-foreground">{count}</span>
      <span className="text-xs text-muted-foreground">analyzing data now</span>
    </div>
  );
};

export default memo(LiveUserCount);
