import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

// Scene 4: Speed flex — Raw data → Real decisions
export const Scene4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const lShift = interpolate(frame, [0, 30], [-200, 0], { extrapolateRight: "clamp" });
  const rShift = interpolate(frame, [10, 40], [200, 0], { extrapolateRight: "clamp" });
  const arrowScale = spring({ frame: frame - 25, fps, config: { damping: 10 } });
  const labelO = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 60 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 60 }}>
        <div style={{
          fontFamily: display, fontSize: 110, color: "#475569",
          transform: `translateX(${lShift}px)`,
          letterSpacing: 4,
        }}>
          RAW<br />DATA
        </div>
        <div style={{
          transform: `scale(${arrowScale})`, opacity: arrowScale,
          fontSize: 120, color: "#22d3ee", textShadow: "0 0 50px #06b6d4",
        }}>→</div>
        <div style={{
          fontFamily: display, fontSize: 110, color: "#67e8f9",
          transform: `translateX(${rShift}px)`,
          textShadow: "0 0 40px #06b6d4", letterSpacing: 4,
        }}>
          REAL<br />DECISIONS
        </div>
      </div>
      <div style={{
        fontFamily: inter, fontWeight: 900, fontSize: 28, color: "#fbbf24",
        opacity: labelO, letterSpacing: 12,
      }}>IN UNDER 10 SECONDS</div>
    </AbsoluteFill>
  );
};
