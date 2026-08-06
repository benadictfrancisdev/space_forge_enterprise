import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

const cards = [
  { tag: "PREDICT", color: "#22d3ee", title: "Q4 revenue will drop 12% in 18 days.", sub: "Confidence 91% · driven by 3 SKUs slowing." },
  { tag: "RISK", color: "#fbbf24", title: "Customer churn risk up 2.4× this week.", sub: "Cohort: signups from Sept campaign." },
  { tag: "ACT NOW", color: "#22c55e", title: "Reorder SKU-4471 today to avoid stockout.", sub: "Estimated ₹14.2L in saved sales." },
  { tag: "ANOMALY", color: "#f472b6", title: "Refund rate spiked 38% on Tuesday.", sub: "Likely cause: payment gateway timeout." },
];

const Card: React.FC<{ frame: number; delay: number; idx: number }> = ({ frame, delay, idx }) => {
  const { fps } = useVideoConfig();
  const c = cards[idx];
  const s = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 160 } });
  const x = interpolate(s, [0, 1], [80, 0]);
  return (
    <div style={{
      transform: `translateX(${x}px)`, opacity: s,
      width: 720, padding: "20px 26px", borderRadius: 14,
      background: "rgba(15,23,42,0.7)",
      border: `1px solid ${c.color}55`,
      borderLeft: `4px solid ${c.color}`,
      boxShadow: `0 0 40px ${c.color}22, 0 10px 30px rgba(0,0,0,0.4)`,
      display: "flex", flexDirection: "column", gap: 6,
    }}>
      <div style={{
        fontFamily: inter, fontSize: 11, fontWeight: 900,
        color: c.color, letterSpacing: 3,
      }}>{c.tag}</div>
      <div style={{ fontFamily: inter, fontSize: 22, color: "#f1f5f9", fontWeight: 700, lineHeight: 1.25 }}>
        {c.title}
      </div>
      <div style={{ fontFamily: inter, fontSize: 14, color: "#94a3b8" }}>{c.sub}</div>
    </div>
  );
};

export const SceneDecisionFeed: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerS = spring({ frame, fps, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ padding: "70px 80px", flexDirection: "column", gap: 32 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6,
        opacity: headerS, transform: `translateY(${interpolate(headerS, [0,1], [-30, 0])}px)` }}>
        <div style={{ fontFamily: inter, fontSize: 13, color: "#94a3b8", letterSpacing: 6, fontWeight: 700 }}>
          THE HERO FEATURE
        </div>
        <div style={{ fontFamily: display, fontSize: 64, color: "#fff", letterSpacing: 3 }}>
          AI <span style={{ color: "#67e8f9", textShadow: "0 0 30px #06b6d4" }}>DECISION FEED</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
        {cards.map((_, i) => (
          <Card key={i} frame={frame} delay={18 + i * 10} idx={i} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
