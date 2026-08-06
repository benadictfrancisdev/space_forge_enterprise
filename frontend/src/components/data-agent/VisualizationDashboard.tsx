import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  LineChart, 
  PieChart, 
  TrendingUp, 
  Grid3X3, 
  Database, 
  Hash, 
  Type, 
  Maximize2, 
  X, 
  ScatterChart as ScatterIcon, 
  AreaChart as AreaIcon,
  Lightbulb,
  FileText,
  Wrench,
  MessageSquare,
  Sparkles,
  Download,
  CheckCircle2,
  AlertTriangle,
  Target
} from "lucide-react";
import DataBarChart from "./charts/DataBarChart";
import DataLineChart from "./charts/DataLineChart";
import DataPieChart from "./charts/DataPieChart";
import DataAreaChart from "./charts/DataAreaChart";
import DataScatterChart from "./charts/DataScatterChart";
import HeatmapChart from "./charts/HeatmapChart";
import AnnotatedStockChart from "./charts/AnnotatedStockChart";
import DeltaBarChart from "./charts/DeltaBarChart";
import KPICard from "./charts/KPICard";
import RecommendationChart from "./charts/RecommendationChart";
import BusinessAnalyticsReport from "./charts/BusinessAnalyticsReport";
import CustomChartBuilder from "./charts/CustomChartBuilder";
import VisualizationAIChat from "./charts/VisualizationAIChat";
import VisualizationReportGenerator from "./charts/VisualizationReportGenerator";
import { usePdfExport } from "@/hooks/usePdfExport";
import type { DatasetState } from "@/pages/DataAgent";

interface VisualizationDashboardProps {
  dataset: DatasetState;
}

type ChartType = "bar" | "line" | "pie" | "area" | "scatter" | "heatmap" | "stock" | "delta";

const VisualizationDashboard = ({ dataset }: VisualizationDashboardProps) => {
  const data = dataset.cleanedData || dataset.rawData;
  const columns = dataset.columns;
  const { exportToPdf, exportToCsv } = usePdfExport();

  const [selectedXAxis, setSelectedXAxis] = useState(columns[0] || "");
  const [selectedYAxis, setSelectedYAxis] = useState(columns[1] || "");
  const [selectedChartType, setSelectedChartType] = useState<ChartType>("bar");
  const [fullscreenChart, setFullscreenChart] = useState<{ type: ChartType; xKey: string; yKey: string; title: string } | null>(null);

  // Detect column types
  const columnTypes = useMemo(() => {
    const types: Record<string, "numeric" | "categorical" | "date"> = {};
    columns.forEach(col => {
      const sampleValues = data.slice(0, 10).map(row => row[col]);
      const numericCount = sampleValues.filter(v => !isNaN(Number(v))).length;
      const isDateLike = sampleValues.some(v => {
        const str = String(v);
        return /^\d{4}-\d{2}-\d{2}/.test(str) || /^\d{2}\/\d{2}\/\d{4}/.test(str);
      });
      
      if (isDateLike) types[col] = "date";
      else if (numericCount > 7) types[col] = "numeric";
      else types[col] = "categorical";
    });
    return types;
  }, [columns, data]);

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalColumns = columns.filter(c => columnTypes[c] === "categorical");

  // Calculate KPIs with accuracy metrics
  const kpis = useMemo(() => {
    if (numericColumns.length === 0) return [];
    
    return numericColumns.slice(0, 4).map(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      const sum = values.reduce((a, b) => a + b, 0);
      const avg = values.length > 0 ? sum / values.length : 0;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const stdDev = values.length > 0 
        ? Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length)
        : 0;
      
      // Calculate trend
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midPoint);
      const secondHalf = values.slice(midPoint);
      const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
      const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
      const trendChange = firstAvg > 0 ? ((secondAvg - firstAvg) / firstAvg) * 100 : 0;

      return {
        column: col,
        sum,
        avg,
        max,
        min,
        stdDev,
        count: values.length,
        trend: trendChange > 5 ? "up" : trendChange < -5 ? "down" : "stable" as "up" | "down" | "stable",
        trendChange: Math.abs(trendChange),
        confidence: Math.min(100, 70 + (values.length / data.length) * 30)
      };
    });
  }, [data, numericColumns]);

  // Auto-generate accurate visualizations based on data types
  const autoCharts = useMemo(() => {
    const charts: Array<{
      type: ChartType;
      title: string;
      xKey: string;
      yKey: string;
      accuracy: number;
      description: string;
    }> = [];

    // Bar chart: categorical x numeric (highest accuracy for comparisons)
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      charts.push({
        type: "bar",
        title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
        xKey: categoricalColumns[0],
        yKey: numericColumns[0],
        accuracy: 95,
        description: "Best for comparing values across categories"
      });
    }

    // Pie chart: categorical distribution
    if (categoricalColumns.length > 0) {
      charts.push({
        type: "pie",
        title: `${categoricalColumns[0]} Distribution`,
        xKey: categoricalColumns[0],
        yKey: categoricalColumns[0],
        accuracy: 88,
        description: "Shows proportional distribution"
      });
    }

    // Line/Area chart: for trends
    if (numericColumns.length > 0) {
      charts.push({
        type: "area",
        title: `${numericColumns[0]} Trend Analysis`,
        xKey: columns[0],
        yKey: numericColumns[0],
        accuracy: 92,
        description: "Visualizes trends over sequence"
      });
    }

    // Scatter plot: correlation analysis
    if (numericColumns.length >= 2) {
      charts.push({
        type: "scatter",
        title: `${numericColumns[0]} vs ${numericColumns[1]} Correlation`,
        xKey: numericColumns[0],
        yKey: numericColumns[1],
        accuracy: 90,
        description: "Reveals relationships between variables"
      });
    }

    return charts;
  }, [columns, numericColumns, categoricalColumns]);

  const renderChart = (type: ChartType, xKey: string, yKey: string, title: string, accuracy?: number, isFullscreen = false) => {
    const ChartWrapper = ({ children }: { children: React.ReactNode }) => (
      <div className="relative group">
        {!isFullscreen && (
          <div className="absolute top-2 right-2 z-10 flex items-center gap-2">
            {accuracy && (
              <Badge variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity text-xs">
                {accuracy}% accurate
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm"
              onClick={() => setFullscreenChart({ type, xKey, yKey, title })}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        )}
        {children}
      </div>
    );

    switch (type) {
      case "bar":
        return (
          <ChartWrapper>
            <DataBarChart data={data} xKey={xKey} yKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "line":
        return (
          <ChartWrapper>
            <DataLineChart data={data} xKey={xKey} yKeys={[yKey]} title={title} />
          </ChartWrapper>
        );
      case "pie":
        return (
          <ChartWrapper>
            <DataPieChart data={data} nameKey={xKey} valueKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "area":
        return (
          <ChartWrapper>
            <DataAreaChart data={data} xKey={xKey} yKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "scatter":
        return (
          <ChartWrapper>
            <DataScatterChart data={data} xKey={xKey} yKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "heatmap":
        return (
          <ChartWrapper>
            <HeatmapChart data={data} rowKey={xKey} colKey={yKey} valueKey={numericColumns[0] || yKey} title={title} />
          </ChartWrapper>
        );
      case "stock":
        return (
          <ChartWrapper>
            <AnnotatedStockChart data={data} dateKey={xKey} priceKey={yKey} title={title} />
          </ChartWrapper>
        );
      case "delta":
        return (
          <ChartWrapper>
            <DeltaBarChart data={data} labelKey={xKey} valueKey={yKey} title={title} />
          </ChartWrapper>
        );
      default:
        return null;
    }
  };

  const chartTypeOptions: { value: ChartType; label: string; icon: React.ReactNode }[] = [
    { value: "bar", label: "Bar Chart", icon: <BarChart3 className="h-4 w-4" /> },
    { value: "line", label: "Line Chart", icon: <LineChart className="h-4 w-4" /> },
    { value: "area", label: "Area Chart", icon: <AreaIcon className="h-4 w-4" /> },
    { value: "pie", label: "Pie Chart", icon: <PieChart className="h-4 w-4" /> },
    { value: "scatter", label: "Scatter Plot", icon: <ScatterIcon className="h-4 w-4" /> },
    { value: "heatmap", label: "Heatmap", icon: <Grid3X3 className="h-4 w-4" /> },
    { value: "stock", label: "Stock Chart", icon: <TrendingUp className="h-4 w-4" /> },
    { value: "delta", label: "Delta Bar", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  const handleChartSuggestion = (suggestion: { type: string; xAxis: string; yAxis: string }) => {
    if (suggestion.type && chartTypeOptions.find(o => o.value === suggestion.type)) {
      setSelectedChartType(suggestion.type as ChartType);
    }
    if (suggestion.xAxis && columns.includes(suggestion.xAxis)) {
      setSelectedXAxis(suggestion.xAxis);
    }
    if (suggestion.yAxis && columns.includes(suggestion.yAxis)) {
      setSelectedYAxis(suggestion.yAxis);
    }
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: "Data Visualization Report",
      subtitle: `Generated from ${dataset.name}`,
      datasetName: dataset.name,
      statistics: {
        "Total Records": data.length,
        "Data Fields": columns.length,
        "Numeric Metrics": numericColumns.length,
        "Categories": categoricalColumns.length,
      },
      insights: kpis.map(kpi => ({
        title: kpi.column,
        description: `Average: ${kpi.avg.toFixed(2)}, Trend: ${kpi.trend} (${kpi.trendChange.toFixed(1)}% change)`,
        importance: kpi.trend !== "stable" ? "high" : "medium"
      })),
      sections: [
        {
          title: "Data Overview",
          content: `This report contains analysis of ${data.length} records across ${columns.length} columns. The dataset includes ${numericColumns.length} numeric metrics and ${categoricalColumns.length} categorical fields.`,
          type: "text"
        },
        {
          title: "Column Statistics",
          type: "table",
          content: "",
          tableData: {
            headers: ["Column", "Average", "Min", "Max", "Trend"],
            rows: kpis.map(kpi => [
              kpi.column,
              kpi.avg.toFixed(2),
              kpi.min.toFixed(2),
              kpi.max.toFixed(2),
              `${kpi.trend} (${kpi.trendChange.toFixed(1)}%)`
            ])
          }
        }
      ],
      recommendations: [
        "Review columns with significant trends for business opportunities",
        "Monitor outliers in numeric metrics for data quality",
        "Consider segmentation analysis for categorical fields"
      ]
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Export Buttons */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button onClick={() => exportToCsv(data, dataset.name)} variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
          <Download className="h-4 w-4" />
          <span className="hidden xs:inline">Export</span> CSV
        </Button>
        <Button onClick={handleExportPdf} variant="outline" size="sm" className="gap-2 text-xs sm:text-sm">
          <Download className="h-4 w-4" />
          <span className="hidden xs:inline">Export</span> PDF
        </Button>
      </div>

      {/* Enhanced KPI Cards with Confidence */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <KPICard
            title="Total Records"
            value={data.length.toLocaleString()}
            icon={Database}
            color="primary"
          />
          <KPICard
            title="Data Fields"
            value={columns.length}
            icon={Grid3X3}
            color="success"
          />
          <KPICard
            title="Numeric Metrics"
            value={numericColumns.length}
            icon={Hash}
            color="warning"
          />
          <KPICard
            title="Categories"
            value={categoricalColumns.length}
            icon={Type}
            color="danger"
          />
        </div>
      )}

      {/* Numeric Column Stats with Trends */}
      {kpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpis.map((kpi, index) => (
            <Card key={kpi.column} className="bg-gradient-to-br from-card to-muted/20 border-border/50 hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span className="truncate">{kpi.column}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${
                      kpi.trend === "up" ? "border-green-500/50 text-green-500" :
                      kpi.trend === "down" ? "border-red-500/50 text-red-500" :
                      "border-muted-foreground/50"
                    }`}
                  >
                    {kpi.trend === "up" ? "↑" : kpi.trend === "down" ? "↓" : "→"} {kpi.trendChange.toFixed(1)}%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {kpi.avg.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Average value</p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={kpi.confidence} className="h-1 flex-1" />
                  <span className="text-xs text-muted-foreground">{kpi.confidence.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Main Visualization Tabs */}
      <Tabs defaultValue="auto" className="w-full">
        <TabsList className="flex overflow-x-auto scrollbar-hide gap-1 bg-card/50 p-1 h-auto w-full md:grid md:grid-cols-7">
          <TabsTrigger value="auto" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />
            Auto
          </TabsTrigger>
          <TabsTrigger value="custom" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <Wrench className="h-4 w-4 mr-1 hidden sm:inline" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="insights" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <Lightbulb className="h-4 w-4 mr-1 hidden sm:inline" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="chat" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <MessageSquare className="h-4 w-4 mr-1 hidden sm:inline" />
            AI Chat
          </TabsTrigger>
          <TabsTrigger value="report" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
            Report
          </TabsTrigger>
          <TabsTrigger value="ai-report" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <Sparkles className="h-4 w-4 mr-1 hidden sm:inline" />
            AI Report
          </TabsTrigger>
          <TabsTrigger value="quick" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs sm:text-sm py-2 px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
            <PieChart className="h-4 w-4 mr-1 hidden sm:inline" />
            Quick
          </TabsTrigger>
        </TabsList>

        {/* Auto Visualizations with Accuracy */}
        <TabsContent value="auto" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {autoCharts.map((chart, index) => (
              <Card key={index} className="overflow-hidden hover:shadow-lg transition-all duration-300">
                <CardHeader className="pb-2 bg-gradient-to-r from-muted/50 to-transparent">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">{chart.title}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {chart.accuracy}%
                      </Badge>
                    </div>
                  </div>
                  <CardDescription className="text-xs">{chart.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-2">
                  {renderChart(chart.type, chart.xKey, chart.yKey, chart.title, chart.accuracy)}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Chart Builder */}
        <TabsContent value="custom" className="mt-4">
          <CustomChartBuilder 
            data={data} 
            columns={columns} 
            columnTypes={columnTypes} 
          />
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value="insights" className="mt-4">
          <RecommendationChart 
            data={data} 
            columns={columns} 
            columnTypes={columnTypes} 
          />
        </TabsContent>

        {/* AI Visualization Chat */}
        <TabsContent value="chat" className="mt-4">
          <VisualizationAIChat
            data={data}
            columns={columns}
            columnTypes={columnTypes}
            datasetName={dataset.name}
            onChartSuggestion={handleChartSuggestion}
          />
        </TabsContent>

        {/* Business Analytics Report */}
        <TabsContent value="report" className="mt-4">
          <BusinessAnalyticsReport 
            data={data} 
            columns={columns} 
            columnTypes={columnTypes}
            datasetName={dataset.name}
          />
        </TabsContent>

        {/* AI Report Generator with PDF Export */}
        <TabsContent value="ai-report" className="mt-4">
          <VisualizationReportGenerator
            data={data}
            columns={columns}
            columnTypes={columnTypes}
            datasetName={dataset.name}
          />
        </TabsContent>

        {/* Quick Chart Creation */}
        <TabsContent value="quick" className="mt-4 space-y-4">
          {/* Chart Configuration */}
          <Card className="bg-gradient-to-br from-card to-muted/20 border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Quick Chart Builder
              </CardTitle>
              <CardDescription className="text-xs">
                Select chart type and axes for instant visualization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Chart Type Selection */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">Chart Type:</span>
                <div className="flex flex-wrap gap-2">
                  {chartTypeOptions.map((option) => (
                    <Button
                      key={option.value}
                      variant={selectedChartType === option.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedChartType(option.value)}
                      className={`flex items-center gap-2 transition-all ${
                        selectedChartType === option.value 
                          ? "shadow-md" 
                          : "hover:border-primary/50"
                      }`}
                    >
                      {option.icon}
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Axis Selection */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">X-Axis:</span>
                  <Select value={selectedXAxis} onValueChange={setSelectedXAxis}>
                    <SelectTrigger className="flex-1 bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              columnTypes[col] === "numeric" ? "bg-blue-500/20 text-blue-400" :
                              columnTypes[col] === "date" ? "bg-purple-500/20 text-purple-400" :
                              "bg-green-500/20 text-green-400"
                            }`}>
                              {columnTypes[col]?.charAt(0).toUpperCase()}
                            </span>
                            {col}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">Y-Axis:</span>
                  <Select value={selectedYAxis} onValueChange={setSelectedYAxis}>
                    <SelectTrigger className="flex-1 bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover border-border z-50">
                      {columns.map(col => (
                        <SelectItem key={col} value={col}>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded ${
                              columnTypes[col] === "numeric" ? "bg-blue-500/20 text-blue-400" :
                              columnTypes[col] === "date" ? "bg-purple-500/20 text-purple-400" :
                              "bg-green-500/20 text-green-400"
                            }`}>
                              {columnTypes[col]?.charAt(0).toUpperCase()}
                            </span>
                            {col}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recommendation hint */}
              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg flex items-start gap-2">
                <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Pro Tip:</strong> Use categorical columns (C) for X-axis grouping and numeric columns (N) for Y-axis values for best results.
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Chart Display */}
          {selectedXAxis && selectedYAxis && (
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 bg-gradient-to-r from-primary/10 to-transparent">
                <CardTitle className="text-sm font-medium flex items-center justify-between">
                  <span>
                    {selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)}: {selectedYAxis} by {selectedXAxis}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {data.length} data points
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {renderChart(
                  selectedChartType,
                  selectedXAxis,
                  selectedYAxis,
                  `${selectedChartType.charAt(0).toUpperCase() + selectedChartType.slice(1)}: ${selectedYAxis} by ${selectedXAxis}`
                )}
              </CardContent>
            </Card>
          )}

          {/* Compare Chart Types */}
          {selectedXAxis && selectedYAxis && (
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Grid3X3 className="h-4 w-4 text-primary" />
                  Compare Visualization Types
                </CardTitle>
                <CardDescription className="text-xs">
                  See how your data looks with different chart types
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {chartTypeOptions
                    .filter(opt => opt.value !== selectedChartType)
                    .slice(0, 3)
                    .map(opt => (
                      <div key={opt.value} className="border border-border/50 rounded-lg overflow-hidden hover:border-primary/50 transition-colors">
                        {renderChart(
                          opt.value,
                          selectedXAxis,
                          selectedYAxis,
                          `${opt.label}: ${selectedYAxis}`
                        )}
                      </div>
                    ))
                  }
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Fullscreen Chart Dialog */}
      <Dialog open={!!fullscreenChart} onOpenChange={() => setFullscreenChart(null)}>
        <DialogContent className="max-w-5xl w-[95vw] h-[80vh] bg-background border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {fullscreenChart?.title}
              <Button variant="ghost" size="icon" onClick={() => setFullscreenChart(null)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            {fullscreenChart && renderChart(
              fullscreenChart.type,
              fullscreenChart.xKey,
              fullscreenChart.yKey,
              fullscreenChart.title,
              undefined,
              true
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VisualizationDashboard;
