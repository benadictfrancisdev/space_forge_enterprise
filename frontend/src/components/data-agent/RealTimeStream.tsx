import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Radio,
  Play,
  Pause,
  RefreshCw,
  Zap,
  Activity,
  TrendingUp,
  Clock,
  Wifi,
  WifiOff,
  Settings,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";

interface RealTimeStreamProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface StreamPoint {
  timestamp: string;
  value: number;
  index: number;
}

interface MetricCard {
  label: string;
  value: number;
  change: number;
  trend: "up" | "down" | "stable";
}

const RealTimeStream = ({ data, columns, columnTypes, datasetName }: RealTimeStreamProps) => {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamData, setStreamData] = useState<StreamPoint[]>([]);
  const [refreshRate, setRefreshRate] = useState(2000); // ms
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedColumn, setSelectedColumn] = useState<string>("");
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [dataIndex, setDataIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const numericColumns = columns.filter(c => columnTypes[c] === "numeric");

  useEffect(() => {
    if (numericColumns.length > 0 && !selectedColumn) {
      setSelectedColumn(numericColumns[0]);
    }
  }, [numericColumns, selectedColumn]);

  // Calculate metrics
  const calculateMetrics = useCallback(() => {
    if (!selectedColumn || data.length === 0) return;

    const values = data.slice(0, dataIndex + 1).map(row => Number(row[selectedColumn])).filter(v => !isNaN(v));
    if (values.length === 0) return;

    const current = values[values.length - 1] || 0;
    const previous = values[values.length - 2] || current;
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    const percentChange = previous !== 0 ? ((current - previous) / previous) * 100 : 0;

    setMetrics([
      {
        label: "Current Value",
        value: current,
        change: percentChange,
        trend: percentChange > 0 ? "up" : percentChange < 0 ? "down" : "stable"
      },
      {
        label: "Average",
        value: avg,
        change: 0,
        trend: "stable"
      },
      {
        label: "Maximum",
        value: max,
        change: 0,
        trend: "up"
      },
      {
        label: "Minimum",
        value: min,
        change: 0,
        trend: "down"
      }
    ]);
  }, [data, dataIndex, selectedColumn]);

  // Stream simulation
  const streamTick = useCallback(() => {
    if (!selectedColumn || dataIndex >= data.length) {
      setIsStreaming(false);
      toast.info("Stream complete - end of data reached");
      return;
    }

    const value = Number(data[dataIndex][selectedColumn]);
    if (!isNaN(value)) {
      const point: StreamPoint = {
        timestamp: new Date().toLocaleTimeString(),
        value,
        index: dataIndex
      };
      
      setStreamData(prev => [...prev.slice(-50), point]); // Keep last 50 points
    }

    setDataIndex(prev => prev + 1);
    calculateMetrics();
  }, [data, dataIndex, selectedColumn, calculateMetrics]);

  useEffect(() => {
    if (isStreaming && autoRefresh) {
      intervalRef.current = setInterval(streamTick, refreshRate);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isStreaming, autoRefresh, refreshRate, streamTick]);

  const startStream = () => {
    setIsStreaming(true);
    toast.success("Live streaming started");
  };

  const pauseStream = () => {
    setIsStreaming(false);
    toast.info("Stream paused");
  };

  const resetStream = () => {
    setIsStreaming(false);
    setStreamData([]);
    setDataIndex(0);
    setMetrics([]);
    toast.success("Stream reset");
  };

  const manualRefresh = () => {
    streamTick();
    toast.success("Data refreshed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent border-violet-500/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
                <Radio className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  Real-Time Data Stream
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${isStreaming ? "bg-green-500/10 text-green-500 border-green-500/30" : "bg-muted text-muted-foreground"}`}
                  >
                    {isStreaming ? (
                      <>
                        <Wifi className="h-3 w-3 mr-1 animate-pulse" />
                        Live
                      </>
                    ) : (
                      <>
                        <WifiOff className="h-3 w-3 mr-1" />
                        Paused
                      </>
                    )}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Stream and monitor your data with auto-refresh capabilities
                </CardDescription>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isStreaming ? (
                <Button variant="outline" onClick={pauseStream}>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </Button>
              ) : (
                <Button onClick={startStream} className="bg-gradient-to-r from-violet-500 to-purple-600">
                  <Play className="h-4 w-4 mr-2" />
                  Start Stream
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={resetStream}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Controls */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* Column Selection */}
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">Monitor:</span>
              <select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
                className="px-3 py-2 rounded-lg bg-muted border border-border text-sm"
              >
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>

            {/* Refresh Rate */}
            <div className="flex items-center gap-3 flex-1 max-w-xs">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {(refreshRate / 1000).toFixed(1)}s
              </span>
              <Slider
                value={[refreshRate]}
                onValueChange={([val]) => setRefreshRate(val)}
                min={500}
                max={5000}
                step={500}
                className="flex-1"
              />
            </div>

            {/* Auto Refresh Toggle */}
            <div className="flex items-center gap-2">
              <Switch
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
              <span className="text-sm text-muted-foreground">Auto-refresh</span>
            </div>

            {/* Manual Refresh */}
            {!autoRefresh && (
              <Button variant="outline" size="sm" onClick={manualRefresh}>
                <Zap className="h-4 w-4 mr-1" />
                Refresh Now
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <Card key={i} className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{metric.label}</p>
                  <p className="text-2xl font-bold mt-1">
                    {metric.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className={`p-2 rounded-full ${
                  metric.trend === "up" ? "bg-green-500/10 text-green-500" :
                  metric.trend === "down" ? "bg-red-500/10 text-red-500" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {metric.trend === "up" ? <ArrowUpRight className="h-5 w-5" /> :
                   metric.trend === "down" ? <ArrowDownRight className="h-5 w-5" /> :
                   <Activity className="h-5 w-5" />}
                </div>
              </div>
              
              {metric.change !== 0 && (
                <div className={`mt-2 text-xs ${
                  metric.change > 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {metric.change > 0 ? "+" : ""}{metric.change.toFixed(2)}% from previous
                </div>
              )}
            </CardContent>
            
            {/* Progress indicator */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 ${
              metric.trend === "up" ? "bg-green-500" :
              metric.trend === "down" ? "bg-red-500" :
              "bg-primary"
            }`} style={{ width: `${Math.min((dataIndex / data.length) * 100, 100)}%` }} />
          </Card>
        ))}
      </div>

      {/* Live Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Live Data Feed
            <Badge variant="outline" className="text-xs ml-auto">
              {streamData.length} points
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {streamData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Radio className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p>Click "Start Stream" to begin monitoring</p>
                <p className="text-sm mt-1">Data will appear here in real-time</p>
              </div>
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={streamData}>
                  <defs>
                    <linearGradient id="streamGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="timestamp" 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#streamGradient)"
                    dot={false}
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stream Progress */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Stream Progress</span>
            <span className="text-sm text-muted-foreground">
              {dataIndex} / {data.length} rows processed
            </span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-violet-500 to-purple-600 transition-all duration-300"
              style={{ width: `${(dataIndex / data.length) * 100}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RealTimeStream;
