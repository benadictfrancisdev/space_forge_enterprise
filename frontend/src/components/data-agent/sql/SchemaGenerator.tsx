import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Database, Copy, Download, Key, Zap } from "lucide-react";
import { toast } from "sonner";

interface SchemaGeneratorProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

interface ColumnConfig {
  sqlType: string;
  nullable: boolean;
  indexed: boolean;
  defaultValue: string;
  isPrimaryKey: boolean;
}

const SQL_TYPES = ["INTEGER", "BIGINT", "NUMERIC", "DECIMAL(10,2)", "VARCHAR(255)", "TEXT", "BOOLEAN", "DATE", "TIMESTAMP", "JSON"];

const SchemaGenerator = ({ data, columns, columnTypes, datasetName }: SchemaGeneratorProps) => {
  const tableName = useMemo(() =>
    datasetName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
    [datasetName]
  );

  const [batchSize, setBatchSize] = useState(100);
  const [includeDropTable, setIncludeDropTable] = useState(false);
  const [columnConfigs, setColumnConfigs] = useState<Record<string, ColumnConfig>>(() => {
    const configs: Record<string, ColumnConfig> = {};
    columns.forEach((col) => {
      configs[col] = {
        sqlType: inferSqlType(col, columnTypes[col], data),
        nullable: true,
        indexed: false,
        defaultValue: "",
        isPrimaryKey: false,
      };
    });
    return configs;
  });

  function inferSqlType(col: string, type: string, sampleData: Record<string, unknown>[]): string {
    if (type === "numeric") {
      const samples = sampleData.slice(0, 50).map((r) => r[col]);
      const hasDecimals = samples.some((v) => {
        const num = Number(v);
        return !isNaN(num) && num % 1 !== 0;
      });
      return hasDecimals ? "DECIMAL(10,2)" : "INTEGER";
    }
    if (type === "date") return "TIMESTAMP";
    const samples = sampleData.slice(0, 20).map((r) => String(r[col] || ""));
    const maxLen = Math.max(...samples.map((s) => s.length), 1);
    return maxLen > 255 ? "TEXT" : "VARCHAR(255)";
  }

  const updateColumnConfig = (col: string, updates: Partial<ColumnConfig>) => {
    setColumnConfigs((prev) => ({
      ...prev,
      [col]: { ...prev[col], ...updates },
    }));
  };

  const setPrimaryKey = (col: string) => {
    setColumnConfigs((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        updated[key] = { ...updated[key], isPrimaryKey: key === col };
      });
      return updated;
    });
  };

  const createTableSQL = useMemo(() => {
    const lines: string[] = [];
    if (includeDropTable) {
      lines.push(`DROP TABLE IF EXISTS ${tableName};`);
      lines.push("");
    }
    lines.push(`CREATE TABLE ${tableName} (`);

    const colDefs: string[] = [];
    const primaryKeyCol = Object.entries(columnConfigs).find(([_, cfg]) => cfg.isPrimaryKey)?.[0];

    columns.forEach((col) => {
      const cfg = columnConfigs[col];
      const colName = col.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      let def = `  ${colName} ${cfg.sqlType}`;
      if (cfg.isPrimaryKey) def += " PRIMARY KEY";
      if (!cfg.nullable && !cfg.isPrimaryKey) def += " NOT NULL";
      if (cfg.defaultValue) def += ` DEFAULT ${cfg.defaultValue}`;
      colDefs.push(def);
    });

    lines.push(colDefs.join(",\n"));
    lines.push(");");

    // Index suggestions
    const indexedCols = columns.filter((col) => columnConfigs[col].indexed);
    if (indexedCols.length > 0) {
      lines.push("");
      lines.push("-- Suggested indexes");
      indexedCols.forEach((col) => {
        const colName = col.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
        lines.push(`CREATE INDEX idx_${tableName}_${colName} ON ${tableName}(${colName});`);
      });
    }

    return lines.join("\n");
  }, [columns, columnConfigs, tableName, includeDropTable]);

  const insertSQL = useMemo(() => {
    const colNames = columns.map((c) => c.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase());
    const batches: string[] = [];
    const totalBatches = Math.ceil(data.length / batchSize);

    for (let b = 0; b < Math.min(totalBatches, 3); b++) {
      const start = b * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const rows = data.slice(start, end).map((row) => {
        const vals = columns.map((col) => {
          const v = row[col];
          if (v === null || v === undefined || v === "") return "NULL";
          const cfg = columnConfigs[col];
          if (cfg.sqlType.includes("INT") || cfg.sqlType.includes("NUMERIC") || cfg.sqlType.includes("DECIMAL")) {
            const num = Number(v);
            return isNaN(num) ? "NULL" : String(num);
          }
          return `'${String(v).replace(/'/g, "''")}'`;
        });
        return `  (${vals.join(", ")})`;
      });
      batches.push(`-- Batch ${b + 1}\nINSERT INTO ${tableName} (${colNames.join(", ")})\nVALUES\n${rows.join(",\n")};`);
    }

    if (totalBatches > 3) {
      batches.push(`\n-- ... ${totalBatches - 3} more batches (${data.length} total rows)`);
    }

    return batches.join("\n\n");
  }, [columns, data, columnConfigs, tableName, batchSize]);

  const fullSQL = useMemo(() => `${createTableSQL}\n\n${insertSQL}`, [createTableSQL, insertSQL]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const downloadSQL = () => {
    const blob = new Blob([fullSQL], { type: "text/sql" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SQL file downloaded");
  };

  const suggestIndexes = () => {
    // Auto-suggest indexes for categorical columns with high cardinality
    const suggestions: string[] = [];
    columns.forEach((col) => {
      const type = columnTypes[col];
      if (type === "categorical" || type === "date") {
        updateColumnConfig(col, { indexed: true });
        suggestions.push(col);
      }
    });
    if (suggestions.length > 0) {
      toast.success(`Suggested ${suggestions.length} indexes: ${suggestions.slice(0, 3).join(", ")}${suggestions.length > 3 ? "..." : ""}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Options */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">Schema Options</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {data.length} rows • {columns.length} cols
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Checkbox
                id="dropTable"
                checked={includeDropTable}
                onCheckedChange={(v) => setIncludeDropTable(!!v)}
              />
              <label htmlFor="dropTable" className="text-sm">Include DROP TABLE</label>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Batch size:</label>
              <Input
                type="number"
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 100))}
                className="w-20 h-8"
              />
            </div>
            <Button variant="outline" size="sm" onClick={suggestIndexes}>
              <Zap className="w-3.5 h-3.5 mr-1" />
              Auto-suggest Indexes
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Column Configuration */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Column Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs w-[150px]">Column</TableHead>
                  <TableHead className="text-xs w-[140px]">SQL Type</TableHead>
                  <TableHead className="text-xs w-[60px] text-center">PK</TableHead>
                  <TableHead className="text-xs w-[60px] text-center">NULL</TableHead>
                  <TableHead className="text-xs w-[60px] text-center">Index</TableHead>
                  <TableHead className="text-xs">Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {columns.map((col) => {
                  const cfg = columnConfigs[col];
                  return (
                    <TableRow key={col}>
                      <TableCell className="text-xs font-mono py-2">{col}</TableCell>
                      <TableCell className="py-2">
                        <Select
                          value={cfg.sqlType}
                          onValueChange={(v) => updateColumnConfig(col, { sqlType: v })}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SQL_TYPES.map((t) => (
                              <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Button
                          variant={cfg.isPrimaryKey ? "default" : "ghost"}
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => setPrimaryKey(col)}
                        >
                          <Key className="w-3 h-3" />
                        </Button>
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Checkbox
                          checked={cfg.nullable}
                          onCheckedChange={(v) => updateColumnConfig(col, { nullable: !!v })}
                        />
                      </TableCell>
                      <TableCell className="text-center py-2">
                        <Checkbox
                          checked={cfg.indexed}
                          onCheckedChange={(v) => updateColumnConfig(col, { indexed: !!v })}
                        />
                      </TableCell>
                      <TableCell className="py-2">
                        <Input
                          value={cfg.defaultValue}
                          onChange={(e) => updateColumnConfig(col, { defaultValue: e.target.value })}
                          placeholder="e.g., 0 or 'active'"
                          className="h-7 text-xs"
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Generated SQL */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Generated SQL</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(createTableSQL, "CREATE TABLE")}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Schema
              </Button>
              <Button variant="outline" size="sm" onClick={() => copyToClipboard(fullSQL, "Full SQL")}>
                <Copy className="w-3.5 h-3.5 mr-1" /> All
              </Button>
              <Button size="sm" onClick={downloadSQL}>
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <pre className="bg-secondary/50 border border-border rounded-lg p-4 text-xs font-mono text-foreground overflow-x-auto max-h-[400px]">
            {fullSQL}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
};

export default SchemaGenerator;
