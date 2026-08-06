import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Grid3X3 } from "lucide-react";

interface HeatmapChartProps {
  data: Record<string, unknown>[];
  rowKey: string;
  colKey: string;
  valueKey: string;
  title: string;
  colorScale?: "diverging" | "sequential" | "thermal";
}

const HeatmapChart = ({ data, rowKey, colKey, valueKey, title, colorScale = "diverging" }: HeatmapChartProps) => {
  const { matrix, rowLabels, colLabels, minVal, maxVal } = useMemo(() => {
    const rowSet = new Set<string>();
    const colSet = new Set<string>();
    const valMap: Record<string, Record<string, number>> = {};

    data.forEach((row) => {
      const r = String(row[rowKey] ?? "");
      const c = String(row[colKey] ?? "");
      const v = Number(row[valueKey]) || 0;
      rowSet.add(r);
      colSet.add(c);
      if (!valMap[r]) valMap[r] = {};
      valMap[r][c] = v;
    });

    const rowLabels = Array.from(rowSet);
    const colLabels = Array.from(colSet);
    let min = Infinity, max = -Infinity;
    Object.values(valMap).forEach((cols) =>
      Object.values(cols).forEach((v) => {
        if (v < min) min = v;
        if (v > max) max = v;
      })
    );

    return { matrix: valMap, rowLabels, colLabels, minVal: min, maxVal: max };
  }, [data, rowKey, colKey, valueKey]);

  const getColor = (value: number): string => {
    if (colorScale === "diverging") {
      // Red-Yellow-Green diverging (like the reference image)
      const range = Math.max(Math.abs(minVal), Math.abs(maxVal)) || 1;
      const normalized = value / range; // -1 to 1
      if (normalized < -0.6) return "hsl(0, 75%, 40%)";     // Deep red
      if (normalized < -0.3) return "hsl(0, 70%, 55%)";     // Red
      if (normalized < -0.1) return "hsl(20, 75%, 65%)";    // Orange-red
      if (normalized < 0.1) return "hsl(48, 85%, 75%)";     // Yellow
      if (normalized < 0.3) return "hsl(80, 65%, 65%)";     // Yellow-green
      if (normalized < 0.6) return "hsl(100, 55%, 50%)";    // Light green
      return "hsl(120, 50%, 35%)";                           // Deep green
    }
    if (colorScale === "thermal") {
      const norm = maxVal !== minVal ? (value - minVal) / (maxVal - minVal) : 0.5;
      if (norm < 0.2) return "hsl(240, 60%, 30%)";  // Dark blue
      if (norm < 0.4) return "hsl(200, 70%, 45%)";  // Blue
      if (norm < 0.6) return "hsl(60, 80%, 55%)";   // Yellow
      if (norm < 0.8) return "hsl(30, 85%, 50%)";   // Orange
      return "hsl(0, 80%, 45%)";                      // Red
    }
    // Sequential: white to deep green
    const norm = maxVal !== minVal ? (value - minVal) / (maxVal - minVal) : 0.5;
    const lightness = 90 - norm * 55;
    return `hsl(142, 60%, ${lightness}%)`;
  };

  const cellSize = 42;

  if (rowLabels.length === 0 || colLabels.length === 0) {
    return (
      <Card className="linear-card">
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">Need row, column, and value fields to generate heatmap.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="linear-card h-full">
      <CardHeader className="pb-2 border-b border-border">
        <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-primary" />
          {title}
          <Badge variant="outline" className="text-[10px] ml-auto">
            {rowLabels.length}×{colLabels.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        <ScrollArea className="w-full">
          <div className="inline-block">
            {/* Column headers */}
            <div className="flex" style={{ paddingLeft: 80 }}>
              {colLabels.map((col) => (
                <div
                  key={col}
                  className="text-[10px] text-muted-foreground font-medium text-center truncate"
                  style={{ width: cellSize, minWidth: cellSize }}
                >
                  {col}
                </div>
              ))}
            </div>

            {/* Rows */}
            {rowLabels.map((row) => (
              <div key={row} className="flex items-center">
                <div
                  className="text-[10px] text-muted-foreground font-medium truncate text-right pr-2"
                  style={{ width: 80, minWidth: 80 }}
                >
                  {row}
                </div>
                {colLabels.map((col) => {
                  const value = matrix[row]?.[col];
                  const hasValue = value !== undefined;
                  return (
                    <TooltipProvider key={`${row}-${col}`}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className="flex items-center justify-center border border-background/50 text-[10px] font-semibold cursor-default transition-all hover:ring-1 hover:ring-foreground/20 hover:z-10"
                            style={{
                              width: cellSize,
                              height: cellSize - 6,
                              minWidth: cellSize,
                              backgroundColor: hasValue ? getColor(value) : "hsl(var(--muted))",
                              color: hasValue
                                ? Math.abs(value) > (maxVal - minVal) * 0.4 + minVal
                                  ? "white"
                                  : "hsl(var(--foreground))"
                                : "hsl(var(--muted-foreground))",
                            }}
                          >
                            {hasValue ? value.toFixed(1) : "—"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{row} × {col}</p>
                          <p className="text-muted-foreground">{valueKey}: {hasValue ? value.toFixed(2) : "N/A"}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}

            {/* Color legend */}
            <div className="flex items-center gap-2 mt-3 pl-20">
              <span className="text-[10px] text-muted-foreground">{minVal.toFixed(1)}</span>
              <div
                className="h-3 flex-1 rounded-sm"
                style={{
                  background: colorScale === "diverging"
                    ? "linear-gradient(90deg, hsl(0,75%,40%), hsl(20,75%,65%), hsl(48,85%,75%), hsl(80,65%,65%), hsl(120,50%,35%))"
                    : colorScale === "thermal"
                    ? "linear-gradient(90deg, hsl(240,60%,30%), hsl(200,70%,45%), hsl(60,80%,55%), hsl(30,85%,50%), hsl(0,80%,45%))"
                    : "linear-gradient(90deg, hsl(142,60%,90%), hsl(142,60%,35%))",
                  maxWidth: 200,
                }}
              />
              <span className="text-[10px] text-muted-foreground">{maxVal.toFixed(1)}</span>
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default HeatmapChart;
