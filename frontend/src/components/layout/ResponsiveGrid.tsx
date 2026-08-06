import { cn } from "@/lib/utils";

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    base?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: "sm" | "md" | "lg";
}

const ResponsiveGrid = ({ 
  children, 
  className, 
  cols = { base: 1, sm: 2, md: 3, lg: 4 },
  gap = "md"
}: ResponsiveGridProps) => {
  const gapClasses = {
    sm: "gap-2 sm:gap-3",
    md: "gap-3 sm:gap-4 lg:gap-6",
    lg: "gap-4 sm:gap-6 lg:gap-8"
  };

  // Build grid column classes dynamically
  const colClasses = [
    cols.base && `grid-cols-${cols.base}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
  ].filter(Boolean).join(" ");

  return (
    <div 
      className={cn(
        "grid",
        gapClasses[gap],
        colClasses,
        className
      )}
    >
      {children}
    </div>
  );
};

export default ResponsiveGrid;
