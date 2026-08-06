import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wand2, 
  AlertTriangle, 
  RefreshCw,
  ArrowUpDown,
  Type,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";

interface CleaningSuggestion {
  id: string;
  column: string;
  issue: string;
  severity: "critical" | "warning" | "info";
  description: string;
  fix: string;
  affectedRows: number;
  action: () => Record<string, unknown>[];
}

interface DataCleaningSuggestionsProps {
  data: Record<string, unknown>[];
  columns: string[];
  onDataCleaned: (cleanedData: Record<string, unknown>[]) => void;
}

const DataCleaningSuggestions = ({ data, columns, onDataCleaned }: DataCleaningSuggestionsProps) => {
  const [appliedFixes, setAppliedFixes] = useState<Set<string>>(new Set());
  const [isApplyingAll, setIsApplyingAll] = useState(false);
  const [currentData, setCurrentData] = useState(data);

  const suggestions = useMemo(() => {
    const result: CleaningSuggestion[] = [];
    
    columns.forEach(col => {
      const values = currentData.map(row => row[col]);
      const nullCount = values.filter(v => v === null || v === undefined || v === "" || v === "null" || v === "NULL").length;
      const totalCount = values.length;
      
      // Missing values detection
      if (nullCount > 0) {
        const nullPercentage = (nullCount / totalCount) * 100;
        const numericValues = values.filter(v => typeof v === "number" && !isNaN(v)) as number[];
        const isNumeric = numericValues.length > totalCount * 0.5;
        
        if (isNumeric && numericValues.length > 0) {
          const median = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)];
          const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
          
          result.push({
            id: `missing-median-${col}`,
            column: col,
            issue: "Missing Values",
            severity: nullPercentage > 20 ? "critical" : nullPercentage > 5 ? "warning" : "info",
            description: `${nullCount} missing values (${nullPercentage.toFixed(1)}%)`,
            fix: `Fill with median (${median.toFixed(2)})`,
            affectedRows: nullCount,
            action: () => currentData.map(row => ({
              ...row,
              [col]: (row[col] === null || row[col] === undefined || row[col] === "" || row[col] === "null" || row[col] === "NULL") 
                ? median : row[col]
            }))
          });
          
          result.push({
            id: `missing-mean-${col}`,
            column: col,
            issue: "Missing Values",
            severity: nullPercentage > 20 ? "critical" : nullPercentage > 5 ? "warning" : "info",
            description: `${nullCount} missing values (${nullPercentage.toFixed(1)}%)`,
            fix: `Fill with mean (${mean.toFixed(2)})`,
            affectedRows: nullCount,
            action: () => currentData.map(row => ({
              ...row,
              [col]: (row[col] === null || row[col] === undefined || row[col] === "" || row[col] === "null" || row[col] === "NULL") 
                ? mean : row[col]
            }))
          });
        } else {
          // For non-numeric, offer mode or remove
          const valueCounts: Record<string, number> = {};
          values.forEach(v => {
            if (v !== null && v !== undefined && v !== "" && v !== "null" && v !== "NULL") {
              const key = String(v);
              valueCounts[key] = (valueCounts[key] || 0) + 1;
            }
          });
          const mode = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
          
          if (mode) {
            result.push({
              id: `missing-mode-${col}`,
              column: col,
              issue: "Missing Values",
              severity: nullPercentage > 20 ? "critical" : nullPercentage > 5 ? "warning" : "info",
              description: `${nullCount} missing values (${nullPercentage.toFixed(1)}%)`,
              fix: `Fill with mode ("${mode.substring(0, 20)}${mode.length > 20 ? '...' : ''}")`,
              affectedRows: nullCount,
              action: () => currentData.map(row => ({
                ...row,
                [col]: (row[col] === null || row[col] === undefined || row[col] === "" || row[col] === "null" || row[col] === "NULL") 
                  ? mode : row[col]
              }))
            });
          }
        }
        
        result.push({
          id: `missing-remove-${col}`,
          column: col,
          issue: "Missing Values",
          severity: nullPercentage > 20 ? "critical" : nullPercentage > 5 ? "warning" : "info",
          description: `${nullCount} missing values (${nullPercentage.toFixed(1)}%)`,
          fix: "Remove rows with missing values",
          affectedRows: nullCount,
          action: () => currentData.filter(row => 
            !(row[col] === null || row[col] === undefined || row[col] === "" || row[col] === "null" || row[col] === "NULL")
          )
        });
      }
      
      // Outlier detection for numeric columns
      const numericVals = values.filter(v => typeof v === "number" && !isNaN(v)) as number[];
      if (numericVals.length > 10) {
        const sorted = [...numericVals].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(sorted.length * 0.25)];
        const q3 = sorted[Math.floor(sorted.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outliers = numericVals.filter(v => v < lowerBound || v > upperBound);
        
        if (outliers.length > 0) {
          const median = sorted[Math.floor(sorted.length / 2)];
          
          result.push({
            id: `outlier-cap-${col}`,
            column: col,
            issue: "Outliers Detected",
            severity: outliers.length > totalCount * 0.1 ? "warning" : "info",
            description: `${outliers.length} outliers outside IQR bounds`,
            fix: `Cap to bounds (${lowerBound.toFixed(2)} - ${upperBound.toFixed(2)})`,
            affectedRows: outliers.length,
            action: () => currentData.map(row => {
              const val = row[col];
              if (typeof val === "number") {
                return {
                  ...row,
                  [col]: Math.max(lowerBound, Math.min(upperBound, val))
                };
              }
              return row;
            })
          });
          
          result.push({
            id: `outlier-median-${col}`,
            column: col,
            issue: "Outliers Detected",
            severity: outliers.length > totalCount * 0.1 ? "warning" : "info",
            description: `${outliers.length} outliers outside IQR bounds`,
            fix: `Replace with median (${median.toFixed(2)})`,
            affectedRows: outliers.length,
            action: () => currentData.map(row => {
              const val = row[col];
              if (typeof val === "number" && (val < lowerBound || val > upperBound)) {
                return { ...row, [col]: median };
              }
              return row;
            })
          });
          
          result.push({
            id: `outlier-remove-${col}`,
            column: col,
            issue: "Outliers Detected",
            severity: outliers.length > totalCount * 0.1 ? "warning" : "info",
            description: `${outliers.length} outliers outside IQR bounds`,
            fix: "Remove outlier rows",
            affectedRows: outliers.length,
            action: () => currentData.filter(row => {
              const val = row[col];
              if (typeof val === "number") {
                return val >= lowerBound && val <= upperBound;
              }
              return true;
            })
          });
        }
      }
      
      // Whitespace issues
      const stringValues = values.filter(v => typeof v === "string") as string[];
      const whitespaceIssues = stringValues.filter(v => v !== v.trim() || v.includes("  "));
      
      if (whitespaceIssues.length > 0) {
        result.push({
          id: `whitespace-${col}`,
          column: col,
          issue: "Whitespace Issues",
          severity: "info",
          description: `${whitespaceIssues.length} values with extra whitespace`,
          fix: "Trim and normalize whitespace",
          affectedRows: whitespaceIssues.length,
          action: () => currentData.map(row => {
            const val = row[col];
            if (typeof val === "string") {
              return { ...row, [col]: val.trim().replace(/\s+/g, " ") };
            }
            return row;
          })
        });
      }
      
      // Inconsistent casing
      const uniqueStrings = [...new Set(stringValues.map(v => v.toLowerCase()))];
      const casingIssues = uniqueStrings.filter(lower => {
        const variants = stringValues.filter(v => v.toLowerCase() === lower);
        return new Set(variants).size > 1;
      });
      
      if (casingIssues.length > 0) {
        result.push({
          id: `casing-title-${col}`,
          column: col,
          issue: "Inconsistent Casing",
          severity: "info",
          description: `${casingIssues.length} values with casing variations`,
          fix: "Convert to Title Case",
          affectedRows: stringValues.length,
          action: () => currentData.map(row => {
            const val = row[col];
            if (typeof val === "string") {
              return { 
                ...row, 
                [col]: val.toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) 
              };
            }
            return row;
          })
        });
        
        result.push({
          id: `casing-lower-${col}`,
          column: col,
          issue: "Inconsistent Casing",
          severity: "info",
          description: `${casingIssues.length} values with casing variations`,
          fix: "Convert to lowercase",
          affectedRows: stringValues.length,
          action: () => currentData.map(row => {
            const val = row[col];
            if (typeof val === "string") {
              return { ...row, [col]: val.toLowerCase() };
            }
            return row;
          })
        });
      }
      
      // Duplicate rows detection (only add once)
      if (col === columns[0]) {
        const seen = new Set();
        let duplicates = 0;
        currentData.forEach(row => {
          const key = JSON.stringify(row);
          if (seen.has(key)) {
            duplicates++;
          } else {
            seen.add(key);
          }
        });
        
        if (duplicates > 0) {
          result.push({
            id: "duplicates",
            column: "All Columns",
            issue: "Duplicate Rows",
            severity: duplicates > totalCount * 0.1 ? "warning" : "info",
            description: `${duplicates} duplicate rows detected`,
            fix: "Remove duplicate rows",
            affectedRows: duplicates,
            action: () => {
              const seen = new Set();
              return currentData.filter(row => {
                const key = JSON.stringify(row);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
            }
          });
        }
      }
    });
    
    return result;
  }, [currentData, columns]);

  const handleApplyFix = (suggestion: CleaningSuggestion) => {
    try {
      const cleanedData = suggestion.action();
      setCurrentData(cleanedData);
      onDataCleaned(cleanedData);
      setAppliedFixes(prev => new Set([...prev, suggestion.id]));
      toast.success(`Applied: ${suggestion.fix}`, {
        description: `${suggestion.affectedRows} rows affected`
      });
    } catch (error) {
      toast.error("Failed to apply fix");
      console.error(error);
    }
  };

  const handleApplyAllCritical = async () => {
    setIsApplyingAll(true);
    const criticalSuggestions = suggestions.filter(s => 
      s.severity === "critical" && !appliedFixes.has(s.id)
    );
    
    // Group by column to apply one fix per column
    const fixedColumns = new Set<string>();
    let appliedCount = 0;
    
    for (const suggestion of criticalSuggestions) {
      if (!fixedColumns.has(suggestion.column)) {
        try {
          const cleanedData = suggestion.action();
          setCurrentData(cleanedData);
          onDataCleaned(cleanedData);
          setAppliedFixes(prev => new Set([...prev, suggestion.id]));
          fixedColumns.add(suggestion.column);
          appliedCount++;
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(error);
        }
      }
    }
    
    setIsApplyingAll(false);
    if (appliedCount > 0) {
      toast.success(`Applied ${appliedCount} critical fixes`);
    } else {
      toast.info("No critical fixes to apply");
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-destructive/20 text-destructive border-destructive/30";
      case "warning": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      default: return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  const getIssueIcon = (issue: string) => {
    switch (issue) {
      case "Missing Values": return <XCircle className="w-4 h-4" />;
      case "Outliers Detected": return <ArrowUpDown className="w-4 h-4" />;
      case "Whitespace Issues": return <Type className="w-4 h-4" />;
      case "Inconsistent Casing": return <Type className="w-4 h-4" />;
      case "Duplicate Rows": return <RefreshCw className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
    }
  };

  const criticalCount = suggestions.filter(s => s.severity === "critical" && !appliedFixes.has(s.id)).length;
  const warningCount = suggestions.filter(s => s.severity === "warning" && !appliedFixes.has(s.id)).length;

  // Group suggestions by column and issue type
  const groupedSuggestions = useMemo(() => {
    const groups: Record<string, CleaningSuggestion[]> = {};
    suggestions.forEach(s => {
      const key = `${s.column}-${s.issue}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(s);
    });
    return groups;
  }, [suggestions]);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/20">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold">Auto-Cleaning Suggestions</h4>
            <p className="text-sm text-muted-foreground">
              {suggestions.length} suggestions • {appliedFixes.size} applied
            </p>
          </div>
        </div>
        
        {criticalCount > 0 && (
          <Button 
            onClick={handleApplyAllCritical}
            disabled={isApplyingAll}
            className="gap-2"
            variant="destructive"
          >
            {isApplyingAll ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4" />
            )}
            Fix All Critical ({criticalCount})
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <div className="text-xs text-destructive/80">Critical Issues</div>
          </CardContent>
        </Card>
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-yellow-400">{warningCount}</div>
            <div className="text-xs text-yellow-400/80">Warnings</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-green-400">{appliedFixes.size}</div>
            <div className="text-xs text-green-400/80">Fixes Applied</div>
          </CardContent>
        </Card>
      </div>

      {/* Suggestions List */}
      <ScrollArea className="h-[400px]">
        <div className="space-y-4 pr-4">
          {Object.entries(groupedSuggestions).map(([key, group]) => (
            <Card key={key} className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getIssueIcon(group[0].issue)}
                    <CardTitle className="text-sm font-medium">
                      {group[0].column}: {group[0].issue}
                    </CardTitle>
                  </div>
                  <Badge className={getSeverityColor(group[0].severity)}>
                    {group[0].severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{group[0].description}</p>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2">
                  {group.map(suggestion => (
                    <Button
                      key={suggestion.id}
                      size="sm"
                      variant={appliedFixes.has(suggestion.id) ? "secondary" : "outline"}
                      onClick={() => handleApplyFix(suggestion)}
                      disabled={appliedFixes.has(suggestion.id)}
                      className="gap-1.5 text-xs h-7"
                    >
                      {appliedFixes.has(suggestion.id) ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <Wand2 className="w-3 h-3" />
                      )}
                      {suggestion.fix}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
          
          {suggestions.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
              <p className="font-medium">No issues detected!</p>
              <p className="text-sm">Your data looks clean and ready to use.</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DataCleaningSuggestions;
