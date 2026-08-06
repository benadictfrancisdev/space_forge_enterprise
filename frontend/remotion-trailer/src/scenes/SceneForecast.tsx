import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

export const SceneForecast: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerS = spring({ frame, fps, config: { damping: 14 } });
  const reveal = interpolate(frame, [10, 80], [0, 1], { extrapolateRight: "clamp" });

  // Historical (solid) + forecast (dashed)
  const hist = Array.from({ length: 24 }, (_, i) => ({
    x: (i / 47) * 100,
    y: 60 - 18 * Math.sin(i * 0.4) - i * 0.6 + Math.cos(i * 0.9) * 4,
  }));
  const fcst = Array.from({ length: 24 }, (_, i) => ({
    x: ((i + 24) / 47) * 100,
    y: hist[hist.length - 1].y - i * 1.0 + Math.sin(i * 0.3) * 2,
  }));
  const upper = fcst.map(p => ({ x: p.x, y: p.y - 4 - Math.random() * 0 - p.x * 0.05 }));
  const lower = fcst.map(p => ({ x: p.x, y: p.y + 4 + p.x * 0.05 }));

  const pHist = `M ${hist.map(p => `${p.x},${p.y}`).join(" L ")}`;
  const pFcst = `M ${fcst.map(p => `${p.x},${p.y}`).join(" L ")}`;
  const band = `M ${upper.map(p => `${p.x},${p.y}`).join(" L ")} L ${lower.slice().reverse().map(p => `${p.x},${p.y}`).join(" L ")} Z`;

  return (
    <AbsoluteFill style={{ padding: 80, flexDirection: "column", gap: 24 }}>
      <div style={{ opacity: headerS, transform: `translateY(${interpolate(headerS, [0,1], [-30,0])}px)` }}>
        <div style={{ fontFamily: inter, fontSize: 13, color: "#94a3b8", letterSpacing: 6, fontWeight: 700 }}>
          PREDICTIVE INTELLIGENCE
        </div>
        <div style={{ fontFamily: display, fontSize: 64, color: "#fff", letterSpacing: 3 }}>
          SEE THE <span style={{ color: "#a78bfa", textShadow: "0 0 30px #8b5cf6" }}>FUTURE</span>
        </div>
      </div>

      <div style={{
        flex: 1, padding: 30, borderRadius: 18,
        background: "rgba(8,12,28,0.7)",
        border: "1px solid rgba(167,139,250,0.3)",
        boxShadow: "0 0 80px rgba(139,92,246,0.15)",
        display: "flex", flexDirection: "column", gap: 16,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: inter, fontSize: 16, color: "#cbd5e1", fontWeight: 700 }}>
            Revenue Forecast · Next 24 Days
          </div>
          <div style={{ display: "flex", gap: 16 }}>
            <Legend color="#67e8f9" label="ACTUAL" />
            <Legend color="#a78bfa" label="FORECAST" />
            <Legend color="#a78bfa44" label="95% CI" filled />
          </div>
        </div>

        <svg viewBox="0 0 100 70" style={{ width: "100%", height: 360 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="histG" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* grid */}
          {[0, 1, 2, 3].map(i => (
            <line key={i} x1="0" x2="100" y1={10 + i * 15} y2={10 + i * 15}
              stroke="#334155" strokeWidth="0.1" strokeDasharray="0.5,0.5" />
          ))}
          {/* divider */}
          <line x1="50" x2="50" y1="0" y2="70" stroke="#a78bfa" strokeWidth="0.2" strokeDasharray="0.8,0.8" opacity="0.5" />
          {/* hist fill */}
          <path d={`${pHist} L 50,70 L 0,70 Z`} fill="url(#histG)" opacity={reveal} />
          {/* hist line */}
          <path d={pHist} fill="none" stroke="#22d3ee" strokeWidth="0.5"
            strokeDasharray="200" strokeDashoffset={200 - Math.min(reveal * 2, 1) * 200} />
          {/* CI band */}
          <path d={band} fill="#a78bfa" opacity={Math.max(0, reveal * 1.3 - 0.6) * 0.25} />
          {/* forecast line */}
          <path d={pFcst} fill="none" stroke="#a78bfa" strokeWidth="0.5" strokeDasharray="1,0.6"
            opacity={Math.max(0, reveal * 1.3 - 0.6)} />
          {/* end point */}
          <circle cx={fcst[fcst.length - 1].x} cy={fcst[fcst.length - 1].y} r="0.8"
            fill="#a78bfa" opacity={reveal > 0.95 ? 1 : 0} />
        </svg>

        <div style={{ display: "flex", gap: 20 }}>
          <Stat label="FORECAST DROP" val="-12.4%" color="#fbbf24" delay={50} frame={frame} />
          <Stat label="CONFIDENCE" val="91%" color="#22c55e" delay={58} frame={frame} />
          <Stat label="MODEL" val="ARIMA + AI" color="#a78bfa" delay={66} frame={frame} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Legend: React.FC<{ color: string; label: string; filled?: boolean }> = ({ color, label, filled }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 20, height: 4, background: filled ? color : "transparent",
      borderTop: filled ? "none" : `2px ${color === "#a78bfa" ? "dashed" : "solid"} ${color}` }} />
    <div style={{ fontFamily: inter, fontSize: 11, color: "#94a3b8", letterSpacing: 2, fontWeight: 700 }}>
      {label}
    </div>
  </div>
);

const Stat: React.FC<{ label: string; val: string; color: string; delay: number; frame: number }> = ({ label, val, color, delay, frame }) => {
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div style={{
      flex: 1, padding: "14px 18px", borderRadius: 10,
      background: `${color}10`, border: `1px solid ${color}40`,
      transform: `translateY(${interpolate(s, [0,1], [20, 0])}px)`, opacity: s,
    }}>
      <div style={{ fontFamily: inter, fontSize: 11, color: "#94a3b8", letterSpacing: 2 }}>{label}</div>
      <div style={{ fontFamily: display, fontSize: 32, color, marginTop: 4 }}>{val}</div>
    </div>
  );
};
