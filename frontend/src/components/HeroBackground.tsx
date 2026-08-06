const HeroBackground = () => {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
      {/* Base gradient - deep navy to charcoal */}
      <div className="absolute inset-0 bg-gradient-to-b from-[hsl(210,33%,6%)] via-[hsl(210,28%,8%)] to-background" />

      {/* Top teal glow */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] opacity-60"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(20, 184, 166, 0.08) 0%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />

      {/* Left warm accent */}
      <div 
        className="absolute top-1/4 -left-20 w-[500px] h-[500px] opacity-40"
        style={{
          background: 'radial-gradient(circle at center, rgba(249, 115, 22, 0.06) 0%, transparent 60%)',
          filter: 'blur(80px)',
        }}
      />

      {/* Center primary glow */}
      <div 
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[500px] opacity-50"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(31, 111, 235, 0.1) 0%, transparent 60%)',
          filter: 'blur(100px)',
        }}
      />

      {/* Right purple accent */}
      <div 
        className="absolute top-1/2 -right-20 w-[400px] h-[400px] opacity-30"
        style={{
          background: 'radial-gradient(circle at center, rgba(139, 92, 246, 0.08) 0%, transparent 60%)',
          filter: 'blur(70px)',
        }}
      />

      {/* Bottom gradient fade to background */}
      <div className="absolute bottom-0 inset-x-0 h-96 bg-gradient-to-t from-background via-background/80 to-transparent" />

      {/* Glassmorphism panel - left edge */}
      <div 
        className="absolute top-1/4 left-0 w-32 h-96 opacity-20"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          borderRight: '1px solid rgba(255,255,255,0.02)',
        }}
      />

      {/* Glassmorphism panel - right edge */}
      <div 
        className="absolute top-1/3 right-0 w-24 h-64 opacity-15"
        style={{
          background: 'linear-gradient(225deg, rgba(255,255,255,0.03) 0%, transparent 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.02)',
        }}
      />

      {/* Subtle noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(10, 15, 20, 0.4) 100%)',
        }}
      />

      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
};

export default HeroBackground;
