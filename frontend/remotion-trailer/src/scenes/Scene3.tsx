import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

// Mock "Analyze Data" UI panel
const AnalyzePanel: React.FC<{ frame: number }> = ({ frame }) => {
  const barFill = interpolate(frame, [0, 40], [0, 1], { extrapolateRight: "clamp" });
  const lineProgress = interpolate(frame, [10, 60], [0, 1], { extrapolateRight: "clamp" });
  const points = Array.from({ length: 14 }, (_, i) => ({
    x: (i / 13) * 100,
    y: 50 - Math.sin(i * 0.6) * 20 - i * 1.5,
  }));
  const path = `M ${points.map(p => `${p.x},${p.y}`).join(" L ")}`;

  return (
    <div style={{
      width: 760, background: "rgba(8,12,28,0.85)",
      border: "1px solid rgba(103,232,249,0.3)", borderRadius: 16, padding: 28,
      boxShadow: "0 0 80px rgba(34,211,238,0.2)",
    }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#ef4444" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#fbbf24" }} />
        <div style={{ width: 12, height: 12, borderRadius: 6, background: "#22c55e" }} />
        <div style={{ marginLeft: 12, fontFamily: mono, color: "#67e8f9", fontSize: 14 }}>
          analyze · sales_q4.csv · 12,840 rows
        </div>
      </div>
      {/* KPI row */}
      <div style={{ display: "flex", gap: 16, marginBottom: 20 }}>
        {[
          { label: "REVENUE", val: "₹4.2Cr", color: "#22d3ee" },
          { label: "GROWTH", val: "+38%", color: "#22c55e" },
          { label: "CHURN", val: "2.1%", color: "#fbbf24" },
        ].map((k, i) => (
          <div key={i} style={{
            flex: 1, padding: 14, borderRadius: 10,
            background: `${k.color}15`, border: `1px solid ${k.color}40`,
          }}>
            <div style={{ fontFamily: inter, fontSize: 11, color: "#94a3b8", letterSpacing: 2 }}>{k.label}</div>
            <div style={{ fontFamily: display, fontSize: 28, color: k.color, marginTop: 4 }}>{k.val}</div>
          </div>
        ))}
      </div>
      {/* Chart */}
      <svg viewBox="0 0 100 60" style={{ width: "100%", height: 180 }}>
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`${path} L 100,60 L 0,60 Z`} fill="url(#g)"
          style={{ opacity: lineProgress }} />
        <path d={path} fill="none" stroke="#22d3ee" strokeWidth="0.6"
          strokeDasharray="200" strokeDashoffset={200 - lineProgress * 200} />
      </svg>
      {/* Insight bar */}
      <div style={{
        marginTop: 16, padding: 12, borderRadius: 8,
        background: "linear-gradient(90deg, #22d3ee20, transparent)",
        borderLeft: "3px solid #22d3ee",
        fontFamily: inter, fontSize: 14, color: "#e2e8f0",
        width: `${barFill * 100}%`, overflow: "hidden", whiteSpace: "nowrap",
      }}>
        <span style={{ color: "#22d3ee", fontWeight: 700 }}>INSIGHT · </span>
        Revenue spike correlates with weekend campaigns. Scale by 2.4×.
      </div>
    </div>
  );
};

const FeatureChip: React.FC<{ frame: number; delay: number; label: string; sub: string }> = ({ frame, delay, label, sub }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 180 } });
  return (
    <div style={{
      transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)`,
      opacity: s,
      padding: "14px 20px", borderRadius: 12,
      background: "rgba(34,211,238,0.08)", border: "1px solid rgba(103,232,249,0.3)",
      backdropFilter: "none", minWidth: 280,
    }}>
      <div style={{ fontFamily: inter, fontWeight: 900, fontSize: 16, color: "#67e8f9", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontFamily: inter, fontSize: 13, color: "#94a3b8", marginTop: 4 }}>{sub}</div>
    </div>
  );
};

// Scene 3: Analyze Data showcase
export const Scene3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerS = spring({ frame, fps, config: { damping: 14 } });

  const features = [
    { label: "AUTO-INSIGHTS", sub: "AI finds what matters in seconds" },
    { label: "ANOMALY DETECTION", sub: "Catch outliers before they cost you" },
    { label: "FORECAST ENGINE", sub: "Predict next quarter with confidence" },
    { label: "ROOT CAUSE AI", sub: "Why it happened, not just what" },
  ];

  return (
    <AbsoluteFill style={{ padding: 80, alignItems: "center", justifyContent: "center" }}>
      <div style={{
        position: "absolute", top: 60, left: 80,
        fontFamily: display, fontSize: 56, color: "#fff", letterSpacing: 4,
        opacity: headerS, transform: `translateY(${interpolate(headerS, [0,1], [-30, 0])}px)`,
      }}>
        <span style={{ color: "#94a3b8", fontSize: 24, display: "block", letterSpacing: 6 }}>INSIDE</span>
        ANALYZE DATA
      </div>
      <div style={{ display: "flex", gap: 60, alignItems: "center", marginTop: 60 }}>
        <div style={{ transform: `scale(${spring({ frame: frame - 6, fps, config: { damping: 16 } })})` }}>
          <AnalyzePanel frame={frame - 10} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {features.map((f, i) => (
            <FeatureChip key={i} frame={frame} delay={20 + i * 10} label={f.label} sub={f.sub} />
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
