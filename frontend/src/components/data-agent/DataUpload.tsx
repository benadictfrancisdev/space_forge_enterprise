import { useState, useCallback } from "react";
import { Upload, FileSpreadsheet, AlertCircle, Database, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { SAMPLE_DATASETS, getSampleDataset } from "@/data/sampleDatasets";
import type { DatasetState } from "@/pages/DataAgent";

import { parseCSVStreaming, type ParseProgress } from "@/lib/streamingParser";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { profileDataset, mergeDatasets, type NormalizedDataset } from "@/lib/schemaNormalizer";
import { parsePdfFile } from "@/lib/pdfParser";
import * as XLSX from "xlsx";
import { isApiConfigured, platform } from "@/platform";

interface DataUploadProps {
  onDataLoaded: (data: DatasetState) => void;
}

interface SavedDatasetResponse {
  id: string;
  name: string;
  status: string;
}

const DataUpload = ({ onDataLoaded }: DataUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingSample, setLoadingSample] = useState<string | null>(null);
  const [progress, setProgress] = useState<ParseProgress | null>(null);
  const { user } = useAuth();

  const parseJSON = (text: string): Record<string, unknown>[] => {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [parsed];
  };

  const parseExcelAllSheets = async (file: File): Promise<{ rows: Record<string, unknown>[]; columns: string[]; sheetNames: string[] }> => {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const allRows: Record<string, unknown>[] = [];
    const colSet = new Set<string>();
    for (const name of workbook.SheetNames) {
      const ws = workbook.Sheets[name];
      const sheetRows = XLSX.utils.sheet_to_json(ws) as Record<string, unknown>[];
      for (const r of sheetRows) {
        Object.keys(r).forEach(k => colSet.add(k));
        allRows.push({ ...r, __sheet: name });
      }
    }
    if (workbook.SheetNames.length > 1) colSet.add("__sheet");
    return { rows: allRows, columns: Array.from(colSet), sheetNames: workbook.SheetNames };
  };

  const parseExcel = async (file: File): Promise<Record<string, unknown>[]> => {
    const { rows } = await parseExcelAllSheets(file);
    return rows;
  };

  const MAX_FILE_SIZE_MB = 500;

  const saveDataset = async (
    payload: {
      name: string;
      original_filename: string;
      raw_data: Record<string, unknown>[];
      columns: string[];
      row_count: number;
      column_count: number;
      file_size: number;
      status?: string;
    },
    file?: File
  ) => {
    // Track 2.5 — Django production flow when API is configured
    if (isApiConfigured()) {
      if (file) {
        const result = await platform.api.uploadAndRegisterDataset(file, payload.name);
        if (result.error || !result.data) {
          throw new Error(result.error?.message || "Failed to save dataset to backend");
        }
        return {
          id: result.data.dataset.id,
          name: result.data.dataset.name,
          status: result.data.dataset.status,
        };
      }
      const created = await platform.api.createDataset({
        name: payload.name,
        description: `rows=${payload.row_count} cols=${payload.column_count}`,
      });
      if (created.error || !created.data) {
        throw new Error(created.error?.message || "Failed to create dataset metadata");
      }
      return {
        id: created.data.id,
        name: created.data.name,
        status: created.data.status,
      };
    }

    const { data, error } = await invokeEdgeFunction<{
      success: boolean;
      data?: SavedDatasetResponse;
      error?: string;
      step?: string;
    }>("save-dataset", payload);

    if (error) {
      throw new Error(error.message || "Failed to save dataset");
    }

    if (!data?.success) {
      const errMsg = data?.error || "Failed to save dataset";
      const step = data?.step || "unknown";
      console.error(`[DataUpload] Save failed at step=${step}: ${errMsg}`);
      throw new Error(errMsg);
    }

    if (!data.data?.id) {
      throw new Error("Dataset save did not return an id");
    }

    return data.data;
  };

  const processFile = async (file: File) => {
    if (!user) {
      toast.error("Please sign in to upload data");
      return;
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast.error(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is ${MAX_FILE_SIZE_MB} MB.`);
      return;
    }

    setIsLoading(true);
    setProgress({ rowsParsed: 0, phase: "parsing", percent: 0 });

    try {
      const fileName = file.name.toLowerCase();
      let data: Record<string, unknown>[];
      let columns: string[];
      let totalRows: number;

      if (fileName.endsWith('.csv')) {
        // ── Streaming parser for CSV (handles 300k+ rows) ──
        const result = await parseCSVStreaming(file, (p) => setProgress(p));
        data = result.sampledData; // Only sampled rows kept in memory
        columns = result.columns;
        totalRows = result.totalRows;
      } else if (fileName.endsWith('.json')) {
        setProgress({ rowsParsed: 0, phase: "parsing", percent: 50 });
        const text = await file.text();
        data = parseJSON(text);
        columns = data.length > 0 ? Object.keys(data[0]) : [];
        totalRows = data.length;
        // For large JSON, sample down
        if (data.length > 2000) {
          const sampled: Record<string, unknown>[] = [];
          const step = Math.floor(data.length / 2000);
          for (let i = 0; i < data.length; i += step) sampled.push(data[i]);
          data = sampled.slice(0, 2000);
        }
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        setProgress({ rowsParsed: 0, phase: "parsing", percent: 30 });
        const fullData = await parseExcel(file);
        columns = fullData.length > 0 ? Object.keys(fullData[0]) : [];
        totalRows = fullData.length;
        // Sample for large Excel files
        if (fullData.length > 2000) {
          const sampled: Record<string, unknown>[] = [];
          const step = Math.floor(fullData.length / 2000);
          for (let i = 0; i < fullData.length; i += step) sampled.push(fullData[i]);
          data = sampled.slice(0, 2000);
        } else {
          data = fullData;
        }
      } else if (fileName.endsWith('.pdf')) {
        setProgress({ rowsParsed: 0, phase: "parsing", percent: 10 });
        const result = await parsePdfFile(file, (pct) =>
          setProgress({ rowsParsed: 0, phase: "parsing", percent: Math.min(85, pct) })
        );
        data = result.rows.length > 2000 ? result.rows.slice(0, 2000) : result.rows;
        columns = result.columns;
        totalRows = result.totalRows;
      } else {
        throw new Error("Unsupported file format. Please upload CSV, Excel, JSON, or PDF files.");
      }

      if (totalRows === 0) {
        throw new Error("No data found in file");
      }

      const datasetName = file.name.replace(/\.(csv|json|xlsx|xls)$/i, '');

      // ── Save to database (sampled data only for large files) ──
      setProgress({ rowsParsed: totalRows, phase: "saving", percent: 90 });
      const savedDataset = await saveDataset({
        name: datasetName,
        original_filename: file.name,
        raw_data: JSON.parse(JSON.stringify(data)),
        columns: JSON.parse(JSON.stringify(columns)),
        row_count: totalRows,
        column_count: columns.length,
        file_size: file.size,
        status: 'uploaded',
      }, file);

      setProgress({ rowsParsed: totalRows, phase: "done", percent: 100 });

      onDataLoaded({
        id: savedDataset.id,
        name: datasetName,
        rawData: data,
        columns,
        status: "uploaded"
      });

      if (isApiConfigured() && savedDataset.id) {
        toast.success(`Loaded ${totalRows.toLocaleString()} rows — saved to platform`, {
          description: "Running intelligence pipeline…",
        });
        try {
          const { platformClient } = await import("@/platform/track13/platformClient");
          const { job } = await platformClient.prepareDataset(savedDataset.id);
          const finished = await platformClient.pollJob(job.id);
          if (finished.status === "succeeded") {
            toast.success("Pipeline complete — open Executive Suite", {
              action: {
                label: "Open Suite",
                onClick: () => {
                  window.location.href = `/apps/executive?dataset=${savedDataset.id}`;
                },
              },
            });
          } else {
            toast.warning("Dataset saved — run pipeline from Executive Insights", {
              action: {
                label: "Open Suite",
                onClick: () => {
                  window.location.href = `/apps/executive?dataset=${savedDataset.id}`;
                },
              },
            });
          }
        } catch {
          toast.warning("Dataset saved — run pipeline from Executive Insights", {
            action: {
              label: "Open Suite",
              onClick: () => {
                window.location.href = `/apps/executive?dataset=${savedDataset.id}`;
              },
            },
          });
        }
      } else {
        toast.success(`Loaded ${totalRows.toLocaleString()} rows from ${file.name}${totalRows > 2000 ? " (sampled for display)" : ""}`);
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(null), 2000);
    }
  };

  // ── Multi-file: parse each, normalize schema, merge into one dataset ──
  const processMultipleFiles = async (files: File[]) => {
    if (!user) { toast.error("Please sign in to upload data"); return; }
    setIsLoading(true);
    setProgress({ rowsParsed: 0, phase: "parsing", percent: 5 });
    try {
      const parsed: NormalizedDataset[] = [];
      let totalSize = 0;
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        totalSize += f.size;
        const fn = f.name.toLowerCase();
        let rows: Record<string, unknown>[] = [];
        let cols: string[] = [];
        if (fn.endsWith(".csv")) {
          const r = await parseCSVStreaming(f, (p) =>
            setProgress({ ...p, percent: Math.min(80, ((i + p.percent / 100) / files.length) * 80) })
          );
          rows = r.sampledData; cols = r.columns;
        } else if (fn.endsWith(".xlsx") || fn.endsWith(".xls")) {
          const x = await parseExcelAllSheets(f);
          rows = x.rows; cols = x.columns;
        } else if (fn.endsWith(".json")) {
          const data = parseJSON(await f.text());
          rows = data; cols = data.length ? Object.keys(data[0]) : [];
        } else if (fn.endsWith(".pdf")) {
          const r = await parsePdfFile(f);
          rows = r.rows; cols = r.columns;
        } else {
          toast.warning(`Skipping unsupported: ${f.name}`);
          continue;
        }
        if (rows.length === 0) continue;
        parsed.push(profileDataset(rows, cols, f.name));
      }
      if (parsed.length === 0) throw new Error("No usable rows found in selected files");

      const merged = mergeDatasets(parsed);
      const datasetName = parsed.length === 1
        ? files[0].name.replace(/\.(csv|json|xlsx|xls)$/i, "")
        : `Merged · ${parsed.length} files`;

      // Sample for save
      const sample = merged.rows.length > 2000
        ? Array.from({ length: 2000 }, (_, i) =>
            merged.rows[Math.floor((i / 2000) * merged.rows.length)])
        : merged.rows;

      setProgress({ rowsParsed: merged.rows.length, phase: "saving", percent: 90 });
      const saved = await saveDataset({
        name: datasetName,
        original_filename: files.map(f => f.name).join(" + "),
        raw_data: JSON.parse(JSON.stringify(sample)),
        columns: JSON.parse(JSON.stringify(merged.columns)),
        row_count: merged.rows.length,
        column_count: merged.columns.length,
        file_size: totalSize,
        status: "uploaded",
      }, files[0]);
      setProgress({ rowsParsed: merged.rows.length, phase: "done", percent: 100 });
      onDataLoaded({
        id: saved.id,
        name: datasetName,
        rawData: sample,
        columns: merged.columns,
        status: "uploaded",
      });
      toast.success(
        `Loaded ${merged.rows.length.toLocaleString()} rows from ${files.length} file${files.length > 1 ? "s" : ""}`,
        { description: `Domain detected: ${merged.domain}` }
      );
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Failed to process files");
    } finally {
      setIsLoading(false);
      setTimeout(() => setProgress(null), 2000);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 1) processMultipleFiles(files);
    else if (files[0]) processFile(files[0]);
  }, [user]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 1) processMultipleFiles(files);
    else if (files[0]) processFile(files[0]);
  };

  const handleLoadSampleData = async (sampleId: string) => {
    const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";
    if (!user && !isDemoMode) {
      toast.error("Please sign in to load sample data");
      return;
    }

    setLoadingSample(sampleId);
    try {
      const sample = getSampleDataset(sampleId);
      if (!sample) throw new Error("Sample dataset not found");

      if (isDemoMode) {
        onDataLoaded({
          id: `demo-${sampleId}`,
          name: sample.name,
          rawData: sample.data,
          columns: sample.columns,
          status: "uploaded"
        });
        toast.success(`Loaded ${sample.data.length.toLocaleString()} rows from ${sample.name} (Demo Mode)`);
        return;
      }

      const savedDataset = await saveDataset({
        name: sample.name,
        original_filename: `${sample.id}-sample.json`,
        raw_data: JSON.parse(JSON.stringify(sample.data)),
        columns: JSON.parse(JSON.stringify(sample.columns)),
        row_count: sample.data.length,
        column_count: sample.columns.length,
        file_size: JSON.stringify(sample.data).length,
        status: 'uploaded',
      });

      onDataLoaded({
        id: savedDataset.id,
        name: sample.name,
        rawData: sample.data,
        columns: sample.columns,
        status: "uploaded"
      });

      toast.success(`Loaded ${sample.data.length.toLocaleString()} rows from ${sample.name}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load sample data");
    } finally {
      setLoadingSample(null);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Drop Zone */}
      <div
        data-onboarding="upload-zone"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 sm:p-12
          transition-all duration-300 cursor-pointer
          ${isDragging
            ? 'border-primary bg-primary/10 scale-[1.02]'
            : 'border-border/50 bg-card/30 hover:border-primary/50 hover:bg-card/50'
          }
        `}
      >
        <input
          type="file"
          accept=".csv,.json,.xlsx,.xls,.pdf"
          multiple
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center text-center space-y-3 sm:space-y-4">
          <div className={`
            w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl flex items-center justify-center
            ${isDragging ? 'bg-primary text-primary-foreground' : 'bg-muted'}
            transition-colors duration-300
          `}>
            {isLoading ? (
              <div className="w-6 h-6 sm:w-8 sm:h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              <Upload className="w-6 h-6 sm:w-8 sm:h-8" />
            )}
          </div>

          <div>
            <h3 className="text-lg sm:text-xl font-semibold mb-1 sm:mb-2">
              {isDragging ? "Drop your file here" : "Upload your data"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Drag & drop your file, or tap to browse
            </p>
          </div>

          {/* Progress indicator for large files */}
          {progress && isLoading && (
            <div className="w-full max-w-xs space-y-2">
              <Progress value={progress.percent} className="h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {progress.phase === "parsing" && `Parsing... ${progress.rowsParsed.toLocaleString()} rows`}
                {progress.phase === "computing" && "Computing statistics..."}
                {progress.phase === "saving" && "Saving to database..."}
                {progress.phase === "done" && `Done — ${progress.rowsParsed.toLocaleString()} rows`}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <FileSpreadsheet className="w-4 h-4" />
            <span>Drop one or many · CSV, Excel (all sheets), JSON, PDF · auto-merged</span>
          </div>
        </div>
      </div>

      {/* Sample Datasets */}
      <div data-onboarding="sample-button" className="bg-card/50 border border-border/50 rounded-xl p-4 sm:p-6">
        <div className="flex items-start gap-3 mb-4">
          <Database className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <h4 className="font-medium mb-1 text-sm sm:text-base">Try Sample Datasets</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              No data ready? Load a sample dataset to explore features.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
          {SAMPLE_DATASETS.map((sample) => (
            <Button
              key={sample.id}
              variant="outline"
              className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4"
              onClick={() => handleLoadSampleData(sample.id)}
              disabled={loadingSample !== null}
            >
              <div className="flex items-center gap-2 sm:gap-3 w-full">
                {loadingSample === sample.id ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary shrink-0" />
                )}
                <div className="text-left flex-1 min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{sample.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground">{sample.rowCount.toLocaleString()} rows</p>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {/* Tips */}
      <div className="bg-card/50 border border-border/50 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
          <div>
            <h4 className="font-medium mb-1">Tips for best results</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Ensure your CSV has headers in the first row</li>
              <li>• Excel files: First sheet will be imported</li>
              <li>• JSON should be an array of objects with consistent keys</li>
              <li>• Large files (300K+ rows) are streamed &amp; sampled automatically</li>
              <li>• Your data is saved securely and linked to your account</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
