import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { loadFont as loadDisplay } from "@remotion/google-fonts/Bungee";
import { loadFont as loadMono } from "@remotion/google-fonts/JetBrainsMono";

const { fontFamily: inter } = loadFont("normal", { weights: ["400", "700", "900"], subsets: ["latin"] });
const { fontFamily: display } = loadDisplay("normal", { weights: ["400"], subsets: ["latin"] });
const { fontFamily: mono } = loadMono("normal", { weights: ["400", "700"], subsets: ["latin"] });

const userMsg = "Why did revenue drop in Bangalore last month?";
const aiMsg = "Bangalore revenue fell 18% MoM. Root cause: 2 enterprise renewals slipped. Recommend: trigger CSM outreach within 48h to recover ₹2.1Cr ARR.";

const typeChars = (text: string, frame: number, startFrame: number, charsPerFrame = 1.5) => {
  const n = Math.max(0, Math.floor((frame - startFrame) * charsPerFrame));
  return text.slice(0, Math.min(n, text.length));
};

export const SceneAIChat: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const headerS = spring({ frame, fps, config: { damping: 14 } });
  const userS = spring({ frame: frame - 12, fps, config: { damping: 14 } });
  const aiS = spring({ frame: frame - 50, fps, config: { damping: 14 } });

  const userText = typeChars(userMsg, frame, 14, 2.4);
  const thinking = frame > 30 && frame < 55;
  const aiText = typeChars(aiMsg, frame, 60, 1.8);

  return (
    <AbsoluteFill style={{ padding: 80, flexDirection: "column", gap: 30 }}>
      <div style={{ opacity: headerS, transform: `translateY(${interpolate(headerS, [0,1], [-30,0])}px)` }}>
        <div style={{ fontFamily: inter, fontSize: 13, color: "#94a3b8", letterSpacing: 6, fontWeight: 700 }}>
          ASK YOUR DATA. IN ENGLISH.
        </div>
        <div style={{ fontFamily: display, fontSize: 64, color: "#fff", letterSpacing: 3 }}>
          AI <span style={{ color: "#22c55e", textShadow: "0 0 30px #16a34a" }}>DATA SCIENTIST</span>
        </div>
      </div>

      <div style={{
        flex: 1, padding: 40, borderRadius: 18,
        background: "rgba(8,12,28,0.75)",
        border: "1px solid rgba(34,197,94,0.25)",
        boxShadow: "0 0 80px rgba(34,197,94,0.15)",
        display: "flex", flexDirection: "column", gap: 24, justifyContent: "center",
      }}>
        {/* User bubble */}
        <div style={{
          alignSelf: "flex-end", maxWidth: "70%",
          padding: "18px 24px", borderRadius: "20px 20px 4px 20px",
          background: "rgba(34,211,238,0.12)",
          border: "1px solid rgba(103,232,249,0.35)",
          opacity: userS, transform: `translateY(${interpolate(userS, [0,1], [20,0])}px)`,
        }}>
          <div style={{ fontFamily: inter, fontSize: 11, color: "#67e8f9", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>
            YOU
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "#e2e8f0", lineHeight: 1.4 }}>
            {userText}{userText.length < userMsg.length && <span style={{ opacity: 0.7 }}>▍</span>}
          </div>
        </div>

        {/* Thinking */}
        {thinking && (
          <div style={{ alignSelf: "flex-start", display: "flex", gap: 8, padding: "14px 22px",
            background: "rgba(34,197,94,0.08)", borderRadius: "20px 20px 20px 4px",
            border: "1px solid rgba(34,197,94,0.3)" }}>
            {[0, 1, 2].map(i => {
              const o = 0.3 + 0.7 * Math.abs(Math.sin((frame + i * 8) * 0.3));
              return <div key={i} style={{ width: 10, height: 10, borderRadius: 5, background: "#22c55e", opacity: o }} />;
            })}
          </div>
        )}

        {/* AI bubble */}
        {frame > 50 && (
          <div style={{
            alignSelf: "flex-start", maxWidth: "78%",
            padding: "18px 24px", borderRadius: "20px 20px 20px 4px",
            background: "rgba(34,197,94,0.10)",
            border: "1px solid rgba(34,197,94,0.4)",
            opacity: aiS, transform: `translateY(${interpolate(aiS, [0,1], [20,0])}px)`,
          }}>
            <div style={{ fontFamily: inter, fontSize: 11, color: "#22c55e", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>
              SPACEFORGE AI
            </div>
            <div style={{ fontFamily: inter, fontSize: 20, color: "#f1f5f9", lineHeight: 1.5 }}>
              {aiText}{aiText.length < aiMsg.length && <span style={{ opacity: 0.7 }}>▍</span>}
            </div>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
