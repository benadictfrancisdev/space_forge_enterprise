import { useTheme } from "@/hooks/useTheme";
import AnimatedSpaceBackground from "./AnimatedSpaceBackground";

const SpaceBackground = () => {
  const { theme } = useTheme();
  const isLight = theme === "light";

  return (
    <div
      className="fixed inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
      style={{ contain: "strict" }}
    >
      {/* Canvas animated starfield + nebula + shooting stars */}
      <AnimatedSpaceBackground />

      {/* Base gradient layer */}
      <div
        className="absolute inset-0 transition-colors duration-700"
        style={{
          background: isLight
            ? "linear-gradient(160deg, hsl(220 35% 96%) 0%, hsl(210 50% 94%) 40%, hsl(225 30% 96%) 100%)"
            : "linear-gradient(160deg, hsl(222 45% 6%) 0%, hsl(230 40% 8%) 50%, hsl(220 38% 5%) 100%)",
        }}
      />

      {/* Radial glow at top-centre */}
      <div
        className="absolute inset-0 transition-opacity duration-700"
        style={{
          background: isLight
            ? "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(210 80% 60% / 0.08) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 50% at 50% -10%, hsl(210 80% 55% / 0.12) 0%, transparent 70%)",
        }}
      />

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48"
        style={{
          background: isLight
            ? "linear-gradient(to top, hsl(220 25% 97%) 0%, transparent 100%)"
            : "linear-gradient(to top, hsl(222 38% 5%) 0%, transparent 100%)",
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 space-vignette" />
    </div>
  );
};

export default SpaceBackground;
