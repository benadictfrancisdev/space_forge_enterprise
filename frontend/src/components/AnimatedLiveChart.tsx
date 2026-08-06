import React, { useEffect, useRef, useCallback } from "react";

interface StreamLine {
  color: string;
  points: number[];
  speed: number;
  amplitude: number;
  offset: number;
}

const AnimatedLiveChart = ({ className = "" }: { className?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const linesRef = useRef<StreamLine[]>([]);

  const initLines = useCallback(() => {
    linesRef.current = [
      { color: "rgba(59,130,246,0.9)", points: [], speed: 1.8, amplitude: 18, offset: 0 },
      { color: "rgba(14,165,233,0.85)", points: [], speed: 1.4, amplitude: 14, offset: 40 },
      { color: "rgba(6,214,160,0.8)", points: [], speed: 1.1, amplitude: 12, offset: 80 },
      { color: "rgba(251,146,60,0.85)", points: [], speed: 1.6, amplitude: 16, offset: 120 },
      { color: "rgba(168,85,247,0.8)", points: [], speed: 1.2, amplitude: 10, offset: 160 },
    ];
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    initLines();

    let t = 0;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const segCount = 120;

    const draw = () => {
      t += 0.02;
      ctx.clearRect(0, 0, w, h);

      linesRef.current.forEach((line) => {
        const baseY = line.offset + 20;
        ctx.beginPath();
        ctx.strokeStyle = line.color;
        ctx.lineWidth = 2;
        ctx.lineJoin = "round";

        for (let i = 0; i <= segCount; i++) {
          const x = (i / segCount) * w;
          const noise1 = Math.sin((i * 0.08) + t * line.speed) * line.amplitude;
          const noise2 = Math.sin((i * 0.15) + t * line.speed * 0.7) * (line.amplitude * 0.4);
          const noise3 = Math.cos((i * 0.03) + t * line.speed * 1.3) * (line.amplitude * 0.2);
          const y = baseY + noise1 + noise2 + noise3;
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Glow
        ctx.beginPath();
        ctx.strokeStyle = line.color.replace(/[\d.]+\)$/, "0.15)");
        ctx.lineWidth = 8;
        for (let i = 0; i <= segCount; i++) {
          const x = (i / segCount) * w;
          const noise1 = Math.sin((i * 0.08) + t * line.speed) * line.amplitude;
          const noise2 = Math.sin((i * 0.15) + t * line.speed * 0.7) * (line.amplitude * 0.4);
          const noise3 = Math.cos((i * 0.03) + t * line.speed * 1.3) * (line.amplitude * 0.2);
          const y = baseY + noise1 + noise2 + noise3;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      // Scanning dot
      const dotX = ((t * 30) % w);
      ctx.beginPath();
      ctx.arc(dotX, linesRef.current[1].offset + 20 + Math.sin(t * 1.4) * 14, 4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,165,233,0.9)";
      ctx.fill();
      ctx.beginPath();
      ctx.arc(dotX, linesRef.current[1].offset + 20 + Math.sin(t * 1.4) * 14, 10, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(14,165,233,0.2)";
      ctx.fill();

      frameRef.current = requestAnimationFrame(draw);
    };
    draw();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [initLines]);

  return (
    <div className={`relative rounded-2xl bg-card border border-border overflow-hidden ${className}`}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          LIVE · 847ms ago
        </span>
      </div>
      <div className="absolute top-10 left-4 z-10">
        <span className="inline-block px-3 py-1 rounded-md bg-primary/10 text-primary text-xs font-bold font-mono">
          2.4B events/sec
        </span>
      </div>
      <canvas ref={canvasRef} className="w-full h-full" style={{ minHeight: "240px" }} />
    </div>
  );
};

export default AnimatedLiveChart;
