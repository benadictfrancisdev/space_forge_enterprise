import { cn } from "@/lib/utils";
import logoImage from "@/assets/spaceforge-logo-hd.png";

interface LogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  iconOnly?: boolean;
}

const Logo = ({ className, size = "md", showText = true, iconOnly = false }: LogoProps) => {
  const iconSizes = {
    sm: 28,
    md: 34,
    lg: 44,
    xl: 56,
  };

  const textSizes = {
    sm: "text-[15px]",
    md: "text-[18px]",
    lg: "text-[22px]",
    xl: "text-[28px]",
  };

  const s = iconSizes[size];

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Official Logo Image */}
      <img
        src={logoImage}
        alt="SpaceForge AI"
        width={s}
        height={s}
        className="shrink-0 object-contain"
        style={{ width: s, height: s }}
      />

      {/* Refined wordmark — Space Grotesk, two-tone weight */}
      {showText && !iconOnly && (
        <span
          className={cn(
            textSizes[size],
            "leading-none flex items-baseline tracking-tight text-foreground"
          )}
          style={{
            fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
            letterSpacing: "-0.025em",
          }}
        >
          <span className="font-medium">Space</span>
          <span className="font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Forge
          </span>
        </span>
      )}
    </div>
  );
};

export default Logo;
