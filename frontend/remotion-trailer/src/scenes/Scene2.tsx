import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img, Sequence } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

// Scene 2: #1 explosion — three trophy cards
export const Scene2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerY = spring({ frame, fps, config: { damping: 14 } });

  const cards = [
    { img: "images/ach1.png", label: "LAST WEEK'S WINNERS", color: "#fbbf24" },
    { img: "images/ach2.png", label: "TOP PRODUCTS", color: "#f472b6" },
    { img: "images/ach3.png", label: "TOP LAUNCHES", color: "#22d3ee" },
  ];

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 60 }}>
      <div style={{
        fontFamily: display, fontSize: 72, color: "#fff",
        transform: `translateY(${interpolate(headerY, [0, 1], [60, 0])}px)`,
        opacity: headerY, letterSpacing: 6,
      }}>
        <span style={{ color: "#fbbf24", textShadow: "0 0 30px #f59e0b" }}>#1</span>
        <span style={{ color: "#94a3b8", margin: "0 24px", fontSize: 32 }}>ON</span>
        <span style={{ color: "#67e8f9" }}>STARTUPRANKED</span>
      </div>
      <div style={{ display: "flex", gap: 40 }}>
        {cards.map((c, i) => {
          const delay = 8 + i * 7;
          const s = spring({ frame: frame - delay, fps, config: { damping: 10, stiffness: 180 } });
          const float = Math.sin((frame + i * 30) * 0.05) * 8;
          return (
            <div key={i} style={{
              transform: `scale(${s}) translateY(${float}px)`,
              opacity: s,
              borderRadius: 20, overflow: "hidden",
              border: `3px solid ${c.color}`,
              boxShadow: `0 0 60px ${c.color}66, 0 20px 50px rgba(0,0,0,0.5)`,
              background: "rgba(15,23,42,0.6)", backdropFilter: "none",
              padding: 16, width: 380,
            }}>
              <Img src={staticFile(c.img)} style={{ width: "100%", borderRadius: 12 }} />
              <div style={{
                fontFamily: inter, fontWeight: 900, fontSize: 18, color: c.color,
                marginTop: 14, letterSpacing: 3, textAlign: "center",
              }}>{c.label}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
