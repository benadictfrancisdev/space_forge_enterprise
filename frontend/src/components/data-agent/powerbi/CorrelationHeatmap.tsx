import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Grid3X3, TrendingUp, TrendingDown } from "lucide-react";

interface Correlation {
  column1: string;
  column2: string;
  coefficient: number;
  strength: "strong" | "moderate" | "weak" | "none";
  direction: "positive" | "negative" | "none";
}

interface CorrelationHeatmapProps {
  correlations: Correlation[];
  numericColumns: string[];
}

export const CorrelationHeatmap = ({ correlations, numericColumns }: CorrelationHeatmapProps) => {
  // Build correlation matrix
  const correlationMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, number>> = {};
    
    // Initialize matrix with 1s on diagonal
    numericColumns.forEach(col => {
      matrix[col] = {};
      numericColumns.forEach(col2 => {
        matrix[col][col2] = col === col2 ? 1 : 0;
      });
    });
    
    // Fill in correlations (symmetric)
    correlations.forEach(corr => {
      if (matrix[corr.column1] && matrix[corr.column2]) {
        matrix[corr.column1][corr.column2] = corr.coefficient;
        matrix[corr.column2][corr.column1] = corr.coefficient;
      }
    });
    
    return matrix;
  }, [correlations, numericColumns]);

  // Get color for correlation value
  const getCorrelationColor = (value: number): string => {
    const absValue = Math.abs(value);
    if (value === 1) return "hsl(var(--primary))";
    if (value > 0) {
      // Positive: green gradient
      if (absValue >= 0.7) return "hsl(142, 76%, 36%)";
      if (absValue >= 0.4) return "hsl(142, 71%, 45%)";
      if (absValue >= 0.2) return "hsl(142, 69%, 58%)";
      return "hsl(142, 77%, 73%)";
    } else {
      // Negative: red gradient
      if (absValue >= 0.7) return "hsl(0, 84%, 40%)";
      if (absValue >= 0.4) return "hsl(0, 72%, 51%)";
      if (absValue >= 0.2) return "hsl(0, 84%, 60%)";
      return "hsl(0, 93%, 74%)";
    }
  };

  const getTextColor = (value: number): string => {
    const absValue = Math.abs(value);
    return absValue >= 0.4 ? "white" : "hsl(var(--foreground))";
  };

  if (numericColumns.length < 2) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Grid3X3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Need at least 2 numeric columns for correlation heatmap</p>
      </div>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-transparent border-purple-500/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Grid3X3 className="h-5 w-5 text-purple-500" />
            Correlation Heatmap
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <span className="text-muted-foreground">Positive</span>
            </div>
            <div className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              <span className="text-muted-foreground">Negative</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 76%, 36%)" }} />
            <span className="text-xs text-muted-foreground">Strong +</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(142, 77%, 73%)" }} />
            <span className="text-xs text-muted-foreground">Weak +</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 93%, 74%)" }} />
            <span className="text-xs text-muted-foreground">Weak -</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "hsl(0, 84%, 40%)" }} />
            <span className="text-xs text-muted-foreground">Strong -</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full">
          <div className="min-w-max">
            <TooltipProvider>
              <div className="grid" style={{ 
                gridTemplateColumns: `120px repeat(${numericColumns.length}, 60px)`,
                gap: "2px"
              }}>
                {/* Header row */}
                <div className="h-12" /> {/* Empty corner cell */}
                {numericColumns.map((col) => (
                  <div 
                    key={`header-${col}`} 
                    className="h-12 flex items-end justify-center pb-1"
                  >
                    <span 
                      className="text-xs font-medium text-muted-foreground transform -rotate-45 origin-bottom-left whitespace-nowrap truncate max-w-[80px]"
                      title={col}
                    >
                      {col.length > 10 ? `${col.slice(0, 10)}...` : col}
                    </span>
                  </div>
                ))}

                {/* Data rows */}
                {numericColumns.map((row) => (
                  <>
                    <div 
                      key={`row-label-${row}`}
                      className="h-10 flex items-center pr-2 justify-end"
                    >
                      <span 
                        className="text-xs font-medium text-muted-foreground truncate max-w-[110px]"
                        title={row}
                      >
                        {row.length > 12 ? `${row.slice(0, 12)}...` : row}
                      </span>
                    </div>
                    {numericColumns.map((col) => {
                      const value = correlationMatrix[row]?.[col] ?? 0;
                      const isDiagonal = row === col;
                      
                      return (
                        <Tooltip key={`cell-${row}-${col}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`h-10 w-[60px] flex items-center justify-center rounded cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${
                                isDiagonal ? "ring-2 ring-primary/30" : ""
                              }`}
                              style={{ 
                                backgroundColor: getCorrelationColor(value),
                                color: getTextColor(value)
                              }}
                            >
                              <span className="text-xs font-mono font-medium">
                                {value.toFixed(2)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold text-sm">{row} ↔ {col}</p>
                              <p className="text-xs">
                                Correlation: <span className="font-mono">{value.toFixed(4)}</span>
                              </p>
                              {!isDiagonal && (
                                <Badge variant="secondary" className="text-xs">
                                  {Math.abs(value) >= 0.7 ? "Strong" : 
                                   Math.abs(value) >= 0.4 ? "Moderate" : 
                                   Math.abs(value) >= 0.2 ? "Weak" : "None"}
                                  {" "}
                                  {value > 0.1 ? "Positive" : value < -0.1 ? "Negative" : ""}
                                </Badge>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </>
                ))}
              </div>
            </TooltipProvider>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default CorrelationHeatmap;
