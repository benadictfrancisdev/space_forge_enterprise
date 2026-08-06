import { useEffect, useRef } from "react";
import { useTheme } from "@/hooks/useTheme";

/* ─── Types ─────────────────────────────────────────────── */
interface Star  { x:number;y:number;size:number;op:number;twSpeed:number;twOff:number;color:string;layer:number }
interface Shoot { x:number;y:number;vx:number;vy:number;len:number;life:number;maxLife:number }
interface Nebula{ x:number;y:number;rx:number;ry:number;rot:number;color:string;op:number }
interface Orb   { x:number;y:number;r:number;color:string;op:number;vx:number;vy:number;phase:number }
interface DataNode{ x:number;y:number;vx:number;vy:number;r:number;pulse:number;color:string }
interface Conn  { a:number;b:number;life:number;maxLife:number }

const DARK_COLORS  = ["#ffffff","#cce8ff","#ffe0b0","#d4c8ff","#b8ffe0","#ffd0e8","#a0d4ff"];
const LIGHT_COLORS = ["#1a3a7a","#0d2a90","#2a1560","#153580","#0a2a6a"];

export default function AnimatedSpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme }  = useTheme();
  const isDark     = theme === "dark";
  const rafRef     = useRef(0);

  const starsRef    = useRef<Star[]>([]);
  const shootsRef   = useRef<Shoot[]>([]);
  const nebulasRef  = useRef<Nebula[]>([]);
  const orbsRef     = useRef<Orb[]>([]);
  const nodesRef    = useRef<DataNode[]>([]);
  const connsRef    = useRef<Conn[]>([]);
  const lastShoot   = useRef(0);
  const lastConn    = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;

    const init = () => {
      const W = canvas.width = window.innerWidth;
      const H = canvas.height = window.innerHeight;
      const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

      /* Stars — 3 depth layers */
      starsRef.current = Array.from({ length: isDark ? 280 : 90 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        size: Math.random() * 2.4 + 0.2,
        op:   Math.random() * 0.6 + 0.35,
        twSpeed: Math.random() * 0.02 + 0.006,
        twOff:   Math.random() * Math.PI * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        layer: Math.floor(Math.random() * 3),
      }));

      /* Nebula clouds */
      nebulasRef.current = [
        { x:W*.12,  y:H*.2,  rx:W*.28, ry:H*.35, rot:-.3,  color:isDark?"#4f46e5":"#3b82f6", op:isDark?.07:.03 },
        { x:W*.85,  y:H*.55, rx:W*.22, ry:H*.28, rot:.4,   color:isDark?"#7c3aed":"#0ea5e9", op:isDark?.055:.025 },
        { x:W*.5,   y:H*.9,  rx:W*.3,  ry:H*.2,  rot:0,    color:isDark?"#0891b2":"#6366f1", op:isDark?.05:.02 },
        { x:W*.7,   y:H*.1,  rx:W*.18, ry:H*.22, rot:.6,   color:isDark?"#db2777":"#f59e0b", op:isDark?.04:.015 },
        { x:W*.3,   y:H*.75, rx:W*.2,  ry:H*.18, rot:-.2,  color:isDark?"#059669":"#10b981", op:isDark?.04:.015 },
      ];

      /* Ambient orbs — slow drifting glow spheres */
      orbsRef.current = Array.from({ length: 5 }, (_, i) => ({
        x: W * (.1 + i * .2), y: H * (.2 + Math.random() * .6),
        r: 80 + Math.random() * 120,
        color: ["#3b82f6","#8b5cf6","#06b6d4","#f59e0b","#10b981"][i],
        op: isDark ? .06 + Math.random()*.04 : .025 + Math.random()*.015,
        vx: (Math.random()-.5)*.15, vy: (Math.random()-.5)*.1,
        phase: Math.random() * Math.PI * 2,
      }));

      /* Data node network — floating analytics nodes */
      nodesRef.current = Array.from({ length: 16 }, () => ({
        x: Math.random() * W, y: Math.random() * H,
        vx: (Math.random()-.5)*.4, vy: (Math.random()-.5)*.4,
        r: 2 + Math.random()*3,
        pulse: Math.random() * Math.PI * 2,
        color: isDark ? "#38bdf8" : "#2563eb",
      }));
      connsRef.current = [];
      shootsRef.current = [];
    };

    const spawnShoot = (W:number, H:number) => {
      const a = (Math.random()*25+10) * Math.PI/180;
      shootsRef.current.push({
        x: Math.random() * W * .9, y: Math.random() * H * .35,
        vx: Math.cos(a)*(7+Math.random()*9), vy: Math.sin(a)*(3+Math.random()*5),
        len: 90 + Math.random()*130, life:0, maxLife: 55+Math.random()*45,
      });
    };

    const spawnConn = () => {
      const n = nodesRef.current.length;
      const a = Math.floor(Math.random()*n);
      let b = Math.floor(Math.random()*n);
      while (b===a) b = Math.floor(Math.random()*n);
      connsRef.current.push({ a, b, life:0, maxLife: 90+Math.random()*60 });
      if (connsRef.current.length > 12) connsRef.current.shift();
    };

    const draw = (t: number) => {
      const W = canvas.width, H = canvas.height;
      const T = t * .001;
      ctx.clearRect(0,0,W,H);

      /* ── 1. Nebula ellipses ────── */
      ctx.save();
      for (const n of nebulasRef.current) {
        ctx.save();
        ctx.translate(n.x, n.y);
        ctx.rotate(n.rot + Math.sin(T*.03)*.04);
        const g = ctx.createRadialGradient(0,0,0, 0,0, Math.max(n.rx,n.ry));
        const hex = Math.round(n.op*255).toString(16).padStart(2,"0");
        const hex2= Math.round(n.op*.3*255).toString(16).padStart(2,"0");
        g.addColorStop(0, `${n.color}${hex}`);
        g.addColorStop(.5,`${n.color}${hex2}`);
        g.addColorStop(1, `${n.color}00`);
        ctx.scale(n.rx/Math.max(n.rx,n.ry), n.ry/Math.max(n.rx,n.ry));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(0,0,Math.max(n.rx,n.ry),0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.restore();

      /* ── 2. Ambient drifting orbs ─ */
      for (const o of orbsRef.current) {
        o.x += o.vx + Math.sin(T*.4+o.phase)*.3;
        o.y += o.vy + Math.cos(T*.3+o.phase)*.2;
        if (o.x<-o.r) o.x=W+o.r; if (o.x>W+o.r) o.x=-o.r;
        if (o.y<-o.r) o.y=H+o.r; if (o.y>H+o.r) o.y=-o.r;
        const g = ctx.createRadialGradient(o.x,o.y,0,o.x,o.y,o.r);
        const hex = Math.round(o.op*255).toString(16).padStart(2,"0");
        g.addColorStop(0,`${o.color}${hex}`);
        g.addColorStop(1,`${o.color}00`);
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(o.x,o.y,o.r,0,Math.PI*2); ctx.fill();
      }

      /* ── 3. Data node network ───── */
      const nodeColor = isDark ? "#38bdf8" : "#2563eb";
      // Update nodes
      for (const nd of nodesRef.current) {
        nd.x += nd.vx; nd.y += nd.vy; nd.pulse += .04;
        if (nd.x<0||nd.x>W) nd.vx*=-1;
        if (nd.y<0||nd.y>H) nd.vy*=-1;
      }
      // Draw connections
      connsRef.current = connsRef.current.filter(c => c.life < c.maxLife);
      for (const c of connsRef.current) {
        c.life++;
        const p = c.life/c.maxLife;
        const alpha = p<.2 ? p/.2 : p>.8 ? 1-(p-.8)/.2 : 1;
        const na = nodesRef.current[c.a], nb = nodesRef.current[c.b];
        const dx=nb.x-na.x, dy=nb.y-na.y, dist=Math.sqrt(dx*dx+dy*dy);
        if (dist > 500) continue;
        const opacity = alpha * (1-dist/500) * (isDark?.35:.2);
        ctx.strokeStyle = `${nodeColor}${Math.round(opacity*255).toString(16).padStart(2,"0")}`;
        ctx.lineWidth=.8;
        ctx.setLineDash([4,8]);
        ctx.beginPath(); ctx.moveTo(na.x,na.y); ctx.lineTo(nb.x,nb.y); ctx.stroke();
        ctx.setLineDash([]);
        // Travelling dot on connection
        const tx = na.x + dx*p, ty = na.y + dy*p;
        ctx.fillStyle = `${nodeColor}${Math.round(alpha*(isDark?.8:.5)*255).toString(16).padStart(2,"0")}`;
        ctx.beginPath(); ctx.arc(tx,ty,2,0,Math.PI*2); ctx.fill();
      }
      // Draw nodes
      for (const nd of nodesRef.current) {
        const pulse = .6 + Math.sin(nd.pulse)*.4;
        const a = isDark ? .5*pulse : .25*pulse;
        ctx.fillStyle = `${nodeColor}${Math.round(a*255).toString(16).padStart(2,"0")}`;
        ctx.beginPath(); ctx.arc(nd.x,nd.y,nd.r*pulse,0,Math.PI*2); ctx.fill();
        // Glow
        if (isDark) {
          const gg = ctx.createRadialGradient(nd.x,nd.y,0,nd.x,nd.y,nd.r*4);
          gg.addColorStop(0,`${nodeColor}${Math.round(.15*255).toString(16).padStart(2,"0")}`);
          gg.addColorStop(1,`${nodeColor}00`);
          ctx.fillStyle=gg; ctx.beginPath(); ctx.arc(nd.x,nd.y,nd.r*4,0,Math.PI*2); ctx.fill();
        }
      }
      // Spawn connections
      if (t-lastConn.current > 1200+Math.random()*800) { spawnConn(); lastConn.current=t; }

      /* ── 4. Stars ───────────────── */
      const colors = isDark ? DARK_COLORS : LIGHT_COLORS;
      for (const s of starsRef.current) {
        const tw  = Math.sin(T*s.twSpeed*60+s.twOff);
        const op  = Math.max(0, Math.min(1, s.op*(0.6+tw*.4)));
        const sz  = s.size*(0.85+tw*.15);
        ctx.globalAlpha = op;
        ctx.fillStyle   = s.color;
        ctx.beginPath(); ctx.arc(s.x,s.y,sz,0,Math.PI*2); ctx.fill();
        if (isDark && s.size>1.6 && op>.55) {
          ctx.globalAlpha = op*.22;
          ctx.beginPath(); ctx.arc(s.x,s.y,sz*3,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.globalAlpha=1;

      /* ── 5. Shooting stars (dark only) */
      if (isDark) {
        if (t-lastShoot.current > 2800+Math.random()*4200) { spawnShoot(W,H); lastShoot.current=t; }
        shootsRef.current = shootsRef.current.filter(s => s.life<s.maxLife);
        for (const ss of shootsRef.current) {
          const p = ss.life/ss.maxLife;
          const a = p<.15 ? p/.15 : (1-p)/.85;
          const tailX=ss.x-ss.vx*(ss.len/10), tailY=ss.y-ss.vy*(ss.len/10);
          const g = ctx.createLinearGradient(tailX,tailY,ss.x,ss.y);
          g.addColorStop(0,"rgba(255,255,255,0)");
          g.addColorStop(.7,`rgba(200,230,255,${a*.5})`);
          g.addColorStop(1,`rgba(220,240,255,${a*.95})`);
          ctx.strokeStyle=g; ctx.lineWidth=1.6;
          ctx.beginPath(); ctx.moveTo(tailX,tailY); ctx.lineTo(ss.x,ss.y); ctx.stroke();
          // Head sparkle
          ctx.fillStyle=`rgba(255,255,255,${a*.8})`;
          ctx.beginPath(); ctx.arc(ss.x,ss.y,1.5,0,Math.PI*2); ctx.fill();
          ss.x+=ss.vx; ss.y+=ss.vy; ss.life++;
        }
      }

      /* ── 6. Subtle scan-line glow (dark) */
      if (isDark) {
        const scanY = (T*25)%H;
        const sg = ctx.createLinearGradient(0,scanY-30,0,scanY+30);
        sg.addColorStop(0,"rgba(56,189,248,0)");
        sg.addColorStop(.5,"rgba(56,189,248,0.012)");
        sg.addColorStop(1,"rgba(56,189,248,0)");
        ctx.fillStyle=sg; ctx.fillRect(0,scanY-30,W,60);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    const onResize = () => { init(); };
    window.addEventListener("resize", onResize);
    init();
    rafRef.current = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(rafRef.current); window.removeEventListener("resize",onResize); };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none"
      style={{ opacity: isDark ? 1 : 0.55 }}
      aria-hidden="true"
    />
  );
}
