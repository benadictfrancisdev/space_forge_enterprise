import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  showLabel?: boolean;
  className?: string;
}

const ThemeToggle = ({ showLabel = false, className }: ThemeToggleProps) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size={showLabel ? "sm" : "icon"}
      onClick={toggleTheme}
      className={cn(
        "relative rounded-full transition-all duration-300",
        "hover:bg-primary/10 hover:text-primary",
        showLabel && "gap-2 px-3",
        className
      )}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      <Sun className={cn(
        "h-4 w-4 transition-all duration-300",
        theme === 'dark' ? 'rotate-90 scale-0' : 'rotate-0 scale-100'
      )} />
      <Moon className={cn(
        "absolute h-4 w-4 transition-all duration-300",
        theme === 'dark' ? 'rotate-0 scale-100' : '-rotate-90 scale-0',
        showLabel && "relative"
      )} />
      {showLabel && (
        <span className="text-sm">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </span>
      )}
    </Button>
  );
};

export default ThemeToggle;
