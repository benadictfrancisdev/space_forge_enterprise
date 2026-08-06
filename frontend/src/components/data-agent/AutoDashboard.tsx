import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  LayoutDashboard,
  Sparkles,
  Plus,
  Check,
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Activity,
  Target,
  Loader2,
  Grid3X3,
  Smartphone,
  Monitor,
  Tablet,
  Download,
  Eye,
  FileDown,
  Server
} from "lucide-react";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import { safeInvoke } from "@/services/api";

interface DashboardSuggestion {
  id: string;
  type: "bar" | "line" | "pie" | "area" | "scatter" | "kpi";
  title: string;
  description: string;
  xAxis?: string;
  yAxis?: string;
  priority: "high" | "medium" | "low";
  reason: string;
  selected: boolean;
}

interface AutoDashboardProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
  onDashboardCreate?: (charts: DashboardSuggestion[]) => void;
}

const AutoDashboard = ({ data, columns, columnTypes, datasetName, onDashboardCreate }: AutoDashboardProps) => {
  const [suggestions, setSuggestions] = useState<DashboardSuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const { exportToPdf } = usePdfExport();

  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalColumns = columns.filter(c => columnTypes[c] === "categorical");

  const handleExportPdf = () => {
    const selectedCharts = suggestions.filter(s => s.selected);
    exportToPdf({
      title: "Auto Dashboard Report",
      subtitle: `AI-Generated Dashboard for ${datasetName}`,
      datasetName,
      statistics: {
        "Total Records": data.length,
        "Selected Charts": selectedCharts.length,
        "Numeric Columns": numericColumns.length,
        "Categorical Columns": categoricalColumns.length,
      },
      insights: selectedCharts.map(chart => ({
        title: chart.title,
        description: chart.reason,
        importance: chart.priority
      })),
      sections: [
        {
          title: "Dashboard Configuration",
          content: `This dashboard contains ${selectedCharts.length} visualizations selected from ${suggestions.length} AI-generated suggestions.`,
          type: "text"
        },
        {
          title: "Selected Visualizations",
          type: "list",
          content: selectedCharts.map(c => `${c.type.toUpperCase()}: ${c.title} - ${c.description}`)
        }
      ],
      recommendations: [
        "Customize chart colors to match your brand",
        "Add filters for interactive data exploration",
        "Consider adding drill-down capabilities for detailed analysis"
      ]
    });
  };

  // Generate AI-powered dashboard suggestions
  const generateSuggestions = async () => {
    setIsGenerating(true);
    
    try {
      // Get AI insights via edge function
      const { data: insightsData, error } = await safeInvoke('insights', {
        data: data.slice(0, 500),
        columns,
        datasetName,
        focusAreas: ["visualization", "trends", "key metrics"]
      });

      const newSuggestions: DashboardSuggestion[] = [];
      let aiReasons: string[] = [];

      if (!error && insightsData?.success) {
        aiReasons = insightsData.key_findings || insightsData.recommendations || [];
      }

      // KPI cards for top metrics with AI-enhanced descriptions
      numericColumns.slice(0, 4).forEach((col, i) => {
        const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;
        const min = Math.min(...values);
        const max = Math.max(...values);

        newSuggestions.push({
          id: `kpi-${col}`,
          type: "kpi",
          title: `${col} Overview`,
          description: `Average: ${avg.toFixed(2)}, Range: ${min.toFixed(0)} - ${max.toFixed(0)}`,
          yAxis: col,
          priority: i === 0 ? "high" : "medium",
          reason: aiReasons[i] || `${col} is a key performance indicator for tracking business metrics`,
          selected: i < 2
        });
      });

      // Bar chart for categorical comparison
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        newSuggestions.push({
          id: `bar-${categoricalColumns[0]}-${numericColumns[0]}`,
          type: "bar",
          title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
          description: `Compare ${numericColumns[0]} values across ${categoricalColumns[0]} categories`,
          xAxis: categoricalColumns[0],
          yAxis: numericColumns[0],
          priority: "high",
          reason: "Bar charts effectively compare values across categories, revealing distribution patterns",
          selected: true
        });
      }

      // Pie chart for distribution
      if (categoricalColumns.length > 0) {
        const uniqueValues = new Set(data.map(row => String(row[categoricalColumns[0]])));
        if (uniqueValues.size <= 10) {
          newSuggestions.push({
            id: `pie-${categoricalColumns[0]}`,
            type: "pie",
            title: `${categoricalColumns[0]} Distribution`,
            description: `Shows the proportional breakdown of ${categoricalColumns[0]} (${uniqueValues.size} categories)`,
            xAxis: categoricalColumns[0],
            yAxis: categoricalColumns[0],
            priority: "medium",
            reason: "Pie charts are ideal for showing proportional distribution when categories are limited",
            selected: true
          });
        }
      }

      // Line/Area chart for trends
      if (numericColumns.length > 0) {
        newSuggestions.push({
          id: `line-${numericColumns[0]}`,
          type: "line",
          title: `${numericColumns[0]} Trend Analysis`,
          description: `Track changes and patterns in ${numericColumns[0]} over the dataset`,
          xAxis: columns[0],
          yAxis: numericColumns[0],
          priority: "high",
          reason: "Line charts reveal trends, seasonality, and patterns over sequential data points",
          selected: true
        });

        if (numericColumns.length > 1) {
          newSuggestions.push({
            id: `area-${numericColumns[1]}`,
            type: "area",
            title: `${numericColumns[1]} Area Analysis`,
            description: `Visualize cumulative ${numericColumns[1]} with magnitude emphasis`,
            xAxis: columns[0],
            yAxis: numericColumns[1],
            priority: "medium",
            reason: "Area charts combine trend visualization with magnitude representation",
            selected: false
          });
        }
      }

      // Scatter plot for correlation
      if (numericColumns.length >= 2) {
        newSuggestions.push({
          id: `scatter-${numericColumns[0]}-${numericColumns[1]}`,
          type: "scatter",
          title: `${numericColumns[0]} vs ${numericColumns[1]} Correlation`,
          description: `Analyze relationship and correlation between these variables`,
          xAxis: numericColumns[0],
          yAxis: numericColumns[1],
          priority: "medium",
          reason: "Scatter plots reveal correlations, clusters, and outliers between numeric variables",
          selected: false
        });
      }

      setSuggestions(newSuggestions);
      toast.success(`Generated ${newSuggestions.length} AI-powered dashboard suggestions!`);

    } catch (error) {
      console.error("Error generating suggestions:", error);
      // Fallback to basic suggestions
      generateBasicSuggestions();
    } finally {
      setIsGenerating(false);
    }
  };

  // Fallback basic suggestions without AI
  const generateBasicSuggestions = () => {
    const newSuggestions: DashboardSuggestion[] = [];

      // KPI cards for top metrics
      numericColumns.slice(0, 4).forEach((col, i) => {
        const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = values.length > 0 ? sum / values.length : 0;

        newSuggestions.push({
          id: `kpi-${col}`,
          type: "kpi",
          title: `${col} Overview`,
          description: `Key metric showing ${col} with average ${avg.toFixed(2)}`,
          yAxis: col,
          priority: i === 0 ? "high" : "medium",
          reason: `${col} is a key numeric metric that provides immediate insight`,
          selected: i < 2
        });
      });

      // Bar chart for categorical comparison
      if (categoricalColumns.length > 0 && numericColumns.length > 0) {
        newSuggestions.push({
          id: `bar-${categoricalColumns[0]}-${numericColumns[0]}`,
          type: "bar",
          title: `${numericColumns[0]} by ${categoricalColumns[0]}`,
          description: `Compare ${numericColumns[0]} values across ${categoricalColumns[0]} categories`,
          xAxis: categoricalColumns[0],
          yAxis: numericColumns[0],
          priority: "high",
          reason: "Bar charts are ideal for comparing values across categories",
          selected: true
        });
      }

      // Pie chart for distribution
      if (categoricalColumns.length > 0) {
        const uniqueValues = new Set(data.map(row => String(row[categoricalColumns[0]])));
        if (uniqueValues.size <= 10) {
          newSuggestions.push({
            id: `pie-${categoricalColumns[0]}`,
            type: "pie",
            title: `${categoricalColumns[0]} Distribution`,
            description: `Shows the proportional breakdown of ${categoricalColumns[0]}`,
            xAxis: categoricalColumns[0],
            yAxis: categoricalColumns[0],
            priority: "medium",
            reason: "Pie charts effectively show proportional distribution",
            selected: true
          });
        }
      }

      // Line/Area chart for trends
      if (numericColumns.length > 0) {
        newSuggestions.push({
          id: `line-${numericColumns[0]}`,
          type: "line",
          title: `${numericColumns[0]} Trend`,
          description: `Track changes in ${numericColumns[0]} over the dataset`,
          xAxis: columns[0],
          yAxis: numericColumns[0],
          priority: "high",
          reason: "Line charts reveal trends and patterns over sequences",
          selected: true
        });

        if (numericColumns.length > 1) {
          newSuggestions.push({
            id: `area-${numericColumns[1]}`,
            type: "area",
            title: `${numericColumns[1]} Area Analysis`,
            description: `Visualize cumulative ${numericColumns[1]} values`,
            xAxis: columns[0],
            yAxis: numericColumns[1],
            priority: "medium",
            reason: "Area charts show magnitude and trends simultaneously",
            selected: false
          });
        }
      }

      // Scatter plot for correlation
      if (numericColumns.length >= 2) {
        newSuggestions.push({
          id: `scatter-${numericColumns[0]}-${numericColumns[1]}`,
          type: "scatter",
          title: `${numericColumns[0]} vs ${numericColumns[1]}`,
          description: `Analyze correlation between ${numericColumns[0]} and ${numericColumns[1]}`,
          xAxis: numericColumns[0],
          yAxis: numericColumns[1],
          priority: "medium",
          reason: "Scatter plots reveal relationships between two numeric variables",
          selected: false
        });
      }

      setSuggestions(newSuggestions);
      toast.success(`Generated ${newSuggestions.length} dashboard suggestions!`);
  };

  const toggleSuggestion = (id: string) => {
    setSuggestions(prev => prev.map(s => 
      s.id === id ? { ...s, selected: !s.selected } : s
    ));
  };

  const selectAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected: true })));
  };

  const deselectAll = () => {
    setSuggestions(prev => prev.map(s => ({ ...s, selected: false })));
  };

  const selectedCount = suggestions.filter(s => s.selected).length;

  const createDashboard = () => {
    const selectedCharts = suggestions.filter(s => s.selected);
    if (selectedCharts.length === 0) {
      toast.error("Please select at least one chart");
      return;
    }
    
    if (onDashboardCreate) {
      onDashboardCreate(selectedCharts);
    }
    toast.success(`Dashboard created with ${selectedCharts.length} charts!`);
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case "bar": return <BarChart3 className="h-4 w-4" />;
      case "line": return <LineChart className="h-4 w-4" />;
      case "pie": return <PieChart className="h-4 w-4" />;
      case "area": return <TrendingUp className="h-4 w-4" />;
      case "scatter": return <Activity className="h-4 w-4" />;
      case "kpi": return <Target className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-500/10 text-red-500 border-red-500/30";
      case "medium": return "bg-yellow-500/10 text-yellow-500 border-yellow-500/30";
      case "low": return "bg-green-500/10 text-green-500 border-green-500/30";
      default: return "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Auto Dashboard Generator
                  <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI-Powered
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  One-click creation of mobile-responsive dashboards
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={generateSuggestions}
              disabled={isGenerating}
              className="bg-gradient-to-r from-primary to-blue-500"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Suggestions
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {suggestions.length === 0 && !isGenerating && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-muted inline-block">
                <LayoutDashboard className="h-10 w-10 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold">Generate Dashboard Suggestions</h3>
              <p className="text-muted-foreground">
                Click "Generate Suggestions" to get AI-powered chart recommendations for your dashboard.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="outline" className="text-xs">
                  <BarChart3 className="h-3 w-3 mr-1" />
                  Bar Charts
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <LineChart className="h-3 w-3 mr-1" />
                  Line Charts
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <PieChart className="h-3 w-3 mr-1" />
                  Pie Charts
                </Badge>
                <Badge variant="outline" className="text-xs">
                  <Target className="h-3 w-3 mr-1" />
                  KPIs
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
            <h3 className="font-semibold">Analyzing your data structure...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Finding the best visualizations for {datasetName}
            </p>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && !isGenerating && (
        <>
          {/* Controls */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">
                    {selectedCount} of {suggestions.length} selected
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAll}>
                      Select All
                    </Button>
                    <Button variant="outline" size="sm" onClick={deselectAll}>
                      Clear
                    </Button>
                  </div>
                </div>
                
                {/* Device Preview Toggle */}
                <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
                  <Button
                    variant={previewDevice === "desktop" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewDevice("desktop")}
                  >
                    <Monitor className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewDevice === "tablet" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewDevice("tablet")}
                  >
                    <Tablet className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={previewDevice === "mobile" ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setPreviewDevice("mobile")}
                  >
                    <Smartphone className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleExportPdf}
                    disabled={selectedCount === 0}
                    className="gap-2"
                  >
                    <FileDown className="h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    onClick={createDashboard}
                    disabled={selectedCount === 0}
                    className="bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Dashboard ({selectedCount})
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggestions Grid */}
          <div className={`grid gap-4 ${
            previewDevice === "desktop" ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" :
            previewDevice === "tablet" ? "grid-cols-1 md:grid-cols-2" :
            "grid-cols-1"
          }`}>
            {suggestions.map((suggestion) => (
              <Card 
                key={suggestion.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  suggestion.selected 
                    ? "ring-2 ring-primary border-primary" 
                    : "hover:border-primary/50"
                }`}
                onClick={() => toggleSuggestion(suggestion.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        suggestion.type === "kpi" ? "bg-purple-500/10 text-purple-500" :
                        suggestion.type === "bar" ? "bg-blue-500/10 text-blue-500" :
                        suggestion.type === "line" ? "bg-green-500/10 text-green-500" :
                        suggestion.type === "pie" ? "bg-orange-500/10 text-orange-500" :
                        suggestion.type === "area" ? "bg-cyan-500/10 text-cyan-500" :
                        "bg-pink-500/10 text-pink-500"
                      }`}>
                        {getChartIcon(suggestion.type)}
                      </div>
                      <Badge variant="outline" className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <Checkbox
                      checked={suggestion.selected}
                      onCheckedChange={() => toggleSuggestion(suggestion.id)}
                    />
                  </div>
                  
                  <h4 className="font-medium text-sm mb-1">{suggestion.title}</h4>
                  <p className="text-xs text-muted-foreground mb-3">{suggestion.description}</p>
                  
                  <div className="p-2 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-primary" />
                      {suggestion.reason}
                    </span>
                  </div>

                  {suggestion.xAxis && suggestion.yAxis && (
                    <div className="flex gap-2 mt-3">
                      <Badge variant="secondary" className="text-xs">
                        X: {suggestion.xAxis}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        Y: {suggestion.yAxis}
                      </Badge>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Preview Section */}
          <Card className="bg-gradient-to-br from-muted/30 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Dashboard Preview
                <Badge variant="outline" className="text-xs capitalize">{previewDevice}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`bg-background rounded-lg border border-border/50 p-4 ${
                previewDevice === "desktop" ? "min-h-[300px]" :
                previewDevice === "tablet" ? "max-w-2xl mx-auto min-h-[300px]" :
                "max-w-sm mx-auto min-h-[400px]"
              }`}>
                <div className={`grid gap-3 ${
                  previewDevice === "desktop" ? "grid-cols-4" :
                  previewDevice === "tablet" ? "grid-cols-2" :
                  "grid-cols-1"
                }`}>
                  {suggestions.filter(s => s.selected).map((s, i) => (
                    <div 
                      key={s.id}
                      className={`bg-muted/30 rounded-lg p-3 flex flex-col items-center justify-center min-h-[80px] ${
                        s.type === "kpi" ? "" : 
                        previewDevice === "desktop" ? "col-span-2" : ""
                      }`}
                    >
                      {getChartIcon(s.type)}
                      <span className="text-xs mt-1 text-center text-muted-foreground truncate w-full">
                        {s.title}
                      </span>
                    </div>
                  ))}
                  {selectedCount === 0 && (
                    <div className="col-span-full text-center py-8 text-muted-foreground">
                      <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Select charts to preview dashboard layout</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default AutoDashboard;
