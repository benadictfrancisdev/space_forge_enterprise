import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Eye,
  Layers,
  RefreshCw,
  Shield,
  TrendingUp,
  XCircle,
  Loader2,
  BarChart3,
  FileWarning,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface DataLayerMonitorProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, string>;
  datasetName: string;
}

interface ColumnHealth {
  column: string;
  type: string;
  nullPercent: number;
  uniquePercent: number;
  status: "healthy" | "warning" | "critical";
  issues: string[];
}

interface MonitorMetric {
  label: string;
  value: string | number;
  trend?: "up" | "down" | "stable";
  status: "healthy" | "warning" | "critical";
  detail?: string;
}

interface DataAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  column?: string;
  timestamp: Date;
  resolved: boolean;
}

const DataLayerMonitor = ({ data, columns, columnTypes, datasetName }: DataLayerMonitorProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<Date | null>(null);
  const [alerts, setAlerts] = useState<DataAlert[]>([]);
  const [columnHealth, setColumnHealth] = useState<ColumnHealth[]>([]);
  const [selectedView, setSelectedView] = useState<"overview" | "columns" | "alerts">("overview");

  const runHealthScan = useCallback(() => {
    setIsScanning(true);

    // Simulate async scan
    setTimeout(() => {
      const newAlerts: DataAlert[] = [];
      const newColumnHealth: ColumnHealth[] = [];

      for (const col of columns) {
        const values = data.map((row) => row[col]);
        const nullCount = values.filter((v) => v === null || v === undefined || v === "").length;
        const nullPercent = (nullCount / data.length) * 100;
        const uniqueValues = new Set(values.filter((v) => v !== null && v !== undefined && v !== ""));
        const uniquePercent = (uniqueValues.size / Math.max(data.length - nullCount, 1)) * 100;

        const issues: string[] = [];
        let status: "healthy" | "warning" | "critical" = "healthy";

        if (nullPercent > 50) {
          status = "critical";
          issues.push(`${nullPercent.toFixed(1)}% null values`);
          newAlerts.push({
            id: `null-${col}`,
            severity: "critical",
            title: `High null rate in "${col}"`,
            description: `${nullPercent.toFixed(1)}% of values are missing. Consider imputation or removal.`,
            column: col,
            timestamp: new Date(),
            resolved: false,
          });
        } else if (nullPercent > 20) {
          status = "warning";
          issues.push(`${nullPercent.toFixed(1)}% null values`);
          newAlerts.push({
            id: `null-${col}`,
            severity: "warning",
            title: `Moderate null rate in "${col}"`,
            description: `${nullPercent.toFixed(1)}% missing values detected.`,
            column: col,
            timestamp: new Date(),
            resolved: false,
          });
        }

        if (uniquePercent === 100 && data.length > 10 && columnTypes[col] !== "date") {
          issues.push("All values unique — possible ID column");
        }

        if (uniquePercent < 1 && data.length > 50 && columnTypes[col] !== "numeric") {
          if (status === "healthy") status = "warning";
          issues.push("Very low cardinality");
        }

        // Check for type inconsistencies in numeric columns
        if (columnTypes[col] === "numeric") {
          const numericValues = values.filter((v) => v !== null && v !== undefined && v !== "");
          const nonNumeric = numericValues.filter((v) => isNaN(Number(v)));
          if (nonNumeric.length > 0) {
            status = "critical";
            issues.push(`${nonNumeric.length} non-numeric values in numeric column`);
            newAlerts.push({
              id: `type-${col}`,
              severity: "critical",
              title: `Type mismatch in "${col}"`,
              description: `${nonNumeric.length} values cannot be parsed as numbers.`,
              column: col,
              timestamp: new Date(),
              resolved: false,
            });
          }

          // Check for outliers using IQR
          const nums = numericValues.map(Number).filter((n) => !isNaN(n)).sort((a, b) => a - b);
          if (nums.length > 10) {
            const q1 = nums[Math.floor(nums.length * 0.25)];
            const q3 = nums[Math.floor(nums.length * 0.75)];
            const iqr = q3 - q1;
            const outliers = nums.filter((n) => n < q1 - 1.5 * iqr || n > q3 + 1.5 * iqr);
            if (outliers.length > nums.length * 0.05) {
              if (status === "healthy") status = "warning";
              issues.push(`${outliers.length} outliers detected (${((outliers.length / nums.length) * 100).toFixed(1)}%)`);
              newAlerts.push({
                id: `outlier-${col}`,
                severity: "warning",
                title: `Outliers in "${col}"`,
                description: `${outliers.length} values (${((outliers.length / nums.length) * 100).toFixed(1)}%) fall outside 1.5×IQR.`,
                column: col,
                timestamp: new Date(),
                resolved: false,
              });
            }
          }
        }

        // Check for duplicate rows indicator
        if (col === columns[0]) {
          const rowStrings = data.map((row) => JSON.stringify(row));
          const uniqueRows = new Set(rowStrings);
          if (uniqueRows.size < data.length) {
            const dupCount = data.length - uniqueRows.size;
            newAlerts.push({
              id: "duplicates",
              severity: dupCount > data.length * 0.1 ? "critical" : "warning",
              title: "Duplicate rows detected",
              description: `${dupCount} duplicate rows found (${((dupCount / data.length) * 100).toFixed(1)}% of dataset).`,
              timestamp: new Date(),
              resolved: false,
            });
          }
        }

        newColumnHealth.push({
          column: col,
          type: columnTypes[col] || "unknown",
          nullPercent,
          uniquePercent,
          status,
          issues,
        });
      }

      setColumnHealth(newColumnHealth);
      setAlerts(newAlerts);
      setLastScanTime(new Date());
      setIsScanning(false);
    }, 800);
  }, [data, columns, columnTypes]);

  useEffect(() => {
    if (data.length > 0) {
      runHealthScan();
    }
  }, [data.length, columns.length]);

  const overviewMetrics = useMemo((): MonitorMetric[] => {
    const totalNulls = data.reduce((sum, row) => {
      return sum + columns.filter((c) => row[c] === null || row[c] === undefined || row[c] === "").length;
    }, 0);
    const totalCells = data.length * columns.length;
    const completenessPercent = totalCells > 0 ? ((1 - totalNulls / totalCells) * 100) : 100;

    const healthyCols = columnHealth.filter((c) => c.status === "healthy").length;
    const warningCols = columnHealth.filter((c) => c.status === "warning").length;
    const criticalCols = columnHealth.filter((c) => c.status === "critical").length;

    const criticalAlerts = alerts.filter((a) => a.severity === "critical" && !a.resolved).length;

    return [
      {
        label: "Data Completeness",
        value: `${completenessPercent.toFixed(1)}%`,
        status: completenessPercent > 95 ? "healthy" : completenessPercent > 80 ? "warning" : "critical",
        trend: "stable",
        detail: `${totalNulls.toLocaleString()} missing values across ${totalCells.toLocaleString()} cells`,
      },
      {
        label: "Rows",
        value: data.length.toLocaleString(),
        status: "healthy",
        trend: "stable",
        detail: `${columns.length} columns`,
      },
      {
        label: "Healthy Columns",
        value: `${healthyCols}/${columns.length}`,
        status: criticalCols > 0 ? "critical" : warningCols > 0 ? "warning" : "healthy",
        trend: criticalCols > 0 ? "down" : "up",
        detail: `${warningCols} warnings, ${criticalCols} critical`,
      },
      {
        label: "Active Alerts",
        value: alerts.filter((a) => !a.resolved).length,
        status: criticalAlerts > 0 ? "critical" : alerts.length > 0 ? "warning" : "healthy",
        trend: criticalAlerts > 0 ? "down" : "stable",
        detail: `${criticalAlerts} critical`,
      },
    ];
  }, [data, columns, columnHealth, alerts]);

  const overallHealth = useMemo(() => {
    const critical = columnHealth.filter((c) => c.status === "critical").length;
    const warning = columnHealth.filter((c) => c.status === "warning").length;
    if (critical > 0) return { label: "Critical Issues", status: "critical" as const, score: Math.max(0, 100 - critical * 15 - warning * 5) };
    if (warning > 0) return { label: "Needs Attention", status: "warning" as const, score: Math.max(40, 100 - warning * 8) };
    return { label: "All Systems Healthy", status: "healthy" as const, score: 100 };
  }, [columnHealth]);

  const resolveAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)));
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "healthy": return "text-success";
      case "warning": return "text-warning";
      case "critical": return "text-destructive";
      default: return "text-muted-foreground";
    }
  };

  const statusBg = (status: string) => {
    switch (status) {
      case "healthy": return "bg-success/10 border-success/20";
      case "warning": return "bg-warning/10 border-warning/20";
      case "critical": return "bg-destructive/10 border-destructive/20";
      default: return "bg-muted border-border";
    }
  };

  const severityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <XCircle className="h-4 w-4 text-destructive" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-warning" />;
      default: return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
  };

  const trendIcon = (trend?: string) => {
    switch (trend) {
      case "up": return <ArrowUpRight className="h-3.5 w-3.5 text-success" />;
      case "down": return <ArrowDownRight className="h-3.5 w-3.5 text-destructive" />;
      default: return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Data Layer Monitor
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time health tracking for <span className="font-medium text-foreground">{datasetName}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastScanTime && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Last scan: {lastScanTime.toLocaleTimeString()}
            </span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={runHealthScan}
            disabled={isScanning}
          >
            {isScanning ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isScanning ? "Scanning..." : "Rescan"}
          </Button>
        </div>
      </div>

      {/* Overall Health Score */}
      <Card className={cn("border", statusBg(overallHealth.status))}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", statusBg(overallHealth.status))}>
                {overallHealth.status === "healthy" ? (
                  <CheckCircle2 className="h-5 w-5 text-success" />
                ) : overallHealth.status === "warning" ? (
                  <AlertTriangle className="h-5 w-5 text-warning" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{overallHealth.label}</p>
                <p className="text-xs text-muted-foreground">
                  Health Score: {overallHealth.score}/100
                </p>
              </div>
            </div>
            <span className={cn("text-3xl font-bold tabular-nums", statusColor(overallHealth.status))}>
              {overallHealth.score}
            </span>
          </div>
          <Progress value={overallHealth.score} className="h-2" />
        </CardContent>
      </Card>

      {/* View Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-1">
        {(["overview", "columns", "alerts"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setSelectedView(v)}
            className={cn(
              "flex-1 px-3 py-2 rounded-md text-xs font-medium transition-all duration-200 capitalize",
              selectedView === v
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {v === "alerts" && alerts.filter((a) => !a.resolved).length > 0 && (
              <Badge variant="destructive" className="mr-1.5 text-[10px] px-1.5 py-0">
                {alerts.filter((a) => !a.resolved).length}
              </Badge>
            )}
            {v}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {selectedView === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {overviewMetrics.map((metric) => (
                <Card key={metric.label} className="border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{metric.label}</span>
                      {trendIcon(metric.trend)}
                    </div>
                    <p className={cn("text-xl font-bold tabular-nums", statusColor(metric.status))}>
                      {metric.value}
                    </p>
                    {metric.detail && (
                      <p className="text-[10px] text-muted-foreground mt-1">{metric.detail}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Column Status Grid */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" />
                  Column Status Map
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {columnHealth.map((col) => (
                    <div
                      key={col.column}
                      className={cn(
                        "rounded-md border p-2 text-center transition-colors",
                        statusBg(col.status)
                      )}
                      title={col.issues.length > 0 ? col.issues.join(", ") : "Healthy"}
                    >
                      <p className="text-[10px] font-mono text-muted-foreground truncate">{col.column}</p>
                      <p className={cn("text-xs font-bold mt-0.5", statusColor(col.status))}>
                        {col.status === "healthy" ? "✓" : col.status === "warning" ? "⚠" : "✗"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {selectedView === "columns" && (
          <motion.div
            key="columns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {columnHealth.map((col) => (
                  <Card key={col.column} className={cn("border", col.status !== "healthy" && statusBg(col.status))}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {col.status === "healthy" ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : col.status === "warning" ? (
                            <AlertTriangle className="h-4 w-4 text-warning" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-sm font-medium text-foreground">{col.column}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5">
                            {col.type}
                          </Badge>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn("text-[10px]", statusBg(col.status), statusColor(col.status))}
                        >
                          {col.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs mb-2">
                        <div>
                          <span className="text-muted-foreground">Null Rate</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={100 - col.nullPercent} className="h-1.5 flex-1" />
                            <span className={cn("font-mono text-[11px]", col.nullPercent > 20 ? "text-warning" : "text-muted-foreground")}>
                              {col.nullPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Uniqueness</span>
                          <div className="flex items-center gap-2 mt-1">
                            <Progress value={col.uniquePercent} className="h-1.5 flex-1" />
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {col.uniquePercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {col.issues.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {col.issues.map((issue, i) => (
                            <Badge key={i} variant="outline" className="text-[10px] bg-muted/50">
                              <FileWarning className="h-3 w-3 mr-1" />
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </motion.div>
        )}

        {selectedView === "alerts" && (
          <motion.div
            key="alerts"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {alerts.length === 0 ? (
              <Card>
                <CardContent className="p-12 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-success/30 mb-4" />
                  <p className="text-sm text-muted-foreground">No alerts — your data layer is healthy!</p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-2">
                  {alerts
                    .sort((a, b) => {
                      if (a.resolved !== b.resolved) return a.resolved ? 1 : -1;
                      const severity = { critical: 0, warning: 1, info: 2 };
                      return severity[a.severity] - severity[b.severity];
                    })
                    .map((alert) => (
                      <Card
                        key={alert.id}
                        className={cn(
                          "border transition-opacity",
                          alert.resolved ? "opacity-50" : statusBg(alert.severity === "critical" ? "critical" : "warning")
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              {severityIcon(alert.severity)}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <span className="text-sm font-medium text-foreground">{alert.title}</span>
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px]",
                                      alert.severity === "critical"
                                        ? "bg-destructive/10 text-destructive border-destructive/20"
                                        : "bg-warning/10 text-warning border-warning/20"
                                    )}
                                  >
                                    {alert.severity}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{alert.description}</p>
                                {alert.column && (
                                  <span className="text-[10px] font-mono text-muted-foreground mt-1 inline-block">
                                    Column: {alert.column}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!alert.resolved && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs shrink-0"
                                onClick={() => resolveAlert(alert.id)}
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DataLayerMonitor;
