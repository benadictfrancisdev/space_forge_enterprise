import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import {
  Link2,
  Table,
  Plus,
  Trash2,
  Play,
  ArrowRight,
  Check,
  Database,
  Upload,
  Loader2,
  Sparkles,
  Download,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DatasetState } from "@/pages/DataAgent";

interface JoinConfig {
  id: string;
  leftDataset: string;
  rightDataset: string;
  leftColumn: string;
  rightColumn: string;
  joinType: "inner" | "left" | "right" | "full";
}

interface MultiSourceJoinerProps {
  primaryDataset: DatasetState;
  onJoinComplete: (joinedData: Record<string, unknown>[], columns: string[]) => void;
}

const JOIN_TYPES = [
  { value: "inner", label: "Inner Join", description: "Only matching rows from both" },
  { value: "left", label: "Left Join", description: "All from left, matching from right" },
  { value: "right", label: "Right Join", description: "All from right, matching from left" },
  { value: "full", label: "Full Outer", description: "All rows from both datasets" },
];

const MultiSourceJoiner = ({ primaryDataset, onJoinComplete }: MultiSourceJoinerProps) => {
  const [secondaryDatasets, setSecondaryDatasets] = useState<DatasetState[]>([]);
  const [joinConfigs, setJoinConfigs] = useState<JoinConfig[]>([]);
  const [isJoining, setIsJoining] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, unknown>[] | null>(null);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingIndex(index);
    
    try {
      const text = await file.text();
      const lines = text.trim().split("\n");
      const headers = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));
      
      const data = lines.slice(1).map(line => {
        const values = line.split(",").map(v => v.trim().replace(/"/g, ""));
        const row: Record<string, unknown> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ""; });
        return row;
      });

      const newDataset: DatasetState = {
        name: file.name.replace(/\.[^.]+$/, ""),
        rawData: data,
        columns: headers,
        status: "uploaded",
      };

      setSecondaryDatasets(prev => {
        const updated = [...prev];
        updated[index] = newDataset;
        return updated;
      });

      toast.success(`Loaded ${data.length} rows from ${file.name}`);
    } catch (err) {
      toast.error("Failed to parse file");
      console.error(err);
    } finally {
      setUploadingIndex(null);
    }
  }, []);

  const addSecondaryDataset = () => {
    setSecondaryDatasets(prev => [...prev, { name: "", rawData: [], columns: [], status: "pending" }]);
  };

  const removeSecondaryDataset = (index: number) => {
    setSecondaryDatasets(prev => prev.filter((_, i) => i !== index));
    setJoinConfigs(prev => prev.filter(j => 
      j.rightDataset !== `secondary_${index}`
    ));
  };

  const addJoinConfig = () => {
    if (secondaryDatasets.length === 0 || !secondaryDatasets[0]?.columns?.length) {
      toast.error("Upload a secondary dataset first");
      return;
    }

    const newConfig: JoinConfig = {
      id: crypto.randomUUID(),
      leftDataset: "primary",
      rightDataset: "secondary_0",
      leftColumn: primaryDataset.columns[0] || "",
      rightColumn: secondaryDatasets[0]?.columns[0] || "",
      joinType: "inner",
    };
    setJoinConfigs(prev => [...prev, newConfig]);
  };

  const updateJoinConfig = (id: string, updates: Partial<JoinConfig>) => {
    setJoinConfigs(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
  };

  const removeJoinConfig = (id: string) => {
    setJoinConfigs(prev => prev.filter(j => j.id !== id));
  };

  const getDatasetByRef = (ref: string): DatasetState | null => {
    if (ref === "primary") return primaryDataset;
    const match = ref.match(/secondary_(\d+)/);
    if (match) return secondaryDatasets[parseInt(match[1])] || null;
    return null;
  };

  const executeJoin = async () => {
    if (joinConfigs.length === 0) {
      toast.error("Configure at least one join");
      return;
    }

    setIsJoining(true);
    
    try {
      // Start with primary dataset
      let resultData = [...primaryDataset.rawData];
      let resultColumns = [...primaryDataset.columns];

      for (const config of joinConfigs) {
        const rightDs = getDatasetByRef(config.rightDataset);
        if (!rightDs || !rightDs.rawData.length) continue;

        const leftKey = config.leftColumn;
        const rightKey = config.rightColumn;
        const joinType = config.joinType;

        // Add prefixes to right columns to avoid conflicts
        const rightColsRenamed = rightDs.columns
          .filter(c => c !== rightKey)
          .map(c => `${rightDs.name}_${c}`);

        // Build lookup from right dataset
        const rightLookup = new Map<string, Record<string, unknown>>();
        for (const row of rightDs.rawData) {
          const key = String(row[rightKey] ?? "");
          if (key) rightLookup.set(key, row);
        }

        const newResult: Record<string, unknown>[] = [];

        if (joinType === "inner" || joinType === "left") {
          for (const leftRow of resultData) {
            const key = String(leftRow[leftKey] ?? "");
            const rightRow = rightLookup.get(key);
            
            if (rightRow) {
              const merged = { ...leftRow };
              for (const col of rightDs.columns) {
                if (col !== rightKey) {
                  merged[`${rightDs.name}_${col}`] = rightRow[col];
                }
              }
              newResult.push(merged);
            } else if (joinType === "left") {
              const merged = { ...leftRow };
              for (const col of rightDs.columns) {
                if (col !== rightKey) {
                  merged[`${rightDs.name}_${col}`] = null;
                }
              }
              newResult.push(merged);
            }
          }
        }

        if (joinType === "right" || joinType === "full") {
          const leftKeys = new Set(resultData.map(r => String(r[leftKey] ?? "")));
          
          if (joinType === "right") {
            newResult.length = 0;
          }

          for (const rightRow of rightDs.rawData) {
            const key = String(rightRow[rightKey] ?? "");
            const leftRow = resultData.find(l => String(l[leftKey] ?? "") === key);
            
            if (joinType === "right") {
              const merged: Record<string, unknown> = {};
              if (leftRow) {
                Object.assign(merged, leftRow);
              } else {
                for (const col of resultColumns) {
                  merged[col] = null;
                }
              }
              for (const col of rightDs.columns) {
                if (col !== rightKey) {
                  merged[`${rightDs.name}_${col}`] = rightRow[col];
                }
              }
              newResult.push(merged);
            } else if (joinType === "full" && !leftKeys.has(key)) {
              const merged: Record<string, unknown> = {};
              for (const col of resultColumns) {
                merged[col] = null;
              }
              merged[leftKey] = rightRow[rightKey];
              for (const col of rightDs.columns) {
                if (col !== rightKey) {
                  merged[`${rightDs.name}_${col}`] = rightRow[col];
                }
              }
              newResult.push(merged);
            }
          }
        }

        resultData = newResult;
        resultColumns = [...new Set([...resultColumns, ...rightColsRenamed])];
      }

      setPreviewData(resultData.slice(0, 50));
      toast.success(`Join complete: ${resultData.length} rows, ${resultColumns.length} columns`);
    } catch (err) {
      console.error(err);
      toast.error("Join operation failed");
    } finally {
      setIsJoining(false);
    }
  };

  const applyJoinedData = () => {
    if (!previewData) return;
    
    const allCols = Object.keys(previewData[0] || {});
    onJoinComplete(previewData, allCols);
    toast.success("Joined data applied as working dataset");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Link2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Multi-Source Data Joiner</CardTitle>
              <CardDescription>
                Combine multiple datasets with SQL-style joins
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Datasets Panel */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Datasets
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addSecondaryDataset}>
                <Plus className="w-4 h-4 mr-1" />
                Add Dataset
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Primary Dataset */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-primary/20 text-primary border-primary/30">Primary</Badge>
                <span className="text-sm font-medium">{primaryDataset.name}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>{primaryDataset.rawData.length.toLocaleString()} rows</span>
                <span>{primaryDataset.columns.length} columns</span>
              </div>
            </div>

            {/* Secondary Datasets */}
            {secondaryDatasets.map((ds, index) => (
              <div key={index} className="p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Secondary {index + 1}</Badge>
                    {ds.name && <span className="text-sm font-medium">{ds.name}</span>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => removeSecondaryDataset(index)}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>

                {!ds.columns.length ? (
                  <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {uploadingIndex === index ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>Upload CSV file</span>
                    <input
                      type="file"
                      accept=".csv"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, index)}
                    />
                  </label>
                ) : (
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Check className="w-3 h-3 text-green-500" />
                      {ds.rawData.length.toLocaleString()} rows
                    </span>
                    <span>{ds.columns.length} columns</span>
                  </div>
                )}
              </div>
            ))}

            {secondaryDatasets.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add secondary datasets to join</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Join Configuration Panel */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Join Configuration
              </CardTitle>
              <Button
                size="sm"
                variant="outline"
                onClick={addJoinConfig}
                disabled={secondaryDatasets.length === 0 || !secondaryDatasets[0]?.columns?.length}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Join
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {joinConfigs.map((config, idx) => {
              const rightDs = getDatasetByRef(config.rightDataset);
              
              return (
                <div key={config.id} className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline">Join {idx + 1}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => removeJoinConfig(config.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>

                  {/* Join Type */}
                  <Select
                    value={config.joinType}
                    onValueChange={(v) => updateJoinConfig(config.id, { joinType: v as JoinConfig["joinType"] })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOIN_TYPES.map(jt => (
                        <SelectItem key={jt.value} value={jt.value}>
                          <div className="flex flex-col">
                            <span>{jt.label}</span>
                            <span className="text-xs text-muted-foreground">{jt.description}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Column Selection */}
                  <div className="flex items-center gap-2">
                    <Select
                      value={config.leftColumn}
                      onValueChange={(v) => updateJoinConfig(config.id, { leftColumn: v })}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="Primary column" />
                      </SelectTrigger>
                      <SelectContent>
                        {primaryDataset.columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />

                    <Select
                      value={config.rightColumn}
                      onValueChange={(v) => updateJoinConfig(config.id, { rightColumn: v })}
                    >
                      <SelectTrigger className="h-9 flex-1">
                        <SelectValue placeholder="Secondary column" />
                      </SelectTrigger>
                      <SelectContent>
                        {rightDs?.columns.map(col => (
                          <SelectItem key={col} value={col}>{col}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}

            {joinConfigs.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Link2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Add a join to combine datasets</p>
              </div>
            )}

            {joinConfigs.length > 0 && (
              <Button
                className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                onClick={executeJoin}
                disabled={isJoining}
              >
                {isJoining ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Execute Join
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview Results */}
      {previewData && previewData.length > 0 && (
        <Card className="bg-card/50 border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Table className="w-4 h-4" />
                Join Preview
                <Badge variant="outline">{previewData.length} rows</Badge>
              </CardTitle>
              <Button onClick={applyJoinedData} className="gap-2">
                <Download className="w-4 h-4" />
                Apply as Dataset
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/50 bg-muted/30">
                    <tr>
                      {Object.keys(previewData[0] || {}).slice(0, 10).map(col => (
                        <th key={col} className="text-left px-3 py-2 font-medium whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 20).map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
                        {Object.keys(row).slice(0, 10).map(col => (
                          <td key={col} className="px-3 py-2 whitespace-nowrap">
                            {String(row[col] ?? "-")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MultiSourceJoiner;
