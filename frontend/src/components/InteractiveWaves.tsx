import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Ripple {
  x: number;
  y: number;
  radius: number;
  opacity: number;
  speed: number;
}

interface WavePoint {
  x: number;
  y: number;
  originalY: number;
  velocity: number;
}

const InteractiveWaves = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, isMoving: false });
  const ripplesRef = useRef<Ripple[]>([]);
  const wavePointsRef = useRef<WavePoint[]>([]);
  const animationRef = useRef<number>();
  const { theme } = useTheme();

  const getColors = useCallback(() => {
    if (theme === 'dark') {
      return {
        wave1: 'rgba(56, 189, 248, 0.15)',
        wave2: 'rgba(34, 211, 238, 0.12)',
        wave3: 'rgba(125, 211, 252, 0.08)',
        ripple: 'rgba(56, 189, 248, 0.3)',
        particle: 'rgba(255, 255, 255, 0.4)',
      };
    }
    return {
      wave1: 'rgba(14, 165, 233, 0.2)',
      wave2: 'rgba(6, 182, 212, 0.15)',
      wave3: 'rgba(56, 189, 248, 0.1)',
      ripple: 'rgba(14, 165, 233, 0.35)',
      particle: 'rgba(255, 255, 255, 0.6)',
    };
  }, [theme]);

  const initWavePoints = useCallback((width: number) => {
    const points: WavePoint[] = [];
    const spacing = 20;
    for (let x = 0; x <= width + spacing; x += spacing) {
      points.push({
        x,
        y: 0,
        originalY: 0,
        velocity: 0,
      });
    }
    wavePointsRef.current = points;
  }, []);

  const addRipple = useCallback((x: number, y: number) => {
    ripplesRef.current.push({
      x,
      y,
      radius: 0,
      opacity: 0.6,
      speed: 3 + Math.random() * 2,
    });
    
    // Limit ripples for performance
    if (ripplesRef.current.length > 8) {
      ripplesRef.current.shift();
    }
  }, []);

  const updateWavePoints = useCallback((mouseX: number, mouseY: number, height: number) => {
    const waveBaseY = height * 0.7;
    const influenceRadius = 200;
    const maxDisplacement = 40;

    wavePointsRef.current.forEach((point) => {
      const distX = Math.abs(point.x - mouseX);
      const distY = Math.abs(waveBaseY - mouseY);
      const distance = Math.sqrt(distX * distX + distY * distY);
      
      if (distance < influenceRadius && mouseRef.current.isMoving) {
        const influence = 1 - distance / influenceRadius;
        const targetY = -maxDisplacement * influence * Math.sin((point.x - mouseX) * 0.02);
        point.velocity += (targetY - point.y) * 0.1;
      }
      
      // Spring physics
      point.velocity += (point.originalY - point.y) * 0.03;
      point.velocity *= 0.92; // Damping
      point.y += point.velocity;
    });
  }, []);

  const drawWave = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    baseY: number,
    amplitude: number,
    frequency: number,
    speed: number,
    color: string,
    time: number,
    useInteraction: boolean
  ) => {
    ctx.beginPath();
    ctx.moveTo(0, height);

    for (let x = 0; x <= width; x += 5) {
      let y = baseY + Math.sin(x * frequency + time * speed) * amplitude;
      
      // Add secondary wave
      y += Math.sin(x * frequency * 1.5 + time * speed * 0.8) * (amplitude * 0.3);
      
      // Add interaction displacement
      if (useInteraction && wavePointsRef.current.length > 0) {
        const pointIndex = Math.floor(x / 20);
        if (pointIndex < wavePointsRef.current.length) {
          y += wavePointsRef.current[pointIndex].y;
        }
      }
      
      ctx.lineTo(x, y);
    }

    ctx.lineTo(width, height);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, baseY - amplitude, 0, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fill();
  }, []);

  const drawRipples = useCallback((ctx: CanvasRenderingContext2D, colors: ReturnType<typeof getColors>) => {
    ripplesRef.current = ripplesRef.current.filter((ripple) => {
      ripple.radius += ripple.speed;
      ripple.opacity -= 0.012;

      if (ripple.opacity <= 0) return false;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = colors.ripple.replace('0.3', String(ripple.opacity));
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner ripple
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius * 0.6, 0, Math.PI * 2);
      ctx.strokeStyle = colors.ripple.replace('0.3', String(ripple.opacity * 0.5));
      ctx.lineWidth = 1;
      ctx.stroke();

      return true;
    });
  }, []);

  const drawParticles = useCallback((
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    time: number,
    colors: ReturnType<typeof getColors>
  ) => {
    const particleCount = 12;
    for (let i = 0; i < particleCount; i++) {
      const x = (i * width / particleCount + time * 20) % width;
      const baseY = height * 0.6 + Math.sin(i * 0.8) * 50;
      const y = baseY + Math.sin(time * 2 + i) * 15;
      const size = 2 + Math.sin(time + i) * 1;
      const opacity = 0.3 + Math.sin(time * 1.5 + i) * 0.2;
      
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = colors.particle.replace('0.4', String(opacity));
      ctx.fill();
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initWavePoints(canvas.width);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let lastMouseMove = 0;
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY, isMoving: true };
      
      // Add ripple on movement (throttled)
      const now = Date.now();
      if (now - lastMouseMove > 150) {
        addRipple(e.clientX, e.clientY);
        lastMouseMove = now;
      }
    };

    const handleMouseStop = () => {
      mouseRef.current.isMoving = false;
    };

    let mouseStopTimer: ReturnType<typeof setTimeout>;
    const handleMouseMoveWithStop = (e: MouseEvent) => {
      handleMouseMove(e);
      clearTimeout(mouseStopTimer);
      mouseStopTimer = setTimeout(handleMouseStop, 100);
    };

    const handleClick = (e: MouseEvent) => {
      // Add multiple ripples on click
      addRipple(e.clientX, e.clientY);
      setTimeout(() => addRipple(e.clientX + 10, e.clientY + 10), 50);
      setTimeout(() => addRipple(e.clientX - 10, e.clientY - 10), 100);
    };

    window.addEventListener('mousemove', handleMouseMoveWithStop);
    window.addEventListener('click', handleClick);

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const colors = getColors();
      const { x: mouseX, y: mouseY } = mouseRef.current;
      
      // Update wave interaction
      updateWavePoints(mouseX, mouseY, canvas.height);
      
      // Draw floating particles
      drawParticles(ctx, canvas.width, canvas.height, time, colors);
      
      // Draw multiple wave layers
      drawWave(ctx, canvas.width, canvas.height, canvas.height * 0.75, 25, 0.008, 0.5, colors.wave3, time, false);
      drawWave(ctx, canvas.width, canvas.height, canvas.height * 0.78, 20, 0.01, 0.7, colors.wave2, time, true);
      drawWave(ctx, canvas.width, canvas.height, canvas.height * 0.82, 15, 0.012, 1, colors.wave1, time, true);
      
      // Draw ripples
      drawRipples(ctx, colors);
      
      time += 0.016;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMoveWithStop);
      window.removeEventListener('click', handleClick);
      clearTimeout(mouseStopTimer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [getColors, initWavePoints, addRipple, updateWavePoints, drawWave, drawRipples, drawParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-5 pointer-events-auto"
      style={{ zIndex: -5 }}
    />
  );
};

export default InteractiveWaves;
