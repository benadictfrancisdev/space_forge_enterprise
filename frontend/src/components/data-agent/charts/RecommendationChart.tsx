import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Target, Lightbulb, AlertTriangle, CheckCircle2 } from "lucide-react";

interface RecommendationChartProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
}

interface Recommendation {
  type: "insight" | "action" | "warning" | "opportunity";
  title: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
  relatedColumn?: string;
}

const RecommendationChart = ({ data, columns, columnTypes }: RecommendationChartProps) => {
  const recommendations = useMemo(() => {
    const recs: Recommendation[] = [];
    const numericCols = columns.filter(c => columnTypes[c] === "numeric");
    const categoricalCols = columns.filter(c => columnTypes[c] === "categorical");

    // Analyze data patterns and generate recommendations
    numericCols.forEach(col => {
      const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
      if (values.length === 0) return;

      const sum = values.reduce((a, b) => a + b, 0);
      const avg = sum / values.length;
      const max = Math.max(...values);
      const min = Math.min(...values);
      const range = max - min;
      const stdDev = Math.sqrt(values.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / values.length);

      // High variance detection
      if (stdDev / avg > 0.5) {
        recs.push({
          type: "warning",
          title: `High Variance in ${col}`,
          description: `The ${col} column shows significant variation (CV: ${((stdDev / avg) * 100).toFixed(1)}%). Consider segmenting your analysis.`,
          confidence: 85,
          impact: "medium",
          relatedColumn: col,
        });
      }

      // Trend detection (simple)
      const firstHalf = values.slice(0, Math.floor(values.length / 2));
      const secondHalf = values.slice(Math.floor(values.length / 2));
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.15) {
        recs.push({
          type: "insight",
          title: `Upward Trend in ${col}`,
          description: `${col} shows a ${(((secondAvg - firstAvg) / firstAvg) * 100).toFixed(1)}% increase in the second half of your data.`,
          confidence: 78,
          impact: "high",
          relatedColumn: col,
        });
      } else if (secondAvg < firstAvg * 0.85) {
        recs.push({
          type: "warning",
          title: `Downward Trend in ${col}`,
          description: `${col} shows a ${(((firstAvg - secondAvg) / firstAvg) * 100).toFixed(1)}% decrease. Investigate potential causes.`,
          confidence: 78,
          impact: "high",
          relatedColumn: col,
        });
      }

      // Outlier detection
      const outlierThreshold = avg + 2 * stdDev;
      const outliers = values.filter(v => v > outlierThreshold || v < avg - 2 * stdDev);
      if (outliers.length > 0 && outliers.length < values.length * 0.1) {
        recs.push({
          type: "opportunity",
          title: `Outliers Detected in ${col}`,
          description: `Found ${outliers.length} outlier(s). These may represent exceptional cases worth investigating.`,
          confidence: 90,
          impact: "medium",
          relatedColumn: col,
        });
      }
    });

    // Category distribution insights
    categoricalCols.slice(0, 2).forEach(col => {
      const counts: Record<string, number> = {};
      data.forEach(row => {
        const val = String(row[col] || "Unknown");
        counts[val] = (counts[val] || 0) + 1;
      });

      const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
      if (entries.length > 0) {
        const topCategory = entries[0];
        const percentage = (topCategory[1] / data.length) * 100;

        if (percentage > 50) {
          recs.push({
            type: "insight",
            title: `Dominant Category in ${col}`,
            description: `"${topCategory[0]}" represents ${percentage.toFixed(1)}% of all records. Consider focused strategies.`,
            confidence: 95,
            impact: "high",
            relatedColumn: col,
          });
        }

        if (entries.length > 5) {
          recs.push({
            type: "action",
            title: `Segment Analysis for ${col}`,
            description: `With ${entries.length} unique values, consider grouping smaller categories for clearer insights.`,
            confidence: 70,
            impact: "low",
            relatedColumn: col,
          });
        }
      }
    });

    // Cross-column correlation suggestion
    if (numericCols.length >= 2) {
      recs.push({
        type: "opportunity",
        title: "Correlation Analysis Available",
        description: `Analyze relationships between ${numericCols.slice(0, 3).join(", ")} using scatter plots for deeper insights.`,
        confidence: 85,
        impact: "high",
      });
    }

    return recs.slice(0, 6);
  }, [data, columns, columnTypes]);

  const getTypeIcon = (type: Recommendation["type"]) => {
    switch (type) {
      case "insight": return <Lightbulb className="h-4 w-4" />;
      case "action": return <Target className="h-4 w-4" />;
      case "warning": return <AlertTriangle className="h-4 w-4" />;
      case "opportunity": return <TrendingUp className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: Recommendation["type"]) => {
    switch (type) {
      case "insight": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "action": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "opportunity": return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    }
  };

  const getImpactColor = (impact: Recommendation["impact"]) => {
    switch (impact) {
      case "high": return "bg-red-500/20 text-red-400";
      case "medium": return "bg-yellow-500/20 text-yellow-400";
      case "low": return "bg-green-500/20 text-green-400";
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="p-8 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-400" />
          <p className="text-muted-foreground">Your data looks clean! Upload more data for AI-powered recommendations.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">AI Recommendations</h3>
        <Badge variant="outline" className="ml-auto">{recommendations.length} insights</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec, index) => (
          <Card key={index} className={`border ${getTypeColor(rec.type)}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getTypeIcon(rec.type)}
                {rec.title}
                <Badge className={`ml-auto text-xs ${getImpactColor(rec.impact)}`}>
                  {rec.impact} impact
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{rec.description}</p>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Confidence</span>
                  <span className="font-medium">{rec.confidence}%</span>
                </div>
                <Progress value={rec.confidence} className="h-1.5" />
              </div>
              {rec.relatedColumn && (
                <Badge variant="outline" className="text-xs">
                  Column: {rec.relatedColumn}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default RecommendationChart;