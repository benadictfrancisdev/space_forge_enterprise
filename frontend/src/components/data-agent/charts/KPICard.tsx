import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, LucideIcon } from "lucide-react";
import React from "react";

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconElement?: React.ReactNode;
  color?: "primary" | "success" | "warning" | "danger";
  className?: string;
}

const KPICard = ({ title, value, change, changeLabel, icon: Icon, iconElement, color = "primary", className }: KPICardProps) => {
  const getTrendIcon = () => {
    if (change === undefined || change === 0) return <Minus className="w-3 h-3" />;
    return change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />;
  };

  const getTrendColor = () => {
    if (change === undefined || change === 0) return "text-muted-foreground";
    return change > 0 ? "text-success" : "text-destructive";
  };

  const getIconColor = () => {
    switch (color) {
      case "success": return "bg-success/10 text-success";
      case "warning": return "bg-warning/10 text-warning";
      case "danger": return "bg-destructive/10 text-destructive";
      default: return "bg-primary/10 text-primary";
    }
  };

  const renderIcon = () => {
    // If iconElement is provided, use it directly (already a ReactNode)
    if (iconElement) return iconElement;
    
    // If Icon is a Lucide component, render it
    if (Icon) {
      return <Icon className="w-4 h-4" />;
    }
    
    return null;
  };

  return (
    <Card className={cn("linear-card", className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground truncate mb-1">
              {title}
            </p>
            <p className="text-2xl font-semibold text-foreground tracking-tight">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            
            {change !== undefined && (
              <div className={cn("flex items-center gap-1 mt-2", getTrendColor())}>
                {getTrendIcon()}
                <span className="text-xs font-medium">
                  {change > 0 ? '+' : ''}{change.toFixed(1)}%
                </span>
                {changeLabel && (
                  <span className="text-xs text-muted-foreground ml-1">
                    {changeLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          
          {(Icon || iconElement) && (
            <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", getIconColor())}>
              {renderIcon()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default KPICard;
