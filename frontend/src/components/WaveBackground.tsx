import { useTheme } from "@/hooks/useTheme";

const WaveBackground = () => {
  const { theme } = useTheme();
  
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Ocean gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-ocean-light via-ocean to-ocean-deep dark:from-ocean-deep dark:via-ocean-dark dark:to-background transition-colors duration-500" />
      
      {/* Animated waves */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[40vh] min-h-[300px]"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wave 1 - Back layer */}
        <path
          className="animate-wave-slow fill-ocean-wave/30 dark:fill-ocean-wave-dark/20"
          d="M0,192L48,176C96,160,192,128,288,133.3C384,139,480,181,576,186.7C672,192,768,160,864,154.7C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        
        {/* Wave 2 - Middle layer */}
        <path
          className="animate-wave-medium fill-ocean-wave/50 dark:fill-ocean-wave-dark/30"
          d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,218.7C672,235,768,245,864,234.7C960,224,1056,192,1152,181.3C1248,171,1344,181,1392,186.7L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        
        {/* Wave 3 - Front layer */}
        <path
          className="animate-wave-fast fill-ocean-wave/70 dark:fill-ocean-wave-dark/40"
          d="M0,256L48,261.3C96,267,192,277,288,272C384,267,480,245,576,234.7C672,224,768,224,864,234.7C960,245,1056,267,1152,272C1248,277,1344,267,1392,261.3L1440,256L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
        
        {/* Wave 4 - Foam layer */}
        <path
          className="animate-wave-foam fill-ocean-foam/80 dark:fill-ocean-foam-dark/50"
          d="M0,288L48,282.7C96,277,192,267,288,266.7C384,267,480,277,576,282.7C672,288,768,288,864,282.7C960,277,1056,267,1152,266.7C1248,267,1344,277,1392,282.7L1440,288L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
        />
      </svg>
      
      {/* Floating bubbles */}
      <div className="absolute inset-0">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white/20 dark:bg-white/10 animate-bubble"
            style={{
              width: `${8 + Math.random() * 16}px`,
              height: `${8 + Math.random() * 16}px`,
              left: `${10 + i * 12}%`,
              bottom: '10%',
              animationDelay: `${i * 0.8}s`,
              animationDuration: `${4 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>
      
      {/* Light rays effect */}
      <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent dark:from-ocean-glow/10" />
    </div>
  );
};

export default WaveBackground;
