import { cn } from "@/lib/utils";
import { BarChart3, FlaskConical, Rocket, Building2 } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export type CognitiveMode = "analyst" | "scientist" | "founder" | "organization";

interface CognitiveModeSelectorProps {
  mode: CognitiveMode;
  onModeChange: (mode: CognitiveMode) => void;
  collapsed?: boolean;
  layout?: "vertical" | "horizontal";
}

const getModeColors = (theme: "dark" | "light") => [
  {
    value: "analyst" as const,
    label: "Analyst",
    icon: BarChart3,
    tagline: "Facts & Patterns",
    color: theme === "dark" ? "#00c8ff" : "#ACB9CC",
  },
  {
    value: "scientist" as const,
    label: "Scientist",
    icon: FlaskConical,
    tagline: "Discovery & Rigor",
    color: theme === "dark" ? "#39ff14" : "#008000",
  },
  {
    value: "founder" as const,
    label: "Founder",
    icon: Rocket,
    tagline: "Decisions & Growth",
    color: theme === "dark" ? "#ff073a" : "#cc0000",
  },
  {
    value: "organization" as const,
    label: "Organization",
    icon: Building2,
    tagline: "Ops & Strategy",
    color: theme === "dark" ? "#ffe600" : "#be29ec",
  },
];

const CognitiveModeSelector = ({ mode, onModeChange, collapsed, layout = "horizontal" }: CognitiveModeSelectorProps) => {
  const { theme } = useTheme();
  const modes = getModeColors(theme);

  if (collapsed) {
    return (
      <div className="flex flex-col gap-1 px-2">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => onModeChange(m.value)}
              className="p-2 rounded-lg border transition-all duration-200"
              style={{
                borderColor: isActive ? m.color : "transparent",
                background: isActive ? `${m.color}12` : "transparent",
                boxShadow: isActive ? `0 0 16px ${m.color}40` : "none",
              }}
              title={`${m.label}: ${m.tagline}`}
            >
              <Icon className="w-4 h-4" style={{ color: isActive ? m.color : "hsl(var(--muted-foreground))" }} />
            </button>
          );
        })}
      </div>
    );
  }

  if (layout === "horizontal") {
    return (
      <div className="w-full mb-4">
        <div className="flex items-center gap-1 mb-3">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Cognitive Lens</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modes.map((m) => {
            const Icon = m.icon;
            const isActive = mode === m.value;
            return (
                <button
                key={m.value}
                onClick={() => onModeChange(m.value)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 rounded-lg border transition-all duration-200 p-2.5",
                  "hover:translate-y-[-1px] hover:scale-[1.02]"
                )}
                style={{
                  borderColor: isActive ? m.color : "hsl(var(--border))",
                  background: isActive ? `${m.color}14` : "hsl(var(--card) / 0.6)",
                  boxShadow: isActive ? `0 0 14px ${m.color}35` : "none",
                  backdropFilter: "blur(12px)",
                }}
              >
                <div
                  className="w-7 h-7 rounded-md flex items-center justify-center"
                  style={{
                    background: isActive ? `${m.color}20` : "hsl(var(--muted) / 0.5)",
                  }}
                >
                  <Icon
                    className="w-3.5 h-3.5"
                    style={{ color: isActive ? m.color : "hsl(var(--muted-foreground))" }}
                  />
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-[10px] font-semibold leading-tight",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {m.label}
                  </p>
                  <p className="text-[8px] text-muted-foreground mt-0.5 leading-tight">
                    {m.tagline}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Vertical layout (sidebar fallback)
  return (
    <div className="space-y-1">
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
        Cognitive Lens
      </span>
      <div className="flex flex-col gap-1">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.value;
          return (
            <button
              key={m.value}
              onClick={() => onModeChange(m.value)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all duration-200"
              style={{
                borderColor: isActive ? m.color : "transparent",
                background: isActive ? `${m.color}12` : "transparent",
                boxShadow: isActive ? `0 0 16px ${m.color}35` : "none",
              }}
            >
              <Icon className="w-4 h-4 shrink-0" style={{ color: isActive ? m.color : "hsl(var(--muted-foreground))" }} />
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs font-medium", isActive ? "text-foreground" : "text-muted-foreground")}>
                  {m.label}
                </p>
                <p className="text-[10px] text-muted-foreground truncate">{m.tagline}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CognitiveModeSelector;
