import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const StarField: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const stars = Array.from({ length: 140 }, (_, i) => {
    const seed = i * 9301 + 49297;
    const x = (seed % 233280) / 233280 * width;
    const y = ((seed * 7) % 233280) / 233280 * height;
    const size = 1 + ((seed * 3) % 4);
    const speed = 0.2 + ((seed * 5) % 100) / 200;
    const tx = (x + frame * speed) % width;
    const tw = 0.3 + Math.abs(Math.sin((frame + i * 5) * 0.05)) * 0.7;
    return { x: tx, y, size, opacity: tw };
  });
  return (
    <AbsoluteFill style={{
      background: "radial-gradient(ellipse at 50% 40%, #0b1230 0%, #050816 60%, #02030a 100%)",
    }}>
      {stars.map((s, i) => (
        <div key={i} style={{
          position: "absolute", left: s.x, top: s.y, width: s.size, height: s.size,
          borderRadius: "50%", background: "#7dd3fc", opacity: s.opacity,
          boxShadow: `0 0 ${s.size * 3}px #38bdf8`,
        }} />
      ))}
    </AbsoluteFill>
  );
};
