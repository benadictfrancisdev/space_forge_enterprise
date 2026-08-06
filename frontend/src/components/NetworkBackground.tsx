import { useEffect, useRef, useCallback } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface DataNode {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  radius: number;
  color: 'teal' | 'blue' | 'purple';
  glowIntensity: number;
  pulsePhase: number;
}

interface Hexagon {
  x: number;
  y: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
}

const COLORS = {
  teal: { r: 20, g: 184, b: 166 },
  blue: { r: 31, g: 111, b: 235 },
  purple: { r: 139, g: 92, b: 246 },
};

const NetworkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<DataNode[]>([]);
  const hexagonsRef = useRef<Hexagon[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const isMobile = useIsMobile();

  const getNodeColor = useCallback((color: 'teal' | 'blue' | 'purple', alpha: number) => {
    const c = COLORS[color];
    return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`;
  }, []);

  const createNodes = useCallback((width: number, height: number) => {
    const nodeCount = isMobile ? 25 : 40;
    const nodes: DataNode[] = [];
    const colors: ('teal' | 'blue' | 'purple')[] = ['teal', 'blue', 'purple'];

    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: Math.random(),
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        glowIntensity: 0.5 + Math.random() * 0.5,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }
    return nodes;
  }, [isMobile]);

  const createHexagons = useCallback((width: number, height: number) => {
    const hexagons: Hexagon[] = [];
    const positions = [
      { x: width * 0.15, y: height * 0.3 },
      { x: width * 0.85, y: height * 0.25 },
      { x: width * 0.7, y: height * 0.7 },
      { x: width * 0.25, y: height * 0.75 },
    ];

    positions.forEach((pos) => {
      hexagons.push({
        x: pos.x,
        y: pos.y,
        size: 80 + Math.random() * 120,
        rotation: Math.random() * Math.PI,
        rotationSpeed: (Math.random() - 0.5) * 0.001,
      });
    });
    return hexagons;
  }, []);

  const drawHexagon = useCallback((
    ctx: CanvasRenderingContext2D,
    hex: Hexagon
  ) => {
    ctx.save();
    ctx.translate(hex.x, hex.y);
    ctx.rotate(hex.rotation);
    ctx.beginPath();

    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 2;
      const px = Math.cos(angle) * hex.size;
      const py = Math.sin(angle) * hex.size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();
    ctx.strokeStyle = 'rgba(20, 184, 166, 0.04)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }, []);

  const drawConnections = useCallback((
    nodes: DataNode[],
    ctx: CanvasRenderingContext2D,
    mouseX: number,
    mouseY: number
  ) => {
    const maxDistance = 150;

    nodes.forEach((node, i) => {
      nodes.slice(i + 1).forEach((other) => {
        const distance = Math.hypot(node.x - other.x, node.y - other.y);
        if (distance < maxDistance) {
          const opacity = (1 - distance / maxDistance) * 0.25;
          
          // Brighten near mouse
          const mouseDist = Math.hypot(
            (node.x + other.x) / 2 - mouseX,
            (node.y + other.y) / 2 - mouseY
          );
          const mouseBoost = Math.max(0, 1 - mouseDist / 200) * 0.15;

          ctx.strokeStyle = `rgba(20, 184, 166, ${opacity + mouseBoost})`;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(node.x, node.y);
          ctx.lineTo(other.x, other.y);
          ctx.stroke();
        }
      });
    });
  }, []);

  const drawNode = useCallback((
    node: DataNode,
    ctx: CanvasRenderingContext2D,
    time: number
  ) => {
    const pulse = Math.sin(time * 0.002 + node.pulsePhase) * 0.3 + 0.7;
    const glowRadius = node.radius * 3 * pulse;

    // Glow effect
    const gradient = ctx.createRadialGradient(
      node.x, node.y, 0,
      node.x, node.y, glowRadius
    );
    gradient.addColorStop(0, getNodeColor(node.color, 0.6 * node.glowIntensity));
    gradient.addColorStop(0.4, getNodeColor(node.color, 0.2 * node.glowIntensity));
    gradient.addColorStop(1, 'transparent');

    ctx.beginPath();
    ctx.arc(node.x, node.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(node.x, node.y, node.radius * (0.8 + node.z * 0.4), 0, Math.PI * 2);
    ctx.fillStyle = getNodeColor(node.color, 0.85);
    ctx.fill();
  }, [getNodeColor]);

  const updateNodes = useCallback((
    nodes: DataNode[],
    width: number,
    height: number,
    mouseX: number,
    mouseY: number
  ) => {
    nodes.forEach((node) => {
      // Gentle mouse attraction
      const dx = mouseX - node.x;
      const dy = mouseY - node.y;
      const dist = Math.hypot(dx, dy);
      
      if (dist < 200 && dist > 0) {
        const force = (200 - dist) / 200 * 0.01;
        node.vx += (dx / dist) * force;
        node.vy += (dy / dist) * force;
      }

      // Apply velocity with damping
      node.x += node.vx;
      node.y += node.vy;
      node.vx *= 0.99;
      node.vy *= 0.99;

      // Add slight random movement
      node.vx += (Math.random() - 0.5) * 0.02;
      node.vy += (Math.random() - 0.5) * 0.02;

      // Boundary wrapping
      if (node.x < -50) node.x = width + 50;
      if (node.x > width + 50) node.x = -50;
      if (node.y < -50) node.y = height + 50;
      if (node.y > height + 50) node.y = -50;
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      nodesRef.current = createNodes(window.innerWidth, window.innerHeight);
      hexagonsRef.current = createHexagons(window.innerWidth, window.innerHeight);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    let lastTime = 0;
    const targetFPS = 30;
    const frameInterval = 1000 / targetFPS;

    const animate = (time: number) => {
      if (time - lastTime >= frameInterval) {
        lastTime = time;

        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

        // Update hexagons
        hexagonsRef.current.forEach((hex) => {
          hex.rotation += hex.rotationSpeed;
          drawHexagon(ctx, hex);
        });

        // Update and draw nodes
        updateNodes(
          nodesRef.current,
          window.innerWidth,
          window.innerHeight,
          mouseRef.current.x,
          mouseRef.current.y
        );

        drawConnections(
          nodesRef.current,
          ctx,
          mouseRef.current.x,
          mouseRef.current.y
        );

        nodesRef.current.forEach((node) => {
          drawNode(node, ctx, time);
        });
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, [createNodes, createHexagons, drawHexagon, drawConnections, drawNode, updateNodes]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
    />
  );
};

export default NetworkBackground;
