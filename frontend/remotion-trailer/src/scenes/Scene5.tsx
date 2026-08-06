import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, staticFile, Img } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });

// Scene 5: CTA close
export const Scene5: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoS = spring({ frame, fps, config: { damping: 14, stiffness: 180 } });
  const textO = interpolate(frame, [15, 35], [0, 1], { extrapolateRight: "clamp" });
  const urlO = interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" });
  const pulse = 1 + Math.sin(frame * 0.1) * 0.03;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 28 }}>
      <Img src={staticFile("images/logo.png")} style={{
        width: 200, height: 200, transform: `scale(${logoS * pulse})`,
        filter: "drop-shadow(0 0 40px #06b6d4)",
      }} />
      <div style={{
        fontFamily: display, fontSize: 88, color: "#fff", letterSpacing: 4,
        opacity: textO, textShadow: "0 0 40px #06b6d4",
      }}>NEXT STOP. SCALE.</div>
      <div style={{
        fontFamily: inter, fontWeight: 700, fontSize: 22, color: "#94a3b8",
        opacity: textO, letterSpacing: 8,
      }}>WATCH US BUILD</div>
      <div style={{
        marginTop: 30,
        fontFamily: inter, fontWeight: 900, fontSize: 32, color: "#67e8f9",
        opacity: urlO,
        padding: "18px 40px",
        border: "2px solid #22d3ee",
        borderRadius: 14,
        boxShadow: "0 0 40px rgba(34,211,238,0.4)",
        letterSpacing: 2,
      }}>spaceforge.in</div>
    </AbsoluteFill>
  );
};
