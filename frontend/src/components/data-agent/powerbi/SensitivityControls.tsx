import { Button } from "@/components/ui/button";
import { EyeOff, Eye, Lock } from "lucide-react";

interface SensitivityControlsProps {
  isBlurred: boolean;
  onToggleBlur: () => void;
}

const SensitivityControls = ({ isBlurred, onToggleBlur }: SensitivityControlsProps) => {
  return (
    <Button
      variant={isBlurred ? "default" : "outline"}
      size="sm"
      onClick={onToggleBlur}
      className={`gap-1.5 shrink-0 ${isBlurred ? "bg-gradient-to-r from-slate-600 to-slate-800" : ""}`}
    >
      {isBlurred ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      <span className="hidden sm:inline">{isBlurred ? "Investor View" : "Show Values"}</span>
    </Button>
  );
};

export default SensitivityControls;
