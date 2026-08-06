import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  LayoutDashboard,
  Sparkles,
  Grid3X3,
  List,
  Download,
  Share2,
  Filter,
  SlidersHorizontal,
  Eye,
  Loader2,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  Activity,
  Maximize2,
  RefreshCw,
  Palette,
  Layers,
  Zap,
  FileDown,
  Edit3,
  Wand2,
  CheckCircle2,
  X,
  Settings2,
  Trash2,
  LayoutTemplate,
  Briefcase,
  ShoppingCart,
  Users,
  DollarSign,
  Building2,
  Rocket,
  Heart,
  GraduationCap,
  Brain,
  type LucideIcon
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import { DraggableTile, DashboardTile, POWER_BI_COLORS } from "./powerbi/DraggableTile";
import TileEditor from "./powerbi/TileEditor";
import AIDashboardEditor from "./powerbi/AIDashboardEditor";
import RealtimeInsightsPanel from "./powerbi/RealtimeInsightsPanel";
import { DataProfilingPanel } from "./powerbi/DataProfilingPanel";
import IntentDashboardBuilder from "./powerbi/IntentDashboardBuilder";
import KPIDependencyGraph from "./powerbi/KPIDependencyGraph";
import PredictiveOverlay from "./powerbi/PredictiveOverlay";
import DashboardVersionHistory, { type DashboardSnapshot } from "./powerbi/DashboardVersionHistory";
import SensitivityControls from "./powerbi/SensitivityControls";
import DecisionLog from "./powerbi/DecisionLog";
import DashboardScore from "./powerbi/DashboardScore";
import { backend } from "@/platform";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLine,
  Line,
  PieChart as RechartsPie,
  Pie,
  Cell,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  Legend,
  ComposedChart,
  ReferenceLine,
  ReferenceDot,
  Label as RechartsLabel,
} from "recharts";
interface PowerBIDashboardProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

// DashboardTile and POWER_BI_COLORS imported from ./powerbi/DraggableTile

interface DataTransformation {
  id: string;
  type: "filter" | "sort" | "aggregate" | "rename" | "remove_nulls" | "normalize";
  column?: string;
  operator?: string;
  value?: string | number;
  direction?: "asc" | "desc";
  newName?: string;
}

// Dashboard Template Interface
interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  tileTypes: DashboardTile["type"][];
  color: string;
  category: "business" | "sales" | "marketing" | "hr" | "finance" | "operations" | "custom";
}

// Pre-defined Dashboard Templates
const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: "executive-summary",
    name: "Executive Summary",
    description: "High-level KPIs with trend analysis for C-suite presentations",
    icon: Briefcase,
    tileTypes: ["kpi", "line", "bar", "gauge"],
    color: "from-slate-600 to-slate-800",
    category: "business"
  },
  {
    id: "sales-performance",
    name: "Sales Performance",
    description: "Revenue tracking, conversion funnels, and sales metrics",
    icon: DollarSign,
    tileTypes: ["kpi", "bar", "funnel", "line", "pie"],
    color: "from-emerald-500 to-teal-600",
    category: "sales"
  },
  {
    id: "marketing-analytics",
    name: "Marketing Analytics",
    description: "Campaign performance, audience insights, and engagement metrics",
    icon: Rocket,
    tileTypes: ["kpi", "area", "pie", "bar", "scatter"],
    color: "from-purple-500 to-pink-600",
    category: "marketing"
  },
  {
    id: "hr-dashboard",
    name: "HR & People",
    description: "Employee metrics, headcount, and workforce analytics",
    icon: Users,
    tileTypes: ["kpi", "bar", "pie", "histogram", "boxplot"],
    color: "from-blue-500 to-indigo-600",
    category: "hr"
  },
  {
    id: "financial-overview",
    name: "Financial Overview",
    description: "P&L analysis, budget tracking, and financial KPIs",
    icon: Building2,
    tileTypes: ["kpi", "waterfall", "bar", "line", "combo"],
    color: "from-amber-500 to-orange-600",
    category: "finance"
  },
  {
    id: "operations-metrics",
    name: "Operations Metrics",
    description: "Efficiency tracking, process metrics, and operational KPIs",
    icon: Settings2,
    tileTypes: ["kpi", "gauge", "line", "histogram", "scatter"],
    color: "from-cyan-500 to-blue-600",
    category: "operations"
  },
  {
    id: "ecommerce-analytics",
    name: "E-Commerce Analytics",
    description: "Order tracking, customer behavior, and product performance",
    icon: ShoppingCart,
    tileTypes: ["kpi", "bar", "line", "pie", "funnel", "treemap"],
    color: "from-rose-500 to-red-600",
    category: "sales"
  },
  {
    id: "customer-insights",
    name: "Customer Insights",
    description: "Customer segmentation, satisfaction, and behavior analysis",
    icon: Heart,
    tileTypes: ["kpi", "pie", "scatter", "bar", "boxplot"],
    color: "from-pink-500 to-rose-600",
    category: "marketing"
  },
  {
    id: "research-analysis",
    name: "Research & Analysis",
    description: "Statistical analysis, distributions, and data exploration",
    icon: GraduationCap,
    tileTypes: ["histogram", "scatter", "boxplot", "line", "bar", "kpi"],
    color: "from-green-500 to-emerald-600",
    category: "custom"
  },
  {
    id: "comprehensive",
    name: "Comprehensive Dashboard",
    description: "All chart types for complete data visualization",
    icon: LayoutTemplate,
    tileTypes: ["kpi", "bar", "line", "pie", "area", "scatter", "combo", "gauge", "treemap", "funnel", "waterfall", "histogram", "boxplot"],
    color: "from-cyan-500 to-teal-600",
    category: "custom"
  }
];

// POWER_BI_COLORS imported from ./powerbi/DraggableTile

const PowerBIDashboard = ({ data, columns, columnTypes, datasetName }: PowerBIDashboardProps) => {
  const [tiles, setTiles] = useState<DashboardTile[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [theme, setTheme] = useState<"light" | "dark" | "colorful">("colorful");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTile, setSelectedTile] = useState<string | null>(null);
  const [showDataEditor, setShowDataEditor] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns);
  const [transformations, setTransformations] = useState<DataTransformation[]>([]);
  const [processedData, setProcessedData] = useState<Record<string, unknown>[]>(data);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DashboardTemplate | null>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showProfiling, setShowProfiling] = useState(false);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [editingTile, setEditingTile] = useState<DashboardTile | null>(null);
  const [explainingTileId, setExplainingTileId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [isBlurred, setIsBlurred] = useState(false);
  const [snapshots, setSnapshots] = useState<DashboardSnapshot[]>([]);
  const { exportToPdf } = usePdfExport();

  // DnD Kit sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const numericColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "numeric"), [columns, columnTypes]);
  const categoricalColumns = useMemo(() => 
    columns.filter(c => columnTypes[c] === "categorical"), [columns, columnTypes]);

  // Handle drag end for tile reordering
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (over && active.id !== over.id) {
      setTiles((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      toast.success("Tile reordered");
    }
  }, []);

  // Handle tile resize
  const handleTileResize = useCallback((id: string, newSize: "small" | "medium" | "large") => {
    setTiles((items) =>
      items.map((item) =>
        item.id === id ? { ...item, size: newSize } : item
      )
    );
    toast.success(`Tile resized to ${newSize}`);
  }, []);

  // Handle tile update from editor
  const handleTileUpdate = useCallback((updatedTile: DashboardTile) => {
    setTiles(items => items.map(t => t.id === updatedTile.id ? updatedTile : t));
    setEditingTile(null);
    toast.success("Tile updated");
  }, []);

  // Handle tile deletion
  const handleTileDelete = useCallback((id: string) => {
    setTiles(items => items.filter(t => t.id !== id));
    toast.success("Tile removed");
  }, []);

  // AI explain a tile
  const handleAIExplain = useCallback(async (tile: DashboardTile) => {
    setExplainingTileId(tile.id);
    try {
      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'dashboard_explain',
          tileTitle: tile.title,
          tileType: tile.type,
          tileData: tile.data?.slice(0, 15),
          tileColumn: tile.column || tile.yAxis || tile.xAxis || '',
          datasetName,
        }
      });

      if (error) throw error;

      const insight = result?.insight || result?.raw_response || "Unable to generate insight.";
      setTiles(items => items.map(t => t.id === tile.id ? { ...t, aiInsight: insight } : t));
      toast.success("AI insight generated");
    } catch (err) {
      console.error("AI explain error:", err);
      toast.error("Failed to generate AI insight");
    } finally {
      setExplainingTileId(null);
    }
  }, [datasetName]);

  const handleExportPdf = () => {
    exportToPdf({
      title: "Power BI Style Dashboard Report",
      subtitle: `Interactive Dashboard for ${datasetName}`,
      datasetName,
      statistics: {
        "Total Records": data.length,
        "Dashboard Tiles": tiles.length,
        "Numeric Columns": numericColumns.length,
        "Categorical Columns": categoricalColumns.length,
      },
      insights: tiles.filter(t => t.type === "kpi").map(t => ({
        title: t.title,
        description: `Value: ${t.value?.toFixed(2) || "N/A"}, Change: ${t.change?.toFixed(1) || 0}%`,
        importance: (t.change || 0) > 0 ? "high" : "medium" as const
      })),
      sections: [
        {
          title: "Dashboard Overview",
          content: `This Power BI-style dashboard contains ${tiles.length} visualization tiles across ${numericColumns.length} numeric metrics.`,
          type: "text"
        },
        {
          title: "Visualizations",
          type: "list",
          content: tiles.map(t => `${t.type.toUpperCase()}: ${t.title}`)
        }
      ],
      recommendations: [
        "Use slicers to filter data dynamically",
        "Drill down into charts for detailed insights",
        "Share this dashboard with stakeholders"
      ]
    });
  };

  // Data editing functions
  const toggleColumnSelection = (column: string) => {
    setSelectedColumns(prev => 
      prev.includes(column) 
        ? prev.filter(c => c !== column)
        : [...prev, column]
    );
  };

  const addTransformation = (type: DataTransformation["type"]) => {
    const newTransform: DataTransformation = {
      id: `transform-${Date.now()}`,
      type,
      column: selectedColumns[0] || columns[0]
    };
    setTransformations(prev => [...prev, newTransform]);
  };

  const updateTransformation = (id: string, updates: Partial<DataTransformation>) => {
    setTransformations(prev => 
      prev.map(t => t.id === id ? { ...t, ...updates } : t)
    );
  };

  const removeTransformation = (id: string) => {
    setTransformations(prev => prev.filter(t => t.id !== id));
  };

  const applyTransformations = useCallback(() => {
    setIsProcessing(true);
    
    setTimeout(() => {
      let result = [...data];
      
      // Filter to selected columns only
      result = result.map(row => {
        const newRow: Record<string, unknown> = {};
        selectedColumns.forEach(col => {
          newRow[col] = row[col];
        });
        return newRow;
      });
      
      // Apply each transformation
      transformations.forEach(transform => {
        switch (transform.type) {
          case "filter":
            if (transform.column && transform.operator && transform.value !== undefined) {
              result = result.filter(row => {
                const val = row[transform.column!];
                const compareVal = transform.value;
                switch (transform.operator) {
                  case "equals": return String(val) === String(compareVal);
                  case "contains": return String(val).toLowerCase().includes(String(compareVal).toLowerCase());
                  case "greater": return Number(val) > Number(compareVal);
                  case "less": return Number(val) < Number(compareVal);
                  case "not_empty": return val !== null && val !== undefined && val !== "";
                  default: return true;
                }
              });
            }
            break;
          case "sort":
            if (transform.column) {
              result.sort((a, b) => {
                const aVal = a[transform.column!];
                const bVal = b[transform.column!];
                const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
                return transform.direction === "desc" ? -comparison : comparison;
              });
            }
            break;
          case "remove_nulls":
            if (transform.column) {
              result = result.filter(row => 
                row[transform.column!] !== null && 
                row[transform.column!] !== undefined && 
                row[transform.column!] !== ""
              );
            }
            break;
          case "normalize":
            if (transform.column && columnTypes[transform.column] === "numeric") {
              const values = result.map(r => Number(r[transform.column!])).filter(v => !isNaN(v));
              const min = Math.min(...values);
              const max = Math.max(...values);
              const range = max - min || 1;
              result = result.map(row => ({
                ...row,
                [transform.column!]: ((Number(row[transform.column!]) - min) / range).toFixed(4)
              }));
            }
            break;
        }
      });
      
      setProcessedData(result);
      setIsProcessing(false);
      toast.success(`Applied ${transformations.length} transformations to ${result.length} rows`);
    }, 1000);
  }, [data, selectedColumns, transformations, columnTypes]);

  const autoCleanData = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      // Auto-clean: remove nulls, trim whitespace, normalize numeric columns
      let result = data.map(row => {
        const newRow: Record<string, unknown> = {};
        selectedColumns.forEach(col => {
          let val = row[col];
          // Trim strings
          if (typeof val === "string") {
            val = val.trim();
          }
          // Convert empty strings to null for consistency
          if (val === "") {
            val = null;
          }
          newRow[col] = val;
        });
        return newRow;
      });
      
      // Remove rows where all selected columns are null
      result = result.filter(row => 
        selectedColumns.some(col => row[col] !== null && row[col] !== undefined)
      );
      
      setProcessedData(result);
      setIsProcessing(false);
      toast.success(`Auto-cleaned data: ${result.length} rows after removing empty rows`);
    }, 1500);
  };

  // Generate Power BI style dashboard based on template
  const generateDashboard = useCallback((template?: DashboardTemplate) => {
    setIsGenerating(true);
    const dataToUse = processedData.length > 0 ? processedData : data;
    const activeColumns = selectedColumns.length > 0 ? selectedColumns : columns;
    const activeNumericCols = activeColumns.filter(c => columnTypes[c] === "numeric");
    const activeCategoricalCols = activeColumns.filter(c => columnTypes[c] === "categorical");
    const templateToUse = template || selectedTemplate;
    
    setTimeout(() => {
      const newTiles: DashboardTile[] = [];
      const allowedTypes = templateToUse?.tileTypes || ["kpi", "bar", "line", "pie", "area", "scatter", "combo", "gauge", "treemap", "funnel", "waterfall", "histogram", "boxplot"];
      
      // Helper to check if tile type is allowed
      const isAllowed = (type: DashboardTile["type"]) => allowedTypes.includes(type);

      // Generate KPI tiles for top numeric columns
      if (isAllowed("kpi")) {
        activeNumericCols.slice(0, 4).forEach((col, i) => {
          const values = dataToUse.map(row => Number(row[col])).filter(v => !isNaN(v));
          const sum = values.reduce((a, b) => a + b, 0);
          const avg = values.length > 0 ? sum / values.length : 0;
          const prevAvg = values.length > 1 ? 
            values.slice(0, -1).reduce((a, b) => a + b, 0) / (values.length - 1) : avg;
          const change = prevAvg !== 0 ? ((avg - prevAvg) / prevAvg) * 100 : 0;

          newTiles.push({
            id: `kpi-${col}`,
            type: "kpi",
            title: col,
            size: "small",
            column: col,
            value: avg,
            change,
            color: POWER_BI_COLORS[i % POWER_BI_COLORS.length]
          });
        });
      }

      // Bar chart for categorical vs numeric
      if (isAllowed("bar") && activeCategoricalCols.length > 0 && activeNumericCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const numCol = activeNumericCols[0];
        const grouped = dataToUse.reduce((acc: Record<string, number[]>, row) => {
          const key = String(row[catCol]);
          if (!acc[key]) acc[key] = [];
          const val = Number(row[numCol]);
          if (!isNaN(val)) acc[key].push(val);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).slice(0, 10).map(([name, values]: [string, number[]]) => ({
          name,
          value: values.reduce((a: number, b: number) => a + b, 0) / values.length
        }));

        newTiles.push({
          id: `bar-${catCol}-${numCol}`,
          type: "bar",
          title: `${numCol} by ${catCol}`,
          size: "large",
          xAxis: catCol,
          yAxis: numCol,
          data: chartData,
          color: POWER_BI_COLORS[0]
        });
      }

      // Pie chart for distribution
      if (isAllowed("pie") && activeCategoricalCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const counts = dataToUse.reduce((acc: Record<string, number>, row) => {
          const key = String(row[catCol]);
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {});

        const chartData = Object.entries(counts).slice(0, 8).map(([name, value]) => ({
          name,
          value
        }));

        newTiles.push({
          id: `pie-${catCol}`,
          type: "pie",
          title: `${catCol} Distribution`,
          size: "medium",
          column: catCol,
          data: chartData
        });
      }

      // Line/Trend chart
      if (isAllowed("line") && activeNumericCols.length > 0) {
        const col = activeNumericCols[0];
        const chartData = dataToUse.slice(0, 50).map((row, i) => ({
          index: i + 1,
          value: Number(row[col]) || 0
        }));

        newTiles.push({
          id: `line-${col}`,
          type: "line",
          title: `${col} Trend`,
          size: "large",
          column: col,
          data: chartData,
          color: POWER_BI_COLORS[2]
        });
      }

      // Area chart
      if (isAllowed("area") && activeNumericCols.length > 1) {
        const col = activeNumericCols[1];
        const chartData = dataToUse.slice(0, 50).map((row, i) => ({
          index: i + 1,
          value: Number(row[col]) || 0
        }));

        newTiles.push({
          id: `area-${col}`,
          type: "area",
          title: `${col} Analysis`,
          size: "medium",
          column: col,
          data: chartData,
          color: POWER_BI_COLORS[4]
        });
      }

      // Combo chart if enough data
      if (isAllowed("combo") && activeNumericCols.length >= 2 && activeCategoricalCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const num1 = activeNumericCols[0];
        const num2 = activeNumericCols[1];

        const grouped = dataToUse.reduce((acc: Record<string, { v1: number[], v2: number[] }>, row) => {
          const key = String(row[catCol]);
          if (!acc[key]) acc[key] = { v1: [], v2: [] };
          const val1 = Number(row[num1]);
          const val2 = Number(row[num2]);
          if (!isNaN(val1)) acc[key].v1.push(val1);
          if (!isNaN(val2)) acc[key].v2.push(val2);
          return acc;
        }, {});

        const chartData = Object.entries(grouped).slice(0, 8).map(([name, vals]: [string, { v1: number[], v2: number[] }]) => ({
          name,
          [num1]: vals.v1.length > 0 ? vals.v1.reduce((a: number, b: number) => a + b, 0) / vals.v1.length : 0,
          [num2]: vals.v2.length > 0 ? vals.v2.reduce((a: number, b: number) => a + b, 0) / vals.v2.length : 0
        }));

        newTiles.push({
          id: `combo-${catCol}`,
          type: "combo",
          title: `${num1} vs ${num2}`,
          size: "large",
          xAxis: catCol,
          yAxis: `${num1}, ${num2}`,
          data: chartData
        });
      }

      // Scatter plot for correlation analysis
      if (isAllowed("scatter") && activeNumericCols.length >= 2) {
        const xCol = activeNumericCols[0];
        const yCol = activeNumericCols[1];
        const scatterData = dataToUse.slice(0, 100).map(row => ({
          x: Number(row[xCol]) || 0,
          y: Number(row[yCol]) || 0,
          name: `(${Number(row[xCol])?.toFixed(1)}, ${Number(row[yCol])?.toFixed(1)})`
        }));

        newTiles.push({
          id: `scatter-${xCol}-${yCol}`,
          type: "scatter",
          title: `${xCol} vs ${yCol} Correlation`,
          size: "medium",
          xAxis: xCol,
          yAxis: yCol,
          data: scatterData,
          color: POWER_BI_COLORS[5]
        });
      }

      // Histogram for distribution analysis
      if (isAllowed("histogram") && activeNumericCols.length > 0) {
        const col = activeNumericCols[Math.min(2, activeNumericCols.length - 1)];
        const values = dataToUse.map(row => Number(row[col])).filter(v => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binCount = 10;
        const binSize = (max - min) / binCount || 1;
        
        const bins: Record<string, number> = {};
        for (let i = 0; i < binCount; i++) {
          const binStart = min + i * binSize;
          const binLabel = `${binStart.toFixed(1)}-${(binStart + binSize).toFixed(1)}`;
          bins[binLabel] = 0;
        }
        
        values.forEach(val => {
          const binIndex = Math.min(Math.floor((val - min) / binSize), binCount - 1);
          const binStart = min + binIndex * binSize;
          const binLabel = `${binStart.toFixed(1)}-${(binStart + binSize).toFixed(1)}`;
          bins[binLabel] = (bins[binLabel] || 0) + 1;
        });

        const histogramData = Object.entries(bins).map(([name, count]) => ({ name, value: count }));

        newTiles.push({
          id: `histogram-${col}`,
          type: "histogram",
          title: `${col} Distribution`,
          size: "medium",
          column: col,
          data: histogramData,
          color: POWER_BI_COLORS[6]
        });
      }

      // Gauge chart for key metrics
      if (isAllowed("gauge") && activeNumericCols.length > 0) {
        const col = activeNumericCols[0];
        const values = dataToUse.map(row => Number(row[col])).filter(v => !isNaN(v));
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const max = Math.max(...values);
        const percentage = (avg / max) * 100;

        newTiles.push({
          id: `gauge-${col}`,
          type: "gauge",
          title: `${col} Performance`,
          size: "small",
          column: col,
          value: percentage,
          data: [{ value: avg, max }],
          color: POWER_BI_COLORS[7]
        });
      }

      // Treemap for hierarchical data
      if (isAllowed("treemap") && activeCategoricalCols.length >= 2 && activeNumericCols.length > 0) {
        const cat1 = activeCategoricalCols[0];
        const cat2 = activeCategoricalCols[1];
        const numCol = activeNumericCols[0];

        const grouped = dataToUse.reduce((acc: Record<string, Record<string, number>>, row) => {
          const key1 = String(row[cat1]);
          const key2 = String(row[cat2]);
          if (!acc[key1]) acc[key1] = {};
          const val = Number(row[numCol]);
          if (!isNaN(val)) {
            acc[key1][key2] = (acc[key1][key2] || 0) + val;
          }
          return acc;
        }, {});

        const treemapData = Object.entries(grouped).slice(0, 6).flatMap(([parent, children]) => 
          Object.entries(children).slice(0, 4).map(([name, value]) => ({
            name: `${parent}/${name}`,
            value
          }))
        );

        newTiles.push({
          id: `treemap-${cat1}-${cat2}`,
          type: "treemap",
          title: `${numCol} by ${cat1} & ${cat2}`,
          size: "large",
          data: treemapData
        });
      }

      // Funnel chart for sequential data
      if (isAllowed("funnel") && activeCategoricalCols.length > 0 && activeNumericCols.length > 0) {
        const catCol = activeCategoricalCols[Math.min(1, activeCategoricalCols.length - 1)] || activeCategoricalCols[0];
        const numCol = activeNumericCols[0];
        
        const grouped = dataToUse.reduce((acc: Record<string, number>, row) => {
          const key = String(row[catCol]);
          const val = Number(row[numCol]);
          if (!isNaN(val)) {
            acc[key] = (acc[key] || 0) + val;
          }
          return acc;
        }, {});

        const funnelData = Object.entries(grouped)
          .sort((a, b) => (b[1] as number) - (a[1] as number))
          .slice(0, 6)
          .map(([name, value]) => ({ name, value: value as number }));

        newTiles.push({
          id: `funnel-${catCol}`,
          type: "funnel",
          title: `${numCol} Funnel by ${catCol}`,
          size: "medium",
          data: funnelData,
          color: POWER_BI_COLORS[8]
        });
      }

      // Waterfall chart for cumulative analysis
      if (isAllowed("waterfall") && activeNumericCols.length > 0 && activeCategoricalCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const numCol = activeNumericCols[0];

        const grouped = dataToUse.reduce((acc: Record<string, number[]>, row) => {
          const key = String(row[catCol]);
          if (!acc[key]) acc[key] = [];
          const val = Number(row[numCol]);
          if (!isNaN(val)) acc[key].push(val);
          return acc;
        }, {});

        let cumulative = 0;
        const waterfallData = Object.entries(grouped).slice(0, 8).map(([name, values]) => {
          const valuesArr = values as number[];
          const avg = valuesArr.reduce((a, b) => a + b, 0) / valuesArr.length;
          const start = cumulative;
          cumulative += avg;
          return { name, value: avg, start, end: cumulative };
        });

        newTiles.push({
          id: `waterfall-${catCol}`,
          type: "waterfall",
          title: `Cumulative ${numCol}`,
          size: "large",
          data: waterfallData,
          color: POWER_BI_COLORS[9]
        });
      }

      // Box plot for statistical distribution
      if (isAllowed("boxplot") && activeNumericCols.length > 0 && activeCategoricalCols.length > 0) {
        const catCol = activeCategoricalCols[0];
        const numCol = activeNumericCols[0];

        const grouped = dataToUse.reduce((acc: Record<string, number[]>, row) => {
          const key = String(row[catCol]);
          if (!acc[key]) acc[key] = [];
          const val = Number(row[numCol]);
          if (!isNaN(val)) acc[key].push(val);
          return acc;
        }, {});

        const boxPlotData = Object.entries(grouped).slice(0, 6).map(([name, values]) => {
          const valuesArr = (values as number[]).sort((a, b) => a - b);
          const q1 = valuesArr[Math.floor(valuesArr.length * 0.25)] || 0;
          const median = valuesArr[Math.floor(valuesArr.length * 0.5)] || 0;
          const q3 = valuesArr[Math.floor(valuesArr.length * 0.75)] || 0;
          const min = valuesArr[0] || 0;
          const max = valuesArr[valuesArr.length - 1] || 0;
          return { name, min, q1, median, q3, max };
        });

        newTiles.push({
          id: `boxplot-${catCol}`,
          type: "boxplot",
          title: `${numCol} Stats by ${catCol}`,
          size: "medium",
          data: boxPlotData,
          color: POWER_BI_COLORS[3]
        });
      }

      setTiles(newTiles);
      // Auto-save snapshot
      setSnapshots(prev => [{ id: `snap-${Date.now()}`, timestamp: new Date(), label: templateToUse ? templateToUse.name : "Auto Generated", tiles: newTiles, tileCount: newTiles.length }, ...prev].slice(0, 20));
      setIsGenerating(false);
      const templateName = templateToUse ? ` with "${templateToUse.name}" template` : "";
      toast.success(`Generated ${newTiles.length} dashboard tiles${templateName} using ${dataToUse.length} rows`);
    }, 2000);
  }, [data, processedData, selectedColumns, columns, columnTypes, selectedTemplate]);

  // AI-Powered Dashboard Generation
  const generateAIDashboard = useCallback(async () => {
    setIsGenerating(true);
    const dataToUse = processedData.length > 0 ? processedData : data;
    
    try {
      const { data: result, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'ai_dashboard',
          data: dataToUse.slice(0, 200),
          columns,
          datasetName,
        }
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      if (result?.tiles && Array.isArray(result.tiles)) {
        const aiTiles: DashboardTile[] = result.tiles.map((t: any, i: number) => ({
          id: `ai-${t.type}-${i}-${Date.now()}`,
          type: t.type,
          title: t.title,
          size: t.size || "medium",
          data: t.data,
          value: t.config?.value,
          change: t.config?.change,
          color: POWER_BI_COLORS[i % POWER_BI_COLORS.length],
          aiInsight: t.insight,
          config: t.config,
          column: t.config?.subtitle,
        }));
        setTiles(aiTiles);
        // Auto-save snapshot
        setSnapshots(prev => [{ id: `snap-${Date.now()}`, timestamp: new Date(), label: "AI Generated", tiles: aiTiles, tileCount: aiTiles.length }, ...prev].slice(0, 20));
        toast.success(`AI generated ${aiTiles.length} professional dashboard tiles`);
        if (result.dashboardInsight) {
          toast.info(result.dashboardInsight, { duration: 8000 });
        }
      } else {
        toast.error("AI returned unexpected format, falling back to auto-generation");
        generateDashboard();
      }
    } catch (err) {
      console.error("AI dashboard error:", err);
      toast.error("AI dashboard generation failed, using auto-generation");
      generateDashboard();
    } finally {
      setIsGenerating(false);
    }
  }, [data, processedData, columns, datasetName, generateDashboard]);

  const renderTile = (tile: DashboardTile) => {
    const sizeClasses = {
      small: "col-span-1",
      medium: "col-span-1 sm:col-span-2",
      large: "col-span-1 sm:col-span-2 lg:col-span-3"
    };

    return (
      <Card 
        key={tile.id}
        className={`${sizeClasses[tile.size]} cursor-pointer transition-all hover:shadow-xl hover:scale-[1.02] ${
          selectedTile === tile.id ? "ring-2 ring-primary" : ""
        }`}
        onClick={() => setSelectedTile(tile.id === selectedTile ? null : tile.id)}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium truncate">{tile.title}</CardTitle>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                <Maximize2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {tile.type === "kpi" && (
            <div className="space-y-2">
              <div className="text-3xl font-bold" style={{ color: tile.color }}>
                {tile.value?.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </div>
              {tile.change !== undefined && (
                <div className={`flex items-center text-sm ${
                  tile.change >= 0 ? "text-green-500" : "text-red-500"
                }`}>
                  {tile.change >= 0 ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
                  {tile.change >= 0 ? "+" : ""}{tile.change.toFixed(2)}%
                </div>
              )}
            </div>
          )}

          {tile.type === "bar" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "line" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Line type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[2]} strokeWidth={2} dot={false} />
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "pie" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={tile.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    dataKey="value"
                    label={({ name }) => name}
                    labelLine={false}
                  >
                    {tile.data.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={POWER_BI_COLORS[index % POWER_BI_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "area" && tile.data && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tile.data}>
                  <defs>
                    <linearGradient id={`gradient-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tile.color || POWER_BI_COLORS[4]} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="index" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke={tile.color || POWER_BI_COLORS[4]} fill={`url(#gradient-${tile.id})`} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {tile.type === "combo" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={Object.keys(tile.data[0] || {})[1] || "value"} fill={POWER_BI_COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Line type="monotone" dataKey={Object.keys(tile.data[0] || {})[2] || "value2"} stroke={POWER_BI_COLORS[2]} strokeWidth={2} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Scatter Plot */}
          {tile.type === "scatter" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis type="number" dataKey="x" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name={tile.xAxis} />
                  <YAxis type="number" dataKey="y" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" name={tile.yAxis} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={tile.data} fill={tile.color || POWER_BI_COLORS[5]} />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Histogram */}
          {tile.type === "histogram" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 8 }} stroke="hsl(var(--muted-foreground))" angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="value" fill={tile.color || POWER_BI_COLORS[6]} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Gauge Chart */}
          {tile.type === "gauge" && (
            <div className="h-32 flex flex-col items-center justify-center">
              <div className="relative w-32 h-16 overflow-hidden">
                <div className="absolute inset-0 flex items-end justify-center">
                  <div 
                    className="w-32 h-32 rounded-full border-8 border-muted"
                    style={{ 
                      borderColor: `${tile.color || POWER_BI_COLORS[7]}20`,
                      clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)'
                    }}
                  />
                </div>
                <div className="absolute inset-0 flex items-end justify-center">
                  <div 
                    className="w-32 h-32 rounded-full border-8 transition-all duration-500"
                    style={{ 
                      borderColor: tile.color || POWER_BI_COLORS[7],
                      clipPath: `polygon(0 50%, 100% 50%, 100% 100%, 0 100%)`,
                      transform: `rotate(${((tile.value || 0) / 100) * 180 - 90}deg)`
                    }}
                  />
                </div>
              </div>
              <div className="text-2xl font-bold mt-2" style={{ color: tile.color || POWER_BI_COLORS[7] }}>
                {tile.value?.toFixed(1)}%
              </div>
            </div>
          )}

          {/* Treemap */}
          {tile.type === "treemap" && tile.data && (
            <div className="h-48 grid grid-cols-4 gap-1 p-2">
              {tile.data.slice(0, 16).map((item, idx) => {
                const maxValue = Math.max(...tile.data!.map(d => d.value || 0));
                const ratio = (item.value || 0) / maxValue;
                return (
                  <div
                    key={idx}
                    className="rounded flex items-center justify-center text-white text-xs font-medium p-1 truncate"
                    style={{
                      backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length],
                      opacity: 0.5 + ratio * 0.5,
                      gridColumn: ratio > 0.5 ? 'span 2' : 'span 1',
                      gridRow: ratio > 0.7 ? 'span 2' : 'span 1'
                    }}
                    title={`${item.name}: ${item.value?.toFixed(2)}`}
                  >
                    {item.name?.split('/')[1] || item.name}
                  </div>
                );
              })}
            </div>
          )}

          {/* Funnel Chart */}
          {tile.type === "funnel" && tile.data && (
            <div className="h-48 flex flex-col justify-center space-y-1 px-4">
              {tile.data.map((item, idx) => {
                const maxValue = tile.data![0]?.value || 1;
                const width = ((item.value || 0) / maxValue) * 100;
                return (
                  <div key={idx} className="flex items-center gap-2">
                    <div 
                      className="h-6 rounded-r-full flex items-center justify-end pr-2 text-white text-xs font-medium transition-all"
                      style={{
                        width: `${width}%`,
                        backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length],
                        minWidth: '40px'
                      }}
                    >
                      {item.value?.toFixed(0)}
                    </div>
                    <span className="text-xs text-muted-foreground truncate">{item.name}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Waterfall Chart */}
          {tile.type === "waterfall" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip />
                  <Bar dataKey="start" stackId="a" fill="transparent" />
                  <Bar dataKey="value" stackId="a" fill={tile.color || POWER_BI_COLORS[9]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Conditional Bar (positive=green, negative=red) */}
          {tile.type === "conditional_bar" && tile.data && (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeWidth={1} />
                  <Bar dataKey="value" radius={[3, 3, 0, 0]} label={{ position: 'top', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }}>
                    {tile.data.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.value >= 0 
                          ? (tile.config?.positiveColor || "#22c55e") 
                          : (tile.config?.negativeColor || "#ef4444")} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Multi-Line Chart */}
          {tile.type === "multi_line" && tile.data && tile.config?.series && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsLine data={tile.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  {(tile.config.series as any[]).map((s: any, idx: number) => (
                    <Line key={s.key} type="monotone" dataKey={s.key} name={s.name} stroke={s.color || POWER_BI_COLORS[idx]} strokeWidth={s.strokeWidth || 2} strokeDasharray={s.strokeDasharray || undefined} dot={false} />
                  ))}
                </RechartsLine>
              </ResponsiveContainer>
            </div>
          )}

          {/* Annotated Area Chart */}
          {tile.type === "annotated_area" && tile.data && (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={tile.data}>
                  <defs>
                    <linearGradient id={`ann-g-${tile.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={tile.config?.fillColor || "#3b82f6"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={tile.config?.fillColor || "#3b82f6"} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 11 }} />
                  <Area type="monotone" dataKey="value" stroke={tile.config?.fillColor || "#3b82f6"} fill={`url(#ann-g-${tile.id})`} strokeWidth={2} dot={false} />
                  {tile.config?.annotations?.map((ann: any, idx: number) => (
                    <ReferenceDot key={idx} x={ann.x} y={ann.y} r={4} fill="#f97316" stroke="#fff" strokeWidth={2}>
                      <RechartsLabel value={ann.label} position="top" fill="hsl(var(--foreground))" fontSize={9} />
                    </ReferenceDot>
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Heatmap */}
          {tile.type === "heatmap" && tile.data && tile.config && (
            <div className="overflow-x-auto">
              <div className="min-w-[300px]">
                <div className="flex">
                  <div className="w-12 shrink-0" />
                  {(tile.config.xLabels || []).map((xl: string, i: number) => (
                    <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground font-medium truncate px-0.5">{xl}</div>
                  ))}
                </div>
                {(tile.config.yLabels || []).map((yl: string, yi: number) => (
                  <div key={yi} className="flex items-center">
                    <div className="w-12 shrink-0 text-[9px] text-muted-foreground font-medium text-right pr-1 truncate">{yl}</div>
                    {(tile.config.xLabels || []).map((xl: string, xi: number) => {
                      const cell = tile.data!.find((d: any) => d.x === xl && d.y === yl);
                      const val = cell?.value ?? 0;
                      const allVals = tile.data!.map((d: any) => d.value || 0);
                      const minVal = Math.min(...allVals);
                      const maxVal = Math.max(...allVals);
                      const range = maxVal - minVal || 1;
                      const ratio = (val - minVal) / range;
                      const bg = ratio > 0.5
                        ? `color-mix(in srgb, ${tile.config?.maxColor || "#22c55e"} ${((ratio - 0.5) * 2 * 100).toFixed(0)}%, ${tile.config?.midColor || "#fef08a"})`
                        : `color-mix(in srgb, ${tile.config?.midColor || "#fef08a"} ${(ratio * 2 * 100).toFixed(0)}%, ${tile.config?.minColor || "#dc2626"})`;
                      return (
                        <div key={`${yi}-${xi}`} className="flex-1 flex items-center justify-center text-[9px] font-medium border border-background/50 py-1.5 rounded-sm"
                          style={{ backgroundColor: bg, color: ratio < 0.3 || ratio > 0.7 ? '#fff' : '#1a1a1a' }}
                          title={`${yl} / ${xl}: ${val}`}
                        >
                          {typeof val === 'number' ? val.toFixed(1) : val}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Box Plot */}
          {tile.type === "boxplot" && tile.data && (
            <div className="h-48 flex items-end justify-around px-4 pb-6">
              {tile.data.map((item, idx) => {
                const maxVal = Math.max(...tile.data!.map(d => d.max || 0));
                const scale = (val: number) => (val / maxVal) * 140;
                return (
                  <div key={idx} className="flex flex-col items-center relative" style={{ height: '100%' }}>
                    <div className="absolute w-px bg-muted-foreground" style={{ bottom: `${scale(item.min || 0)}px`, height: `${scale((item.max || 0) - (item.min || 0))}px` }} />
                    <div className="absolute w-8 rounded" style={{ bottom: `${scale(item.q1 || 0)}px`, height: `${scale((item.q3 || 0) - (item.q1 || 0))}px`, backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length] }} />
                    <div className="absolute w-8 h-0.5 bg-white" style={{ bottom: `${scale(item.median || 0)}px` }} />
                    <span className="absolute -bottom-5 text-[10px] text-muted-foreground truncate max-w-12">{item.name}</span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Box Plot */}
          {tile.type === "boxplot" && tile.data && (
            <div className="h-48 flex items-end justify-around px-4 pb-6">
              {tile.data.map((item, idx) => {
                const maxVal = Math.max(...tile.data!.map(d => d.max || 0));
                const scale = (val: number) => (val / maxVal) * 140;
                return (
                  <div key={idx} className="flex flex-col items-center relative" style={{ height: '100%' }}>
                    {/* Whisker line */}
                    <div 
                      className="absolute w-px bg-muted-foreground"
                      style={{
                        bottom: `${scale(item.min || 0)}px`,
                        height: `${scale((item.max || 0) - (item.min || 0))}px`
                      }}
                    />
                    {/* Box */}
                    <div 
                      className="absolute w-8 rounded"
                      style={{
                        bottom: `${scale(item.q1 || 0)}px`,
                        height: `${scale((item.q3 || 0) - (item.q1 || 0))}px`,
                        backgroundColor: POWER_BI_COLORS[idx % POWER_BI_COLORS.length]
                      }}
                    />
                    {/* Median line */}
                    <div 
                      className="absolute w-8 h-0.5 bg-white"
                      style={{
                        bottom: `${scale(item.median || 0)}px`
                      }}
                    />
                    <span className="absolute -bottom-5 text-[10px] text-muted-foreground truncate max-w-12">
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-cyan-500/10 via-teal-500/5 to-transparent border-cyan-500/30">
        <CardHeader className="p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 shadow-lg shadow-cyan-500/25">
                <LayoutDashboard className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-base sm:text-xl flex items-center gap-2 flex-wrap">
                  <span className="hidden xs:inline">Power BI Style</span>
                  <span className="xs:hidden">Power BI</span> Dashboard
                  <Badge variant="secondary" className="text-[10px] sm:text-xs bg-cyan-500/10 text-cyan-600">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-0.5 sm:mt-1 text-xs sm:text-sm hidden sm:block">
                  Enterprise-grade visualizations with one-click generation
                </CardDescription>
              </div>
            </div>
            
            {/* Actions - two-row wrapped layout */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              {/* Row 1: Primary actions */}
              <Button onClick={() => generateAIDashboard()} disabled={isGenerating} size="sm" className="bg-gradient-to-r from-cyan-500 to-teal-600 shrink-0 text-xs sm:text-sm gap-1 sm:gap-2">
                {isGenerating ? <><Loader2 className="h-4 w-4 animate-spin" /><span className="hidden sm:inline">AI Generating...</span></> : <><Sparkles className="h-4 w-4" /><span className="hidden xs:inline">AI Generate</span></>}
              </Button>
              <Button onClick={() => generateDashboard()} disabled={isGenerating} variant="outline" size="sm" className="shrink-0 text-xs sm:text-sm gap-1 sm:gap-2">
                <Zap className="h-4 w-4" /><span className="hidden sm:inline">Quick</span>
              </Button>
              {tiles.length > 0 && (
                <Button
                  variant={editMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setEditMode(!editMode)}
                  className={`shrink-0 text-xs sm:text-sm ${editMode ? "bg-gradient-to-r from-orange-500 to-red-500" : ""}`}
                >
                  <Edit3 className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">{editMode ? "Done" : "Edit"}</span>
                </Button>
              )}
              {tiles.length > 0 && (
                <Button
                  variant={showInsights ? "default" : "outline"}
                  size="sm"
                  onClick={() => setShowInsights(!showInsights)}
                  className={`shrink-0 text-xs sm:text-sm ${showInsights ? "bg-gradient-to-r from-violet-500 to-purple-600" : ""}`}
                >
                  <Brain className="h-4 w-4 sm:mr-1" />
                  <span className="hidden sm:inline">Insights</span>
                </Button>
              )}
              <Button onClick={() => setShowTemplateSelector(true)} variant="outline" size="sm" className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
                <LayoutTemplate className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </Button>

              {/* Row 2: Secondary actions */}
              <IntentDashboardBuilder data={data} columns={columns} datasetName={datasetName} onTilesGenerated={(t) => { setTiles(t); setSnapshots(prev => [{ id: `snap-${Date.now()}`, timestamp: new Date(), label: "Intent Build", tiles: t, tileCount: t.length }, ...prev].slice(0, 20)); }} />
              <KPIDependencyGraph data={data} columns={columns} datasetName={datasetName} />
              <PredictiveOverlay tiles={tiles} data={data} columns={columns} datasetName={datasetName} onTilesUpdate={setTiles} />
              <DashboardVersionHistory snapshots={snapshots} currentTiles={tiles} onRestore={setTiles} onFork={(label, t) => setSnapshots(prev => [{ id: `fork-${Date.now()}`, timestamp: new Date(), label, tiles: t, tileCount: t.length }, ...prev].slice(0, 20))} />
              <SensitivityControls isBlurred={isBlurred} onToggleBlur={() => setIsBlurred(!isBlurred)} />
              <DecisionLog datasetName={datasetName} />
              <DashboardScore tiles={tiles} data={data} columns={columns} datasetName={datasetName} />
              <Button
                variant={showProfiling ? "default" : "outline"}
                size="sm"
                onClick={() => setShowProfiling(!showProfiling)}
                className={`shrink-0 text-xs sm:text-sm ${showProfiling ? "bg-gradient-to-r from-indigo-500 to-purple-600" : ""}`}
              >
                <Brain className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Profiling</span>
              </Button>
              <Button
                variant={showDataEditor ? "default" : "outline"}
                size="sm"
                onClick={() => setShowDataEditor(!showDataEditor)}
                className={`shrink-0 text-xs sm:text-sm ${showDataEditor ? "bg-gradient-to-r from-purple-500 to-pink-600" : ""}`}
              >
                <Edit3 className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Edit Data</span>
              </Button>
              {tiles.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleExportPdf} className="gap-1 sm:gap-2 shrink-0 text-xs sm:text-sm">
                  <FileDown className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} className="shrink-0">
                {viewMode === "grid" ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card className="bg-gradient-to-br from-cyan-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-cyan-600">
              <Layers className="h-4 w-4" />
              <span className="text-xs font-medium">Total Tiles</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tiles.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-teal-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-teal-600">
              <BarChart3 className="h-4 w-4" />
              <span className="text-xs font-medium">Charts</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tiles.filter(t => t.type !== "kpi").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-emerald-600">
              <Target className="h-4 w-4" />
              <span className="text-xs font-medium">KPIs</span>
            </div>
            <p className="text-2xl font-bold mt-1">{tiles.filter(t => t.type === "kpi").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500/5 to-transparent">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-green-600">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Data Points</span>
            </div>
            <p className="text-2xl font-bold mt-1">{data.length.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Data Profiling Panel */}
      {showProfiling && (
        <DataProfilingPanel
          data={processedData.length > 0 ? processedData : data}
          columns={selectedColumns.length > 0 ? selectedColumns : columns}
          columnTypes={columnTypes}
          datasetName={datasetName}
          onChartSuggestion={(suggestion) => {
            toast.success(`Chart suggestion: ${suggestion.title}`);
          }}
          onDataCleaned={(cleanedData) => {
            setProcessedData(cleanedData);
            toast.success(`Data cleaned: ${cleanedData.length} rows updated`);
          }}
        />
      )}

      {/* Data Editor Panel */}
      {showDataEditor && (
        <Card className="bg-gradient-to-br from-purple-500/10 via-pink-500/5 to-transparent border-purple-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600">
                  <Edit3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Data Editor</CardTitle>
                  <CardDescription>Select columns and apply transformations</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowDataEditor(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Column Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-purple-500" />
                  Select Columns
                </Label>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedColumns(columns)}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedColumns([])}
                  >
                    Clear
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {columns.map(col => (
                  <div
                    key={col}
                    onClick={() => toggleColumnSelection(col)}
                    className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                      selectedColumns.includes(col)
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-border hover:border-purple-500/50"
                    }`}
                  >
                    <Checkbox 
                      checked={selectedColumns.includes(col)}
                      onCheckedChange={() => toggleColumnSelection(col)}
                    />
                    <span className="text-xs truncate">{col}</span>
                    <Badge variant="outline" className="text-[10px] ml-auto">
                      {columnTypes[col]?.slice(0, 3) || "str"}
                    </Badge>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedColumns.length} of {columns.length} columns selected
              </p>
            </div>

            {/* Transformations */}
            <div className="space-y-3">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Settings2 className="h-4 w-4 text-purple-500" />
                Data Transformations
              </Label>
              
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => addTransformation("filter")}>
                  <Filter className="h-3 w-3 mr-1" />
                  Filter
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTransformation("sort")}>
                  <SlidersHorizontal className="h-3 w-3 mr-1" />
                  Sort
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTransformation("remove_nulls")}>
                  <Trash2 className="h-3 w-3 mr-1" />
                  Remove Nulls
                </Button>
                <Button variant="outline" size="sm" onClick={() => addTransformation("normalize")}>
                  <Activity className="h-3 w-3 mr-1" />
                  Normalize
                </Button>
              </div>

              {/* Transformation List */}
              {transformations.length > 0 && (
                <div className="space-y-2 mt-4">
                  {transformations.map((transform, idx) => (
                    <div key={transform.id} className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 flex-wrap">
                      <Badge variant="secondary" className="text-xs">
                        {idx + 1}. {transform.type}
                      </Badge>
                      
                      <Select
                        value={transform.column}
                        onValueChange={(val) => updateTransformation(transform.id, { column: val })}
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue placeholder="Column" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedColumns.map(col => (
                            <SelectItem key={col} value={col}>{col}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {transform.type === "filter" && (
                        <>
                          <Select
                            value={transform.operator}
                            onValueChange={(val) => updateTransformation(transform.id, { operator: val })}
                          >
                            <SelectTrigger className="w-28 h-8">
                              <SelectValue placeholder="Operator" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Equals</SelectItem>
                              <SelectItem value="contains">Contains</SelectItem>
                              <SelectItem value="greater">Greater than</SelectItem>
                              <SelectItem value="less">Less than</SelectItem>
                              <SelectItem value="not_empty">Not empty</SelectItem>
                            </SelectContent>
                          </Select>
                          {transform.operator !== "not_empty" && (
                            <Input
                              className="w-24 h-8"
                              placeholder="Value"
                              value={transform.value?.toString() || ""}
                              onChange={(e) => updateTransformation(transform.id, { value: e.target.value })}
                            />
                          )}
                        </>
                      )}

                      {transform.type === "sort" && (
                        <Select
                          value={transform.direction || "asc"}
                          onValueChange={(val) => updateTransformation(transform.id, { direction: val as "asc" | "desc" })}
                        >
                          <SelectTrigger className="w-32 h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="asc">Ascending</SelectItem>
                            <SelectItem value="desc">Descending</SelectItem>
                          </SelectContent>
                        </Select>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 ml-auto"
                        onClick={() => removeTransformation(transform.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <Button
                onClick={autoCleanData}
                disabled={isProcessing}
                variant="outline"
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Auto Clean
              </Button>
              <Button
                onClick={applyTransformations}
                disabled={isProcessing || selectedColumns.length === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-600 gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Apply Changes
                  </>
                )}
              </Button>
              <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                <span>Original: {data.length} rows</span>
                <span>â€¢</span>
                <span className="text-purple-500 font-medium">Processed: {processedData.length} rows</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid */}
      {tiles.length === 0 && !isGenerating && (
        <Card className="border-dashed border-2 border-muted-foreground/20">
          <CardContent className="py-16 text-center">
            <div className="max-w-md mx-auto space-y-4">
              <div className="p-4 rounded-full bg-gradient-to-br from-cyan-500/10 to-teal-500/10 inline-block">
                <LayoutDashboard className="h-12 w-12 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold">Generate Your Dashboard</h3>
              <p className="text-muted-foreground">
                Click "Generate Dashboard" to create a Power BI-style dashboard with AI-powered chart recommendations.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {isGenerating && (
        <Card>
          <CardContent className="py-16 text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto text-cyan-500 mb-4" />
            <h3 className="text-lg font-semibold">Analyzing your data...</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Creating optimal visualizations for {datasetName}
            </p>
          </CardContent>
        </Card>
      )}

      {tiles.length > 0 && !isGenerating && editMode && (
        <AIDashboardEditor
          tiles={tiles}
          onTilesUpdate={setTiles}
          data={processedData.length > 0 ? processedData : data}
          columns={columns}
          datasetName={datasetName}
        />
      )}

      <div className={`flex gap-4 ${showInsights && tiles.length > 0 ? "flex-col lg:flex-row" : ""}`}>
        <div className="flex-1 min-w-0">
          {tiles.length > 0 && !isGenerating && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={(event) => setActiveDragId(String(event.active.id))}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={tiles.map(t => t.id)} strategy={rectSortingStrategy}>
                <div className={`grid gap-4 ${
                  viewMode === "grid" 
                    ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3" 
                    : "grid-cols-1"
                }`}>
                  {tiles.map((tile) => (
                    <DraggableTile
                      key={tile.id}
                      tile={tile}
                      isSelected={selectedTile === tile.id}
                      onSelect={() => setSelectedTile(tile.id === selectedTile ? null : tile.id)}
                      viewMode={viewMode}
                      onResize={handleTileResize}
                      onEdit={(t) => setEditingTile(t)}
                      onDelete={handleTileDelete}
                      onAIExplain={handleAIExplain}
                      isDragging={activeDragId === tile.id}
                      isExplaining={explainingTileId === tile.id}
                      editMode={editMode}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>

        {showInsights && tiles.length > 0 && (
          <div className="w-full lg:w-80 shrink-0">
            <RealtimeInsightsPanel
              tiles={tiles}
              data={processedData.length > 0 ? processedData : data}
              columns={columns}
              datasetName={datasetName}
            />
          </div>
        )}
      </div>

      {/* Template Selector Dialog */}
      <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutTemplate className="h-5 w-5 text-cyan-500" />
              Choose Dashboard Template
            </DialogTitle>
            <DialogDescription>
              Select a template to generate a dashboard optimized for your use case
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {DASHBOARD_TEMPLATES.map((template) => {
              const IconComponent = template.icon;
              const isSelected = selectedTemplate?.id === template.id;
              
              return (
                <Card 
                  key={template.id}
                  className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${
                    isSelected ? "ring-2 ring-cyan-500 bg-cyan-500/5" : ""
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-lg bg-gradient-to-br ${template.color} shadow-lg`}>
                        <IconComponent className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                          {template.name}
                          {isSelected && <CheckCircle2 className="h-4 w-4 text-cyan-500" />}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.tileTypes.slice(0, 5).map((type) => (
                            <Badge key={type} variant="secondary" className="text-[10px] px-1.5 py-0">
                              {type}
                            </Badge>
                          ))}
                          {template.tileTypes.length > 5 && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              +{template.tileTypes.length - 5}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowTemplateSelector(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowTemplateSelector(false);
                generateDashboard(selectedTemplate || undefined);
              }}
              className="bg-gradient-to-r from-cyan-500 to-teal-600"
            >
              <Zap className="h-4 w-4 mr-2" />
              Generate with {selectedTemplate?.name || "Default"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Tile Editor Dialog */}
      {editingTile && (
        <TileEditor
          tile={editingTile}
          open={!!editingTile}
          onOpenChange={(open) => { if (!open) setEditingTile(null); }}
          onSave={handleTileUpdate}
          columns={columns}
          columnTypes={columnTypes}
          data={processedData.length > 0 ? processedData : data}
        />
      )}
    </div>
  );
};

export default PowerBIDashboard;
