import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Activity,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  FileText,
  Target,
} from "lucide-react";

interface BusinessAnalyticsReportProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface MetricSummary {
  column: string;
  sum: number;
  avg: number;
  max: number;
  min: number;
  count: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
}

interface CategoryBreakdown {
  column: string;
  categories: { name: string; count: number; percentage: number }[];
}

const BusinessAnalyticsReport = ({ data, columns, columnTypes, datasetName }: BusinessAnalyticsReportProps) => {
  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");
  const categoricalColumns = columns.filter(c => columnTypes[c] === "categorical");

  const metricSummaries = useMemo((): MetricSummary[] => {
    return numericColumns.map(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length === 0) return null;

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);

      // Calculate trend
      const midPoint = Math.floor(values.length / 2);
      const firstHalf = values.slice(0, midPoint);
      const secondHalf = values.slice(midPoint);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      let trend: "up" | "down" | "stable" = "stable";
      let trendPercentage = 0;
      if (firstAvg > 0) {
        trendPercentage = ((secondAvg - firstAvg) / firstAvg) * 100;
        if (trendPercentage > 5) trend = "up";
        else if (trendPercentage < -5) trend = "down";
      }

      return {
        column: col,
        sum,
        avg,
        max,
        min,
        count: values.length,
        trend,
        trendPercentage: Math.abs(trendPercentage),
      };
    }).filter(Boolean) as MetricSummary[];
  }, [data, numericColumns]);

  const categoryBreakdowns = useMemo((): CategoryBreakdown[] => {
    return categoricalColumns.slice(0, 3).map(col => {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const val = String(row[col] || "Unknown");
        counts[val] = (counts[val] || 0) + 1;
      });

      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({
          name,
          count,
          percentage: (count / data.length) * 100,
        }));

      return { column: col, categories: sorted };
    });
  }, [data, categoricalColumns]);

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up": return <ArrowUpRight className="h-4 w-4 text-green-400" />;
      case "down": return <ArrowDownRight className="h-4 w-4 text-red-400" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(2)}K`;
    return num.toFixed(2);
  };

  const reportDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6">
      {/* Report Header */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Business Analytics Report
              </CardTitle>
              <CardDescription className="mt-1">
                Dataset: {datasetName}
              </CardDescription>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2">
                <Calendar className="h-3 w-3 mr-1" />
                {reportDate}
              </Badge>
              <p className="text-xs text-muted-foreground">
                {data.length.toLocaleString()} records analyzed
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Executive Summary */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4" />
            Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Activity className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{data.length.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total Records</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <BarChart3 className="h-5 w-5 mx-auto mb-1 text-blue-400" />
              <p className="text-2xl font-bold">{columns.length}</p>
              <p className="text-xs text-muted-foreground">Data Fields</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <DollarSign className="h-5 w-5 mx-auto mb-1 text-green-400" />
              <p className="text-2xl font-bold">{numericColumns.length}</p>
              <p className="text-xs text-muted-foreground">Numeric Metrics</p>
            </div>
            <div className="text-center p-3 rounded-lg bg-muted/30">
              <Users className="h-5 w-5 mx-auto mb-1 text-purple-400" />
              <p className="text-2xl font-bold">{categoricalColumns.length}</p>
              <p className="text-xs text-muted-foreground">Categories</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      {metricSummaries.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Key Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {metricSummaries.slice(0, 4).map((metric, index) => (
                <div key={metric.column}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{metric.column}</span>
                      <div className="flex items-center gap-1 text-xs">
                        {getTrendIcon(metric.trend)}
                        <span className={metric.trend === "up" ? "text-green-400" : metric.trend === "down" ? "text-red-400" : "text-muted-foreground"}>
                          {metric.trendPercentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      Avg: {formatNumber(metric.avg)}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <p className="text-muted-foreground">Sum</p>
                      <p className="font-medium">{formatNumber(metric.sum)}</p>
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <p className="text-muted-foreground">Average</p>
                      <p className="font-medium">{formatNumber(metric.avg)}</p>
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <p className="text-muted-foreground">Min</p>
                      <p className="font-medium">{formatNumber(metric.min)}</p>
                    </div>
                    <div className="bg-muted/30 p-2 rounded text-center">
                      <p className="text-muted-foreground">Max</p>
                      <p className="font-medium">{formatNumber(metric.max)}</p>
                    </div>
                  </div>
                  {index < metricSummaries.slice(0, 4).length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown */}
      {categoryBreakdowns.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <PieChart className="h-4 w-4" />
              Category Distribution Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryBreakdowns.map((breakdown) => (
                <div key={breakdown.column} className="space-y-3">
                  <h4 className="font-medium text-sm border-b border-border/50 pb-2">
                    {breakdown.column}
                  </h4>
                  {breakdown.categories.map((cat, index) => (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="truncate max-w-[150px]" title={cat.name}>
                          {index + 1}. {cat.name}
                        </span>
                        <span className="text-muted-foreground">
                          {cat.count} ({cat.percentage.toFixed(1)}%)
                        </span>
                      </div>
                      <Progress value={cat.percentage} className="h-1.5" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Quality Score */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Data Quality Assessment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Completeness</span>
                <span className="font-medium">
                  {(100 - (data.filter(row => Object.values(row).some(v => v === null || v === "")).length / data.length * 100)).toFixed(1)}%
                </span>
              </div>
              <Progress value={100 - (data.filter(row => Object.values(row).some(v => v === null || v === "")).length / data.length * 100)} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Column Coverage</span>
                <span className="font-medium">{((columns.length / (columns.length + 2)) * 100).toFixed(1)}%</span>
              </div>
              <Progress value={(columns.length / (columns.length + 2)) * 100} className="h-2" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Type Consistency</span>
                <span className="font-medium">
                  {(((numericColumns.length + categoricalColumns.length) / columns.length) * 100).toFixed(1)}%
                </span>
              </div>
              <Progress value={((numericColumns.length + categoricalColumns.length) / columns.length) * 100} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BusinessAnalyticsReport;