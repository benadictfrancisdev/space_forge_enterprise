import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Settings2,
  Palette,
  Grid3X3,
  Filter,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import DataBarChart from "./DataBarChart";
import DataLineChart from "./DataLineChart";
import DataPieChart from "./DataPieChart";
import DataAreaChart from "./DataAreaChart";
import DataScatterChart from "./DataScatterChart";
import HeatmapChart from "./HeatmapChart";
import AnnotatedStockChart from "./AnnotatedStockChart";
import DeltaBarChart from "./DeltaBarChart";
import { toast } from "sonner";

type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "heatmap" | "stock" | "delta";

interface CustomChartBuilderProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
}

interface ChartConfig {
  id: string;
  type: ChartType;
  title: string;
  xAxis: string;
  yAxis: string;
  colorScheme: string;
  showGrid: boolean;
  showLegend: boolean;
  dataLimit: number;
  filterColumn?: string;
  filterValue?: string;
}

const COLOR_SCHEMES = [
  { id: "default", name: "Default", colors: ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"] },
  { id: "ocean", name: "Ocean", colors: ["#0ea5e9", "#06b6d4", "#14b8a6"] },
  { id: "sunset", name: "Sunset", colors: ["#f97316", "#f59e0b", "#eab308"] },
  { id: "forest", name: "Forest", colors: ["#22c55e", "#10b981", "#059669"] },
  { id: "berry", name: "Berry", colors: ["#a855f7", "#ec4899", "#f43f5e"] },
  { id: "mono", name: "Monochrome", colors: ["#334155", "#64748b", "#94a3b8"] },
];

const CustomChartBuilder = ({ data, columns, columnTypes }: CustomChartBuilderProps) => {
  const [savedCharts, setSavedCharts] = useState<ChartConfig[]>([]);
  const [currentConfig, setCurrentConfig] = useState<ChartConfig>({
    id: crypto.randomUUID(),
    type: "bar",
    title: "Custom Chart",
    xAxis: columns[0] || "",
    yAxis: columns[1] || "",
    colorScheme: "default",
    showGrid: true,
    showLegend: true,
    dataLimit: 50,
  });

  // Get unique values for filter
  const filterValues = useMemo(() => {
    if (!currentConfig.filterColumn) return [];
    const values = new Set(data.map(row => String(row[currentConfig.filterColumn!])));
    return Array.from(values).filter(v => v && v !== 'undefined' && v !== 'null').slice(0, 20);
  }, [data, currentConfig.filterColumn]);

  // Apply filters and limits to data
  const filteredData = useMemo(() => {
    let result = [...data];
    
    if (currentConfig.filterColumn && currentConfig.filterValue) {
      result = result.filter(row => String(row[currentConfig.filterColumn!]) === currentConfig.filterValue);
    }
    
    return result.slice(0, currentConfig.dataLimit);
  }, [data, currentConfig.filterColumn, currentConfig.filterValue, currentConfig.dataLimit]);

  const chartTypeOptions = [
    { value: "bar" as ChartType, label: "Bar", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "line" as ChartType, label: "Line", icon: <LineChart className="h-4 w-4" /> },
    { value: "area" as ChartType, label: "Area", icon: <AreaChart className="h-4 w-4" /> },
    { value: "pie" as ChartType, label: "Pie", icon: <PieChart className="h-4 w-4" /> },
    { value: "scatter" as ChartType, label: "Scatter", icon: <ScatterChart className="h-4 w-4" /> },
    { value: "heatmap" as ChartType, label: "Heatmap", icon: <Grid3X3 className="h-4 w-4" /> },
    { value: "stock" as ChartType, label: "Stock", icon: <LineChart className="h-4 w-4" /> },
    { value: "delta" as ChartType, label: "Delta Bar", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const renderChart = () => {
    if (!currentConfig.xAxis || !currentConfig.yAxis) {
      return (
        <div className="h-64 flex flex-col items-center justify-center text-muted-foreground gap-3">
          <Sparkles className="h-10 w-10 opacity-50" />
          <p className="text-sm">Select X and Y axis columns to preview chart</p>
        </div>
      );
    }

    const props = {
      data: filteredData,
      title: currentConfig.title,
    };

    switch (currentConfig.type) {
      case "bar":
        return <DataBarChart {...props} xKey={currentConfig.xAxis} yKey={currentConfig.yAxis} />;
      case "line":
        return <DataLineChart {...props} xKey={currentConfig.xAxis} yKeys={[currentConfig.yAxis]} />;
      case "area":
        return <DataAreaChart {...props} xKey={currentConfig.xAxis} yKey={currentConfig.yAxis} />;
      case "pie":
        return <DataPieChart {...props} nameKey={currentConfig.xAxis} valueKey={currentConfig.yAxis} />;
      case "scatter":
        return <DataScatterChart {...props} xKey={currentConfig.xAxis} yKey={currentConfig.yAxis} />;
      case "heatmap":
        return <HeatmapChart data={filteredData} rowKey={currentConfig.xAxis} colKey={currentConfig.yAxis} valueKey={currentConfig.filterColumn || currentConfig.yAxis} title={currentConfig.title} />;
      case "stock":
        return <AnnotatedStockChart data={filteredData} dateKey={currentConfig.xAxis} priceKey={currentConfig.yAxis} volumeKey={currentConfig.filterColumn} title={currentConfig.title} />;
      case "delta":
        return <DeltaBarChart data={filteredData} labelKey={currentConfig.xAxis} valueKey={currentConfig.yAxis} title={currentConfig.title} />;
      default:
        return null;
    }
  };

  const handleSaveChart = () => {
    setSavedCharts(prev => [...prev, { ...currentConfig, id: crypto.randomUUID() }]);
    toast.success("Chart saved successfully!");
  };

  const handleDeleteSavedChart = (id: string) => {
    setSavedCharts(prev => prev.filter(c => c.id !== id));
    toast.success("Chart deleted");
  };

  const handleLoadChart = (config: ChartConfig) => {
    setCurrentConfig({ ...config, id: crypto.randomUUID() });
    toast.success("Chart loaded");
  };

  const handleReset = () => {
    setCurrentConfig({
      id: crypto.randomUUID(),
      type: "bar",
      title: "Custom Chart",
      xAxis: columns[0] || "",
      yAxis: columns[1] || "",
      colorScheme: "default",
      showGrid: true,
      showLegend: true,
      dataLimit: 50,
    });
    toast.success("Configuration reset");
  };

  const getColumnBadge = (col: string) => {
    const type = columnTypes[col];
    const styles = {
      numeric: "bg-blue-500/20 text-blue-500 dark:text-blue-400",
      date: "bg-purple-500/20 text-purple-500 dark:text-purple-400",
      categorical: "bg-green-500/20 text-green-500 dark:text-green-400",
    };
    return styles[type] || styles.categorical;
  };

  return (
    <div className="space-y-6">
      {/* Configuration Panel */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Chart Builder</CardTitle>
              <CardDescription>Create custom visualizations from your data</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chart Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Chart Type</Label>
            <div className="flex flex-wrap gap-2">
              {chartTypeOptions.map((option) => (
                <Button
                  key={option.value}
                  variant={currentConfig.type === option.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentConfig(prev => ({ ...prev, type: option.value }))}
                  className={`flex items-center gap-2 transition-all ${
                    currentConfig.type === option.value 
                      ? "shadow-button" 
                      : "hover:border-primary/50"
                  }`}
                >
                  {option.icon}
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
            <Label htmlFor="chart-title" className="text-sm font-medium">Chart Title</Label>
            <Input
              id="chart-title"
              value={currentConfig.title}
              onChange={(e) => setCurrentConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter chart title"
              className="bg-background"
            />
          </div>

          {/* Axis Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">X-Axis / Category</Label>
              <Select
                value={currentConfig.xAxis}
                onValueChange={(value) => setCurrentConfig(prev => ({ ...prev, xAxis: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {columns.filter(col => col && col.trim() !== '').map(col => (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getColumnBadge(col)}`}>
                          {columnTypes[col]?.charAt(0).toUpperCase() || 'C'}
                        </Badge>
                        <span>{col}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Y-Axis / Value</Label>
              <Select
                value={currentConfig.yAxis}
                onValueChange={(value) => setCurrentConfig(prev => ({ ...prev, yAxis: value }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select column" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {columns.filter(col => col && col.trim() !== '').map(col => (
                    <SelectItem key={col} value={col}>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={`text-xs ${getColumnBadge(col)}`}>
                          {columnTypes[col]?.charAt(0).toUpperCase() || 'C'}
                        </Badge>
                        <span>{col}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Color Scheme */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Color Scheme
            </Label>
            <div className="flex flex-wrap gap-2">
              {COLOR_SCHEMES.map((scheme) => (
                <Button
                  key={scheme.id}
                  variant={currentConfig.colorScheme === scheme.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentConfig(prev => ({ ...prev, colorScheme: scheme.id }))}
                  className="flex items-center gap-2"
                >
                  <div className="flex gap-0.5">
                    {scheme.colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-3 h-3 rounded-full ring-1 ring-border"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <span className="hidden sm:inline">{scheme.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Data Filtering */}
          <div className="space-y-3">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Data
            </Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                value={currentConfig.filterColumn || "none"}
                onValueChange={(value) => setCurrentConfig(prev => ({ 
                  ...prev, 
                  filterColumn: value === "none" ? undefined : value,
                  filterValue: undefined 
                }))}
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Filter by column..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="none">No filter</SelectItem>
                  {columns.filter(col => col && col.trim() !== '').map(col => (
                    <SelectItem key={col} value={col}>{col}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {currentConfig.filterColumn && filterValues.length > 0 && (
                <Select
                  value={currentConfig.filterValue || "all"}
                  onValueChange={(value) => setCurrentConfig(prev => ({ 
                    ...prev, 
                    filterValue: value === "all" ? undefined : value 
                  }))}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select value..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    <SelectItem value="all">All values</SelectItem>
                    {filterValues.filter(val => val && val.trim() !== '').map(val => (
                      <SelectItem key={val} value={val}>{val}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Data Limit Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Data Points Limit</Label>
              <Badge variant="secondary">{currentConfig.dataLimit} rows</Badge>
            </div>
            <Slider
              value={[currentConfig.dataLimit]}
              onValueChange={([value]) => setCurrentConfig(prev => ({ ...prev, dataLimit: value }))}
              min={10}
              max={Math.min(500, data.length)}
              step={10}
              className="w-full"
            />
          </div>

          {/* Display Options */}
          <div className="flex flex-wrap gap-6 pt-2">
            <div className="flex items-center gap-3">
              <Switch
                id="show-grid"
                checked={currentConfig.showGrid}
                onCheckedChange={(checked) => setCurrentConfig(prev => ({ ...prev, showGrid: checked }))}
              />
              <Label htmlFor="show-grid" className="text-sm flex items-center gap-2 cursor-pointer">
                <Grid3X3 className="h-4 w-4" />
                Show Grid
              </Label>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="show-legend"
                checked={currentConfig.showLegend}
                onCheckedChange={(checked) => setCurrentConfig(prev => ({ ...prev, showLegend: checked }))}
              />
              <Label htmlFor="show-legend" className="text-sm cursor-pointer">Show Legend</Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
            <Button onClick={handleSaveChart} size="sm" className="flex items-center gap-2">
              <Save className="h-4 w-4" />
              Save Chart
            </Button>
            <Button onClick={handleReset} variant="outline" size="sm" className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chart Preview */}
      <Card className="stat-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">{currentConfig.title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {filteredData.length} data points
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {renderChart()}
        </CardContent>
      </Card>

      {/* Saved Charts */}
      {savedCharts.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Save className="h-4 w-4 text-primary" />
              Saved Charts ({savedCharts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {savedCharts.map((chart) => (
                <Card key={chart.id} className="stat-card">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-medium text-sm">{chart.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} • {chart.xAxis} vs {chart.yAxis}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-primary/10"
                          onClick={() => handleLoadChart(chart)}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-destructive/10 text-destructive"
                          onClick={() => handleDeleteSavedChart(chart.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CustomChartBuilder;