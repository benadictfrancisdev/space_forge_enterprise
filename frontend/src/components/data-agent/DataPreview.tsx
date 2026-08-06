import { useState } from "react";
import { backend } from "@/platform";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, CheckCircle, AlertTriangle, Loader2, Download, FileDown, Table as TableIcon } from "lucide-react";
import { toast } from "sonner";
import { usePdfExport } from "@/hooks/usePdfExport";
import VirtualTable from "./VirtualTable";
import { TableSkeleton } from "./skeletons";
import type { DatasetState } from "@/pages/DataAgent";

interface DataPreviewProps {
  dataset: DatasetState;
  onDataCleaned: (cleanedData: Record<string, unknown>[]) => void;
}

interface ValidationReport {
  isValid: boolean;
  validationReport: { 
    errors: Array<string | { column?: string; message?: string }>; 
    warnings: Array<string | { column?: string; message?: string }>; 
    suggestions: Array<string | { column?: string; message?: string }>; 
  };
  columnStats?: Record<string, { type: string; nullCount: number; uniqueCount: number; issues: string[] }>;
}

interface CleaningReport {
  issuesFound: Array<string | { column?: string; message?: string }>;
  actionsTaken: Array<string | { column?: string; message?: string }>;
  rowsAffected: number;
}

// Helper function to safely render report items
const renderReportItem = (item: string | { column?: string; message?: string } | unknown): string => {
  if (typeof item === 'string') return item;
  if (typeof item === 'object' && item !== null) {
    const obj = item as { column?: string; message?: string };
    if (obj.column && obj.message) return `${obj.column}: ${obj.message}`;
    if (obj.message) return obj.message;
    return JSON.stringify(item);
  }
  return String(item);
};

const DataPreview = ({ dataset, onDataCleaned }: DataPreviewProps) => {
  const [isValidating, setIsValidating] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showVirtualTable, setShowVirtualTable] = useState(false);
  const [validationReport, setValidationReport] = useState<ValidationReport | null>(null);
  const [cleaningReport, setCleaningReport] = useState<CleaningReport | null>(null);
  const { exportToCsv, exportToPdf } = usePdfExport();

  const displayData = dataset.cleanedData || dataset.rawData;
  const isLargeDataset = displayData.length > 1000;

  const handleExportCsv = () => {
    exportToCsv(displayData, dataset.name);
  };

  const handleExportPdf = () => {
    exportToPdf({
      title: `Data Preview Report - ${dataset.name}`,
      subtitle: `${displayData.length} records, ${dataset.columns.length} columns`,
      datasetName: dataset.name,
      statistics: {
        "Total Records": displayData.length,
        "Columns": dataset.columns.length,
        "Status": dataset.status,
      },
      sections: [
        {
          title: "Column Overview",
          type: "list",
          content: dataset.columns.map(col => `${col}`)
        },
        {
          title: "Sample Data",
          type: "table",
          content: "",
          tableData: {
            headers: dataset.columns.slice(0, 6),
            rows: displayData.slice(0, 10).map(row => 
              dataset.columns.slice(0, 6).map(col => String(row[col] ?? ""))
            )
          }
        }
      ]
    });
  };

  const handleValidate = async () => {
    setIsValidating(true);
    try {
      const { data, error } = await backend.functions.invoke('data-agent', {
        body: { 
          action: 'validate', 
          data: dataset.rawData.slice(0, 100),
          datasetName: dataset.name 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");
      
      // Normalize the validation report data
      const normalizedReport: ValidationReport = {
        isValid: data.isValid ?? false,
        validationReport: {
          errors: Array.isArray(data.validationReport?.errors) ? data.validationReport.errors : [],
          warnings: Array.isArray(data.validationReport?.warnings) ? data.validationReport.warnings : [],
          suggestions: Array.isArray(data.validationReport?.suggestions) ? data.validationReport.suggestions : []
        },
        columnStats: data.columnStats
      };
      
      setValidationReport(normalizedReport);
      toast.success("Validation complete!");
    } catch (error) {
      console.error("Validation error:", error);
      toast.error(error instanceof Error ? error.message : "Validation failed");
    } finally {
      setIsValidating(false);
    }
  };

  const handleClean = async () => {
    setIsCleaning(true);
    try {
      const { data, error } = await backend.functions.invoke('data-agent', {
        body: { 
          action: 'clean', 
          data: dataset.rawData.slice(0, 500),
          datasetName: dataset.name 
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");
      
      if (data.cleanedData) {
        onDataCleaned(data.cleanedData);
        
        // Normalize cleaning report
        const normalizedCleaningReport: CleaningReport = {
          issuesFound: Array.isArray(data.cleaningReport?.issuesFound) ? data.cleaningReport.issuesFound : [],
          actionsTaken: Array.isArray(data.cleaningReport?.actionsTaken || data.cleaningReport?.actionsToken) 
            ? (data.cleaningReport?.actionsTaken || data.cleaningReport?.actionsToken) 
            : [],
          rowsAffected: data.cleaningReport?.rowsAffected ?? 0
        };
        
        setCleaningReport(normalizedCleaningReport);
        toast.success("Data cleaned successfully!");
      } else {
        toast.warning("Cleaning completed but no cleaned data returned");
      }
    } catch (error) {
      console.error("Cleaning error:", error);
      toast.error(error instanceof Error ? error.message : "Cleaning failed");
    } finally {
      setIsCleaning(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col gap-3 bg-card/50 rounded-xl p-3 sm:p-4 border border-border/50">
        <div>
          <h3 className="font-semibold text-base sm:text-lg">{dataset.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {dataset.rawData.length.toLocaleString()} rows â€¢ {dataset.columns.length} columns
          </p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportCsv}
            className="gap-2 text-xs sm:text-sm"
          >
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportPdf}
            className="gap-2 text-xs sm:text-sm"
          >
            <FileDown className="w-4 h-4" />
            PDF
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleValidate}
            disabled={isValidating || isCleaning}
            className="text-xs sm:text-sm"
          >
            {isValidating ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-1.5" />
            )}
            Validate
          </Button>
          <Button 
            size="sm"
            onClick={handleClean}
            disabled={isValidating || isCleaning}
            className="bg-gradient-to-r from-primary to-accent hover:opacity-90 text-xs sm:text-sm"
          >
            {isCleaning ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4 mr-1.5" />
            )}
            AI Clean
          </Button>
        </div>
      </div>

      {/* Validation Report */}
      {validationReport && (
        <div className="bg-card/50 rounded-xl p-4 border border-border/50 space-y-3">
          <div className="flex items-center gap-2">
            {validationReport.isValid ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" /> Valid
              </Badge>
            ) : (
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                <AlertTriangle className="w-3 h-3 mr-1" /> Issues Found
              </Badge>
            )}
          </div>
          
          {validationReport.validationReport.errors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-destructive mb-1">Errors:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {validationReport.validationReport.errors.map((e, i) => (
                  <li key={i}>{renderReportItem(e)}</li>
                ))}
              </ul>
            </div>
          )}
          
          {validationReport.validationReport.warnings.length > 0 && (
            <div>
              <p className="text-sm font-medium text-yellow-400 mb-1">Warnings:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {validationReport.validationReport.warnings.map((w, i) => (
                  <li key={i}>{renderReportItem(w)}</li>
                ))}
              </ul>
            </div>
          )}

          {validationReport.validationReport.suggestions.length > 0 && (
            <div>
              <p className="text-sm font-medium text-primary mb-1">Suggestions:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {validationReport.validationReport.suggestions.map((s, i) => (
                  <li key={i}>{renderReportItem(s)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Cleaning Report */}
      {cleaningReport && (
        <div className="bg-card/50 rounded-xl p-4 border border-primary/30 space-y-3">
          <div className="flex items-center gap-2">
            <Badge className="bg-primary/20 text-primary border-primary/30">
              <Sparkles className="w-3 h-3 mr-1" /> Cleaned
            </Badge>
            <span className="text-sm text-muted-foreground">
              {cleaningReport.rowsAffected} rows affected
            </span>
          </div>
          
          {cleaningReport.issuesFound.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Issues Found:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {cleaningReport.issuesFound.map((item, idx) => (
                  <li key={idx}>{renderReportItem(item)}</li>
                ))}
              </ul>
            </div>
          )}

          {cleaningReport.actionsTaken.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Actions Taken:</p>
              <ul className="text-sm text-muted-foreground list-disc list-inside">
                {cleaningReport.actionsTaken.map((item, idx) => (
                  <li key={idx}>{renderReportItem(item)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <TableSkeleton rows={8} columns={Math.min(dataset.columns.length, 6)} />
      ) : showVirtualTable || isLargeDataset ? (
        <VirtualTable 
          data={displayData}
          columns={dataset.columns}
          height={500}
        />
      ) : (
        <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
          <div className="p-3 border-b border-border/30 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {Math.min(10, displayData.length)} of {displayData.length.toLocaleString()} rows
            </span>
            {displayData.length > 10 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowVirtualTable(true)}
                className="gap-2"
              >
                <TableIcon className="w-4 h-4" />
                Show All Rows
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border/50 bg-muted/30">
                <tr>
                  {dataset.columns.map((col) => (
                    <th key={col} className="text-left px-4 py-3 text-sm font-semibold text-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayData.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-b border-border/30 hover:bg-muted/30">
                    {dataset.columns.map((col) => (
                      <td key={col} className="px-4 py-2 text-sm whitespace-nowrap">
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataPreview;
