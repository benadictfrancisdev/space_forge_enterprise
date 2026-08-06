import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

// Scene 1: Cold open — "WE JUST HIT" text snap + logo
export const Scene1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoScale = spring({ frame, fps, config: { damping: 12, stiffness: 200 } });
  const textY = interpolate(frame, [10, 30], [40, 0], { extrapolateRight: "clamp" });
  const textO = interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" });
  const flashO = interpolate(frame, [0, 4, 10], [1, 0.6, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 24 }}>
      <Img src={staticFile("images/logo.png")} style={{ width: 220, height: 220, transform: `scale(${logoScale})` }} />
      <div style={{
        fontFamily: display, fontSize: 96, color: "#67e8f9", letterSpacing: 4,
        opacity: textO, transform: `translateY(${textY}px)`, textShadow: "0 0 40px #06b6d4",
      }}>SPACEFORGE</div>
      <div style={{
        fontFamily: inter, fontWeight: 700, fontSize: 24, color: "#94a3b8",
        letterSpacing: 8, opacity: textO,
      }}>AI DECISION INTELLIGENCE ENGINE</div>
      <AbsoluteFill style={{ background: "#fff", opacity: flashO, pointerEvents: "none" }} />
    </AbsoluteFill>
  );
};
