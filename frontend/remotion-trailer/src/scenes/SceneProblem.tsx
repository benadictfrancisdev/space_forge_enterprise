import { AbsoluteFill, useCurrentFrame, interpolate, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

// "Data is everywhere. Decisions are not."
export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const l1Y = interpolate(frame, [0, 22], [40, 0], { extrapolateRight: "clamp" });
  const l1O = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const l2O = interpolate(frame, [30, 50], [0, 1], { extrapolateRight: "clamp" });
  const l2Y = interpolate(frame, [30, 50], [40, 0], { extrapolateRight: "clamp" });
  const strikeW = interpolate(frame, [55, 75], [0, 100], { extrapolateRight: "clamp" });
  const subO = interpolate(frame, [70, 90], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
      <div style={{
        fontFamily: display, fontSize: 92, color: "#94a3b8", letterSpacing: 4,
        opacity: l1O, transform: `translateY(${l1Y}px)`,
      }}>DATA IS EVERYWHERE.</div>
      <div style={{
        position: "relative", display: "inline-block",
        opacity: l2O, transform: `translateY(${l2Y}px)`,
      }}>
        <div style={{
          fontFamily: display, fontSize: 92, color: "#67e8f9", letterSpacing: 4,
          textShadow: "0 0 40px #06b6d4",
        }}>DECISIONS ARE NOT.</div>
        <div style={{
          position: "absolute", left: 0, top: "50%", height: 6,
          background: "#ef4444", width: `${strikeW}%`,
          boxShadow: "0 0 20px #ef4444",
        }} />
      </div>
      <div style={{
        marginTop: 30, fontFamily: inter, fontWeight: 700, fontSize: 22,
        color: "#fbbf24", opacity: subO, letterSpacing: 8,
      }}>WE FIXED THAT.</div>
    </AbsoluteFill>
  );
};
