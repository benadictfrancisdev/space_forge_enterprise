import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle2, 
  XCircle,
  Info,
  Shield,
  TrendingDown,
  Hash,
  Type,
  Calendar,
  Percent,
  ArrowRight
} from "lucide-react";

interface ColumnProfile {
  name: string;
  type: "numeric" | "categorical" | "date" | "text" | "boolean" | "mixed";
  detectedType: string;
  nullCount: number;
  nullPercentage: number;
  uniqueCount: number;
  uniquePercentage: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  stdDev?: number;
  topValues?: { value: string; count: number }[];
  quality: "excellent" | "good" | "fair" | "poor";
  qualityScore: number;
}

interface DataQualityAlert {
  id: string;
  column: string;
  severity: "critical" | "warning" | "info";
  category: "missing" | "duplicates" | "outliers" | "type" | "distribution" | "cardinality";
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  metric?: number;
}

interface DataQualityAlertsProps {
  columnProfiles: ColumnProfile[];
  data: Record<string, unknown>[];
  onDismiss?: (alertId: string) => void;
}

export const DataQualityAlerts = ({ columnProfiles, data, onDismiss }: DataQualityAlertsProps) => {
  // Generate quality alerts based on column profiles
  const alerts = useMemo<DataQualityAlert[]>(() => {
    const generatedAlerts: DataQualityAlert[] = [];

    columnProfiles.forEach((profile) => {
      // Missing data alerts
      if (profile.nullPercentage > 50) {
        generatedAlerts.push({
          id: `missing-critical-${profile.name}`,
          column: profile.name,
          severity: "critical",
          category: "missing",
          title: "Critical Missing Data",
          description: `${profile.nullPercentage.toFixed(1)}% of values are missing (${profile.nullCount.toLocaleString()} rows)`,
          impact: "May cause analysis errors or biased results",
          recommendation: "Consider removing this column or imputing missing values with mean/median",
          metric: profile.nullPercentage
        });
      } else if (profile.nullPercentage > 20) {
        generatedAlerts.push({
          id: `missing-warning-${profile.name}`,
          column: profile.name,
          severity: "warning",
          category: "missing",
          title: "Significant Missing Data",
          description: `${profile.nullPercentage.toFixed(1)}% of values are missing`,
          impact: "May affect statistical calculations",
          recommendation: "Review data collection process; consider imputation strategies",
          metric: profile.nullPercentage
        });
      } else if (profile.nullPercentage > 5) {
        generatedAlerts.push({
          id: `missing-info-${profile.name}`,
          column: profile.name,
          severity: "info",
          category: "missing",
          title: "Some Missing Values",
          description: `${profile.nullPercentage.toFixed(1)}% of values are missing`,
          impact: "Minor impact on analysis",
          recommendation: "Handle missing values in calculations using appropriate methods",
          metric: profile.nullPercentage
        });
      }

      // Cardinality alerts for categorical
      if (profile.type === "categorical") {
        if (profile.uniquePercentage > 90) {
          generatedAlerts.push({
            id: `cardinality-high-${profile.name}`,
            column: profile.name,
            severity: "warning",
            category: "cardinality",
            title: "High Cardinality",
            description: `${profile.uniqueCount.toLocaleString()} unique values (${profile.uniquePercentage.toFixed(1)}% unique)`,
            impact: "May not be suitable for grouping or categorical analysis",
            recommendation: "Consider binning, grouping similar values, or treating as ID column",
            metric: profile.uniquePercentage
          });
        } else if (profile.uniqueCount === 1) {
          generatedAlerts.push({
            id: `cardinality-single-${profile.name}`,
            column: profile.name,
            severity: "warning",
            category: "cardinality",
            title: "Single Value Column",
            description: "Column contains only one unique value",
            impact: "Provides no analytical value for comparisons",
            recommendation: "Consider removing this column from analysis",
            metric: 1
          });
        }
      }

      // Numeric outlier detection
      if (profile.type === "numeric" && profile.mean !== undefined && profile.stdDev !== undefined) {
        const cv = (profile.stdDev / Math.abs(profile.mean)) * 100;
        if (cv > 200 && profile.mean !== 0) {
          generatedAlerts.push({
            id: `outliers-${profile.name}`,
            column: profile.name,
            severity: "warning",
            category: "outliers",
            title: "High Variability Detected",
            description: `Coefficient of variation: ${cv.toFixed(1)}% (std: ${profile.stdDev.toFixed(2)}, mean: ${profile.mean.toFixed(2)})`,
            impact: "May contain outliers that skew analysis",
            recommendation: "Review data for outliers; consider using median instead of mean",
            metric: cv
          });
        }

        // Check for potential zero-inflation
        const zeroCount = data.filter(row => Number(row[profile.name]) === 0).length;
        const zeroPercentage = (zeroCount / data.length) * 100;
        if (zeroPercentage > 50 && profile.min === 0) {
          generatedAlerts.push({
            id: `zeros-${profile.name}`,
            column: profile.name,
            severity: "info",
            category: "distribution",
            title: "Zero-Inflated Distribution",
            description: `${zeroPercentage.toFixed(1)}% of values are zero`,
            impact: "May require specialized statistical methods",
            recommendation: "Consider zero-inflated models or separate zero/non-zero analysis",
            metric: zeroPercentage
          });
        }
      }

      // Type consistency
      if (profile.type === "mixed") {
        generatedAlerts.push({
          id: `type-mixed-${profile.name}`,
          column: profile.name,
          severity: "warning",
          category: "type",
          title: "Mixed Data Types",
          description: "Column contains multiple data types",
          impact: "May cause type errors in calculations",
          recommendation: "Clean and standardize data types before analysis"
        });
      }

      // Duplicate detection for potential ID columns
      if (profile.type === "text" && profile.uniquePercentage < 100 && profile.uniqueCount > data.length * 0.9) {
        const duplicateCount = data.length - profile.uniqueCount;
        if (duplicateCount > 0 && profile.name.toLowerCase().includes("id")) {
          generatedAlerts.push({
            id: `duplicates-${profile.name}`,
            column: profile.name,
            severity: "critical",
            category: "duplicates",
            title: "Potential Duplicate IDs",
            description: `${duplicateCount.toLocaleString()} duplicate values found in potential ID column`,
            impact: "May indicate data integrity issues",
            recommendation: "Investigate and resolve duplicate records",
            metric: duplicateCount
          });
        }
      }
    });

    // Sort by severity
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return generatedAlerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }, [columnProfiles, data]);

  // Calculate overall data quality score
  const overallQuality = useMemo(() => {
    if (columnProfiles.length === 0) return 0;
    const avgScore = columnProfiles.reduce((sum, p) => sum + p.qualityScore, 0) / columnProfiles.length;
    return Math.round(avgScore);
  }, [columnProfiles]);

  const getSeverityIcon = (severity: DataQualityAlert["severity"]) => {
    switch (severity) {
      case "critical": return <XCircle className="h-5 w-5 text-red-500" />;
      case "warning": return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "info": return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityStyle = (severity: DataQualityAlert["severity"]) => {
    switch (severity) {
      case "critical": return "border-red-500/50 bg-red-500/5";
      case "warning": return "border-yellow-500/50 bg-yellow-500/5";
      case "info": return "border-blue-500/50 bg-blue-500/5";
    }
  };

  const getCategoryIcon = (category: DataQualityAlert["category"]) => {
    switch (category) {
      case "missing": return <Percent className="h-4 w-4" />;
      case "duplicates": return <Hash className="h-4 w-4" />;
      case "outliers": return <TrendingDown className="h-4 w-4" />;
      case "type": return <Type className="h-4 w-4" />;
      case "distribution": return <Calendar className="h-4 w-4" />;
      case "cardinality": return <Hash className="h-4 w-4" />;
    }
  };

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;
  const infoCount = alerts.filter(a => a.severity === "info").length;

  return (
    <Card className="bg-gradient-to-br from-orange-500/5 via-red-500/5 to-transparent border-orange-500/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-xl shadow-lg ${
              criticalCount > 0 ? "bg-gradient-to-br from-red-500 to-orange-600 shadow-red-500/25" :
              warningCount > 0 ? "bg-gradient-to-br from-yellow-500 to-orange-500 shadow-yellow-500/25" :
              "bg-gradient-to-br from-green-500 to-emerald-600 shadow-green-500/25"
            }`}>
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl flex items-center gap-2">
                Data Quality Alerts
                {alerts.length === 0 ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    All Clear
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    {alerts.length} issue{alerts.length !== 1 ? "s" : ""} found
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                Automatic detection of data quality issues and recommendations
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold" style={{
                color: overallQuality >= 80 ? "hsl(142, 76%, 36%)" :
                       overallQuality >= 60 ? "hsl(47, 100%, 50%)" :
                       "hsl(0, 84%, 60%)"
              }}>
                {overallQuality}%
              </div>
              <div className="text-xs text-muted-foreground">Quality Score</div>
            </div>
            <div className="h-10 w-px bg-border" />
            <div className="flex gap-3 text-sm">
              {criticalCount > 0 && (
                <div className="flex items-center gap-1 text-red-500">
                  <XCircle className="h-4 w-4" />
                  <span className="font-medium">{criticalCount}</span>
                </div>
              )}
              {warningCount > 0 && (
                <div className="flex items-center gap-1 text-yellow-500">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="font-medium">{warningCount}</span>
                </div>
              )}
              {infoCount > 0 && (
                <div className="flex items-center gap-1 text-blue-500">
                  <Info className="h-4 w-4" />
                  <span className="font-medium">{infoCount}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overall quality progress bar */}
        <div className="mt-4 space-y-1">
          <Progress value={overallQuality} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium text-green-600">No Data Quality Issues Detected</p>
            <p className="text-sm text-muted-foreground mt-1">
              Your dataset appears to be clean and ready for analysis
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className={`p-4 ${getSeverityStyle(alert.severity)}`}>
                  <div className="flex items-start gap-3">
                    {getSeverityIcon(alert.severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <Badge variant="outline" className="text-xs gap-1">
                          {getCategoryIcon(alert.category)}
                          {alert.category}
                        </Badge>
                        <Badge variant="secondary" className="text-xs font-mono">
                          {alert.column}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mt-1">
                        {alert.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3 text-xs">
                        <div className="flex items-start gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium">Impact: </span>
                            <span className="text-muted-foreground">{alert.impact}</span>
                          </div>
                        </div>
                        <div className="flex items-start gap-1.5">
                          <ArrowRight className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <div>
                            <span className="font-medium">Action: </span>
                            <span className="text-muted-foreground">{alert.recommendation}</span>
                          </div>
                        </div>
                      </div>

                      {alert.metric !== undefined && (
                        <div className="mt-2">
                          <Progress 
                            value={Math.min(alert.metric, 100)} 
                            className={`h-1.5 ${
                              alert.severity === "critical" ? "[&>div]:bg-red-500" :
                              alert.severity === "warning" ? "[&>div]:bg-yellow-500" :
                              "[&>div]:bg-blue-500"
                            }`}
                          />
                        </div>
                      )}
                    </div>

                    {onDismiss && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => onDismiss(alert.id)}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DataQualityAlerts;
