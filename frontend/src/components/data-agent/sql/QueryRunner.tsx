import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Download, Copy, AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface QueryRunnerProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTime: number;
  success: boolean;
  error?: string;
}

// Simple SQL parser for in-memory execution
const executeSimpleQuery = (sql: string, data: Record<string, unknown>[], columns: string[]): QueryResult => {
  const startTime = performance.now();
  
  try {
    const normalizedSQL = sql.trim().toLowerCase();
    
    // Only support SELECT queries for simulation
    if (!normalizedSQL.startsWith("select")) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        success: false,
        error: "Only SELECT queries are supported in simulation mode",
      };
    }

    // Parse SELECT columns
    const selectMatch = normalizedSQL.match(/select\s+(.+?)\s+from/);
    if (!selectMatch) {
      return {
        columns: [],
        rows: [],
        rowCount: 0,
        executionTime: 0,
        success: false,
        error: "Invalid SELECT syntax",
      };
    }

    const selectPart = selectMatch[1].trim();
    let selectedColumns: string[];
    
    if (selectPart === "*") {
      selectedColumns = columns;
    } else {
      selectedColumns = selectPart.split(",").map((c) => c.trim().split(/\s+as\s+/i).pop()?.trim() || c.trim());
    }

    // Parse WHERE clause (simple equality only)
    let filteredData = [...data];
    const whereMatch = normalizedSQL.match(/where\s+(.+?)(?:order|group|limit|$)/);
    if (whereMatch) {
      const conditions = whereMatch[1].split(/\s+and\s+/);
      conditions.forEach((cond) => {
        const eqMatch = cond.match(/(\w+)\s*=\s*['"]?([^'"]+)['"]?/);
        if (eqMatch) {
          const [, col, val] = eqMatch;
          filteredData = filteredData.filter((row) => {
            const rowVal = String(row[col] || "").toLowerCase();
            return rowVal === val.toLowerCase();
          });
        }
        
        const gtMatch = cond.match(/(\w+)\s*>\s*(\d+)/);
        if (gtMatch) {
          const [, gtCol, gtVal] = gtMatch;
          filteredData = filteredData.filter((row) => Number(row[gtCol]) > Number(gtVal));
        }
        
        const ltMatch = cond.match(/(\w+)\s*<\s*(\d+)/);
        if (ltMatch) {
          const [, ltCol, ltVal] = ltMatch;
          filteredData = filteredData.filter((row) => Number(row[ltCol]) < Number(ltVal));
        }
      });
    }

    // Parse ORDER BY
    const orderMatch = normalizedSQL.match(/order\s+by\s+(\w+)(?:\s+(asc|desc))?/);
    if (orderMatch) {
      const [, orderCol, direction] = orderMatch;
      filteredData.sort((a, b) => {
        const aVal = a[orderCol];
        const bVal = b[orderCol];
        const cmp = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
        return direction === "desc" ? -cmp : cmp;
      });
    }

    // Parse LIMIT
    const limitMatch = normalizedSQL.match(/limit\s+(\d+)/);
    if (limitMatch) {
      filteredData = filteredData.slice(0, parseInt(limitMatch[1]));
    }

    // Project selected columns
    const resultColumns = selectPart === "*" ? columns : columns.filter((c) => 
      selectedColumns.some((sc) => sc.toLowerCase() === c.toLowerCase())
    );
    
    const resultRows = filteredData.map((row) => {
      const projected: Record<string, unknown> = {};
      resultColumns.forEach((col) => {
        projected[col] = row[col];
      });
      return projected;
    });

    const endTime = performance.now();
    
    return {
      columns: resultColumns,
      rows: resultRows,
      rowCount: resultRows.length,
      executionTime: Math.round(endTime - startTime),
      success: true,
    };
  } catch (err) {
    const endTime = performance.now();
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      executionTime: Math.round(endTime - startTime),
      success: false,
      error: err instanceof Error ? err.message : "Query execution failed",
    };
  }
};

const EXAMPLE_QUERIES = [
  { label: "All data", query: "SELECT * FROM dataset LIMIT 100" },
  { label: "Count rows", query: "SELECT * FROM dataset" },
  { label: "Filter numeric", query: "SELECT * FROM dataset WHERE column > 0 LIMIT 50" },
  { label: "Sort descending", query: "SELECT * FROM dataset ORDER BY column DESC LIMIT 20" },
];

const QueryRunner = ({ data, columns, columnTypes, datasetName }: QueryRunnerProps) => {
  const tableName = useMemo(() =>
    datasetName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
    [datasetName]
  );

  const [query, setQuery] = useState(`SELECT * FROM ${tableName} LIMIT 100`);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<{ query: string; time: Date; success: boolean }[]>([]);

  const runQuery = async () => {
    setIsRunning(true);
    // Simulate network delay
    await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
    
    const result = executeSimpleQuery(query, data, columns);
    setResult(result);
    setHistory((prev) => [{ query, time: new Date(), success: result.success }, ...prev.slice(0, 9)]);
    setIsRunning(false);
    
    if (result.success) {
      toast.success(`Query returned ${result.rowCount} rows in ${result.executionTime}ms`);
    } else {
      toast.error(result.error || "Query failed");
    }
  };

  const exportCSV = () => {
    if (!result || !result.success) return;
    
    const headers = result.columns.join(",");
    const rows = result.rows.map((row) =>
      result.columns.map((col) => {
        const val = row[col];
        if (val === null || val === undefined) return "";
        const str = String(val);
        return str.includes(",") ? `"${str}"` : str;
      }).join(",")
    );
    
    const csv = [headers, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query_results_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Results exported to CSV");
  };

  const copyResults = () => {
    if (!result || !result.success) return;
    const text = JSON.stringify(result.rows, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Results copied as JSON");
  };

  return (
    <div className="space-y-4">
      {/* Query Editor */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Query Editor</CardTitle>
              <CardDescription className="text-xs">
                Run SQL queries against your dataset (simulated in-browser)
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-[10px]">
              Table: {tableName}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter your SQL query..."
            className="font-mono text-xs min-h-[120px] resize-y"
          />
          
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((ex, i) => (
              <Button
                key={i}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setQuery(ex.query.replace("dataset", tableName).replace("column", columns[0] || "id"))}
              >
                {ex.label}
              </Button>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Button onClick={runQuery} disabled={isRunning || !query.trim()}>
              {isRunning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {isRunning ? "Running..." : "Run Query"}
            </Button>
            
            {result?.success && (
              <>
                <Button variant="outline" onClick={exportCSV}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={copyResults}>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy JSON
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {result.success ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-destructive" />
                )}
                <CardTitle className="text-base">
                  {result.success ? "Results" : "Error"}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3.5 h-3.5" />
                {result.executionTime}ms
                {result.success && (
                  <Badge variant="secondary" className="text-[10px]">
                    {result.rowCount} rows
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {result.success ? (
              <ScrollArea className="h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {result.columns.map((col) => (
                        <TableHead key={col} className="text-xs font-semibold">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.rows.slice(0, 100).map((row, i) => (
                      <TableRow key={i}>
                        {result.columns.map((col) => (
                          <TableCell key={col} className="text-xs py-2 font-mono">
                            {row[col] === null || row[col] === undefined
                              ? <span className="text-muted-foreground">NULL</span>
                              : String(row[col]).slice(0, 100)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {result.rows.length > 100 && (
                  <p className="text-xs text-center text-muted-foreground py-2">
                    Showing first 100 of {result.rowCount} rows
                  </p>
                )}
              </ScrollArea>
            ) : (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <p className="text-sm text-destructive">{result.error}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Query History */}
      {history.length > 0 && (
        <Card className="border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Query History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg cursor-pointer hover:bg-secondary/50 transition-colors"
                  onClick={() => setQuery(h.query)}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {h.success ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0" />
                    )}
                    <code className="text-xs font-mono truncate">{h.query}</code>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {h.time.toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QueryRunner;
