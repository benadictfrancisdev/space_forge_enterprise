import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "@/hooks/useTheme";

interface Fish {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  tailPhase: number;
  type: 'fish' | 'jellyfish' | 'bubble';
  pulsePhase: number;
}

const SeaCreatures = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const creaturesRef = useRef<Fish[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>();
  const { theme } = useTheme();

  const getColors = useCallback(() => {
    if (theme === 'dark') {
      return {
        fish: [
          'rgba(56, 189, 248, 0.8)',
          'rgba(34, 211, 238, 0.8)',
          'rgba(125, 211, 252, 0.7)',
          'rgba(96, 165, 250, 0.8)',
          'rgba(147, 197, 253, 0.7)',
        ],
        jellyfish: [
          'rgba(192, 132, 252, 0.6)',
          'rgba(244, 114, 182, 0.5)',
          'rgba(251, 146, 60, 0.5)',
        ],
        bubble: 'rgba(255, 255, 255, 0.3)',
      };
    }
    return {
      fish: [
        'rgba(14, 165, 233, 0.9)',
        'rgba(6, 182, 212, 0.9)',
        'rgba(56, 189, 248, 0.8)',
        'rgba(59, 130, 246, 0.9)',
        'rgba(99, 102, 241, 0.8)',
      ],
      jellyfish: [
        'rgba(168, 85, 247, 0.7)',
        'rgba(236, 72, 153, 0.6)',
        'rgba(249, 115, 22, 0.6)',
      ],
      bubble: 'rgba(255, 255, 255, 0.5)',
    };
  }, [theme]);

  const initCreatures = useCallback((width: number, height: number) => {
    const colors = getColors();
    const creatures: Fish[] = [];
    
    // Add fish
    for (let i = 0; i < 8; i++) {
      creatures.push({
        x: Math.random() * width,
        y: height * 0.5 + Math.random() * (height * 0.4),
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 0.5,
        size: 12 + Math.random() * 10,
        color: colors.fish[Math.floor(Math.random() * colors.fish.length)],
        tailPhase: Math.random() * Math.PI * 2,
        type: 'fish',
        pulsePhase: 0,
      });
    }
    
    // Add jellyfish
    for (let i = 0; i < 4; i++) {
      creatures.push({
        x: Math.random() * width,
        y: height * 0.4 + Math.random() * (height * 0.4),
        vx: (Math.random() - 0.5) * 0.5,
        vy: -0.2 - Math.random() * 0.3,
        size: 18 + Math.random() * 12,
        color: colors.jellyfish[Math.floor(Math.random() * colors.jellyfish.length)],
        tailPhase: Math.random() * Math.PI * 2,
        type: 'jellyfish',
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    
    // Add small bubbles
    for (let i = 0; i < 12; i++) {
      creatures.push({
        x: Math.random() * width,
        y: height * 0.6 + Math.random() * (height * 0.4),
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.5 - Math.random() * 0.5,
        size: 3 + Math.random() * 5,
        color: colors.bubble,
        tailPhase: 0,
        type: 'bubble',
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    
    creaturesRef.current = creatures;
  }, [getColors]);

  const drawFish = useCallback((ctx: CanvasRenderingContext2D, fish: Fish, time: number) => {
    const { x, y, size, color, tailPhase, vx } = fish;
    const direction = vx >= 0 ? 1 : -1;
    const tailWag = Math.sin(time * 8 + tailPhase) * 0.3;
    
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(direction, 1);
    
    // Body
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Tail
    ctx.beginPath();
    ctx.moveTo(-size * 0.8, 0);
    ctx.quadraticCurveTo(
      -size * 1.3, -size * 0.4 + tailWag * size,
      -size * 1.5, -size * 0.3 + tailWag * size
    );
    ctx.quadraticCurveTo(
      -size * 1.3, tailWag * size,
      -size * 1.5, size * 0.3 + tailWag * size
    );
    ctx.quadraticCurveTo(
      -size * 1.3, size * 0.4 + tailWag * size,
      -size * 0.8, 0
    );
    ctx.fillStyle = color;
    ctx.fill();
    
    // Dorsal fin
    ctx.beginPath();
    ctx.moveTo(-size * 0.2, -size * 0.4);
    ctx.quadraticCurveTo(0, -size * 0.8, size * 0.2, -size * 0.4);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Eye
    ctx.beginPath();
    ctx.arc(size * 0.4, -size * 0.1, size * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(size * 0.42, -size * 0.1, size * 0.06, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fill();
    
    ctx.restore();
  }, []);

  const drawJellyfish = useCallback((ctx: CanvasRenderingContext2D, jelly: Fish, time: number) => {
    const { x, y, size, color, pulsePhase } = jelly;
    const pulse = Math.sin(time * 2 + pulsePhase) * 0.15;
    const bellWidth = size * (1 + pulse);
    const bellHeight = size * 0.7 * (1 - pulse * 0.5);
    
    ctx.save();
    ctx.translate(x, y);
    
    // Glow effect
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.5);
    gradient.addColorStop(0, color.replace('0.6', '0.3').replace('0.5', '0.2').replace('0.7', '0.3'));
    gradient.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(0, 0, size * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Bell (dome)
    ctx.beginPath();
    ctx.ellipse(0, 0, bellWidth, bellHeight, 0, Math.PI, 0);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Inner bell detail
    ctx.beginPath();
    ctx.ellipse(0, bellHeight * 0.2, bellWidth * 0.6, bellHeight * 0.5, 0, Math.PI, 0);
    ctx.fillStyle = color.replace('0.6', '0.3').replace('0.5', '0.2').replace('0.7', '0.4');
    ctx.fill();
    
    // Tentacles
    const tentacleCount = 6;
    for (let i = 0; i < tentacleCount; i++) {
      const tx = (i - tentacleCount / 2 + 0.5) * (bellWidth * 0.35);
      const wave1 = Math.sin(time * 3 + i * 0.8 + pulsePhase) * 8;
      const wave2 = Math.sin(time * 2.5 + i * 1.2 + pulsePhase) * 5;
      
      ctx.beginPath();
      ctx.moveTo(tx, bellHeight * 0.1);
      ctx.quadraticCurveTo(
        tx + wave1, bellHeight + size * 0.5,
        tx + wave2, bellHeight + size * 1.2
      );
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    
    // Frilly edges
    const frillyCount = 12;
    for (let i = 0; i < frillyCount; i++) {
      const angle = Math.PI + (i / frillyCount) * Math.PI;
      const fx = Math.cos(angle) * bellWidth;
      const fy = Math.sin(angle) * bellHeight * 0.3;
      const wave = Math.sin(time * 4 + i * 0.5) * 3;
      
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + wave, fy + size * 0.3, fx, fy + size * 0.4);
      ctx.strokeStyle = color.replace('0.6', '0.4').replace('0.5', '0.3');
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    
    ctx.restore();
  }, []);

  const drawBubble = useCallback((ctx: CanvasRenderingContext2D, bubble: Fish, time: number) => {
    const { x, y, size, color, pulsePhase } = bubble;
    const wobble = Math.sin(time * 3 + pulsePhase) * 2;
    
    ctx.beginPath();
    ctx.arc(x + wobble, y, size, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    
    // Highlight
    ctx.beginPath();
    ctx.arc(x + wobble - size * 0.3, y - size * 0.3, size * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (creaturesRef.current.length === 0) {
        initCreatures(canvas.width, canvas.height);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const { x: mouseX, y: mouseY } = mouseRef.current;
      
      creaturesRef.current.forEach((creature) => {
        // Mouse avoidance
        const dx = creature.x - mouseX;
        const dy = creature.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const avoidRadius = 120;
        
        if (distance < avoidRadius && distance > 0) {
          const force = (avoidRadius - distance) / avoidRadius;
          const avoidStrength = creature.type === 'jellyfish' ? 0.3 : 0.5;
          creature.vx += (dx / distance) * force * avoidStrength;
          creature.vy += (dy / distance) * force * avoidStrength;
        }
        
        // Update position
        creature.x += creature.vx;
        creature.y += creature.vy;
        
        // Boundary behavior
        const margin = 50;
        if (creature.type === 'fish') {
          // Fish wrap around horizontally
          if (creature.x < -margin) creature.x = canvas.width + margin;
          if (creature.x > canvas.width + margin) creature.x = -margin;
          
          // Keep fish in lower portion
          const minY = canvas.height * 0.45;
          const maxY = canvas.height * 0.95;
          if (creature.y < minY) creature.vy += 0.05;
          if (creature.y > maxY) creature.vy -= 0.05;
          
          // Speed limits
          creature.vx = Math.max(-2, Math.min(2, creature.vx));
          creature.vy = Math.max(-0.8, Math.min(0.8, creature.vy));
          
          // Gradually return to cruising speed
          if (Math.abs(creature.vx) < 0.5) {
            creature.vx += creature.vx >= 0 ? 0.02 : -0.02;
          }
          
          drawFish(ctx, creature, time);
        } else if (creature.type === 'jellyfish') {
          // Jellyfish wrap around
          if (creature.x < -margin) creature.x = canvas.width + margin;
          if (creature.x > canvas.width + margin) creature.x = -margin;
          
          // Reset when reaching top
          if (creature.y < canvas.height * 0.2) {
            creature.y = canvas.height + margin;
          }
          if (creature.y > canvas.height + margin) {
            creature.y = canvas.height * 0.3;
          }
          
          // Gentle upward drift with wobble
          creature.vy = Math.max(-0.8, Math.min(0.3, creature.vy));
          if (creature.vy > -0.2) creature.vy -= 0.01;
          
          creature.vx *= 0.98; // Slow horizontal drift
          
          drawJellyfish(ctx, creature, time);
        } else if (creature.type === 'bubble') {
          // Bubbles rise and reset
          if (creature.y < canvas.height * 0.3) {
            creature.y = canvas.height + 20;
            creature.x = Math.random() * canvas.width;
          }
          
          creature.vy = Math.max(-1.5, creature.vy);
          creature.vx *= 0.95;
          
          drawBubble(ctx, creature, time);
        }
        
        // Apply friction
        creature.vx *= 0.995;
        creature.vy *= 0.995;
      });
      
      time += 0.016;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [initCreatures, drawFish, drawJellyfish, drawBubble]);

  // Reinitialize creatures when theme changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      initCreatures(canvas.width, canvas.height);
    }
  }, [theme, initCreatures]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -4 }}
    />
  );
};

export default SeaCreatures;
