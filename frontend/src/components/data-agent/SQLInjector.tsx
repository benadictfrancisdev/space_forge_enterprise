import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Database, Copy } from "lucide-react";
import { toast } from "sonner";

interface SQLInjectorProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

const SQLInjector = ({ data, columns, columnTypes, datasetName }: SQLInjectorProps) => {
  const tableName = useMemo(() =>
    datasetName.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase(),
    [datasetName]
  );

  const inferSqlType = (col: string): string => {
    const type = columnTypes[col];
    if (type === "numeric") return "NUMERIC";
    if (type === "date") return "TIMESTAMP";
    const samples = data.slice(0, 20).map((r) => String(r[col] || ""));
    const maxLen = Math.max(...samples.map((s) => s.length), 1);
    return maxLen > 255 ? "TEXT" : `VARCHAR(${Math.min(maxLen * 2, 255)})`;
  };

  const createTableSQL = useMemo(() => {
    const cols = columns.map((col) => {
      const sqlType = inferSqlType(col);
      const colName = col.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
      return `  ${colName} ${sqlType}`;
    });
    return `CREATE TABLE ${tableName} (\n  id SERIAL PRIMARY KEY,\n${cols.join(",\n")}\n);`;
  }, [columns, columnTypes, tableName, data]);

  const insertSQL = useMemo(() => {
    const colNames = columns.map((c) => c.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase());
    const rows = data.slice(0, 5).map((row) => {
      const vals = columns.map((col) => {
        const v = row[col];
        if (v === null || v === undefined) return "NULL";
        if (columnTypes[col] === "numeric" && !isNaN(Number(v))) return String(v);
        return `'${String(v).replace(/'/g, "''")}'`;
      });
      return `  (${vals.join(", ")})`;
    });
    return `INSERT INTO ${tableName} (${colNames.join(", ")})\nVALUES\n${rows.join(",\n")};\n\n-- ... ${data.length} total rows`;
  }, [columns, data, columnTypes, tableName]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="space-y-4">
      <Card className="border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-primary" />
              <CardTitle className="text-base">SQL Forge</CardTitle>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {data.length} rows • {columns.length} cols
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* CREATE TABLE */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">CREATE TABLE</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(createTableSQL)}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
            </div>
            <pre className="bg-secondary/50 border border-border rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto">
              {createTableSQL}
            </pre>
          </div>

          {/* INSERT sample */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">INSERT (sample)</span>
              <Button variant="ghost" size="sm" onClick={() => copyToClipboard(insertSQL)}>
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy
              </Button>
            </div>
            <pre className="bg-secondary/50 border border-border rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto max-h-48">
              {insertSQL}
            </pre>
          </div>

          {/* Column Mapping */}
          <div>
            <span className="text-xs font-semibold text-foreground mb-2 block">Column Mapping</span>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs py-2">Column</TableHead>
                    <TableHead className="text-xs py-2">Type</TableHead>
                    <TableHead className="text-xs py-2">SQL Type</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columns.slice(0, 15).map((col) => (
                    <TableRow key={col}>
                      <TableCell className="text-xs py-1.5 font-mono">{col}</TableCell>
                      <TableCell className="text-xs py-1.5">
                        <Badge variant="outline" className="text-[10px]">
                          {columnTypes[col] || "text"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs py-1.5 font-mono text-muted-foreground">
                        {inferSqlType(col)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {columns.length > 15 && (
                    <TableRow>
                      <TableCell colSpan={3} className="text-xs text-center text-muted-foreground py-2">
                        +{columns.length - 15} more columns
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SQLInjector;
