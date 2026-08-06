import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  ShieldCheck, AlertTriangle, Database, Hash, Calendar, Type, 
  Key, MapPin, FileText, Fingerprint, Link2, ArrowRight
} from "lucide-react";

interface AutoIngestPanelProps {
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
}

interface ColumnProfile {
  name: string;
  type: "metric" | "dimension" | "date" | "id" | "text" | "geo";
  icon: typeof Hash;
  missing: number;
  missingPct: number;
  unique: number;
  uniquePct: number;
  sample: string[];
  issues: string[];
}

interface Relationship {
  from: string;
  to: string;
  type: "foreign_key" | "correlation" | "derived";
  confidence: number;
}

const TYPE_ICONS: Record<string, typeof Hash> = {
  metric: Hash,
  dimension: Type,
  date: Calendar,
  id: Key,
  text: FileText,
  geo: MapPin,
};

const TYPE_COLORS: Record<string, string> = {
  metric: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  dimension: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  date: "bg-green-500/10 text-green-600 border-green-500/20",
  id: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  text: "bg-muted text-muted-foreground border-border",
  geo: "bg-teal-500/10 text-teal-600 border-teal-500/20",
};

function detectColumnType(values: unknown[], colName: string): ColumnProfile["type"] {
  const lc = colName.toLowerCase();
  // ID detection
  if (lc === "id" || lc.endsWith("_id") || lc.endsWith("id") || lc === "uuid" || lc === "key") return "id";
  // Geo detection
  if (["lat", "lng", "longitude", "latitude", "city", "state", "country", "zip", "zipcode", "region", "address"].some(g => lc.includes(g))) return "geo";

  const sample = values.filter(v => v !== null && v !== undefined && v !== "").slice(0, 100);
  if (sample.length === 0) return "text";

  // Date detection
  const dateCount = sample.filter(v => {
    if (typeof v !== "string") return false;
    return !isNaN(Date.parse(v)) && v.length > 5;
  }).length;
  if (dateCount / sample.length > 0.6) return "date";

  // Numeric detection
  const numCount = sample.filter(v => !isNaN(Number(v))).length;
  if (numCount / sample.length > 0.7) return "metric";

  // Dimension vs text: low cardinality = dimension
  const uniques = new Set(sample.map(String)).size;
  if (uniques / sample.length < 0.3 || uniques < 30) return "dimension";

  return "text";
}

function detectIssues(values: unknown[], type: string): string[] {
  const issues: string[] = [];
  const missing = values.filter(v => v === null || v === undefined || v === "").length;
  const missingPct = (missing / values.length) * 100;
  if (missingPct > 20) issues.push(`${missingPct.toFixed(1)}% missing values`);

  if (type === "metric") {
    const nums = values.filter(v => !isNaN(Number(v))).map(Number);
    if (nums.length > 5) {
      const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
      const std = Math.sqrt(nums.reduce((s, v) => s + (v - mean) ** 2, 0) / nums.length);
      const outliers = nums.filter(v => Math.abs(v - mean) > 3 * std).length;
      if (outliers > 0) issues.push(`${outliers} potential outlier${outliers > 1 ? "s" : ""} (>3σ)`);
    }
  }

  // Duplicate check
  const strs = values.map(String);
  const dups = strs.length - new Set(strs).size;
  const dupPct = (dups / strs.length) * 100;
  if (type === "id" && dupPct > 5) issues.push(`${dupPct.toFixed(1)}% duplicate IDs`);

  // Type inconsistency
  if (type === "metric") {
    const nonNum = values.filter(v => v !== null && v !== undefined && v !== "" && isNaN(Number(v))).length;
    if (nonNum > 0) issues.push(`${nonNum} non-numeric value${nonNum > 1 ? "s" : ""} in metric column`);
  }

  return issues;
}

function inferRelationships(profiles: ColumnProfile[]): Relationship[] {
  const rels: Relationship[] = [];
  const ids = profiles.filter(p => p.type === "id");
  const dims = profiles.filter(p => p.type === "dimension");

  // FK-like: ID column that shares name prefix with dimension
  for (const id of ids) {
    for (const dim of dims) {
      const idBase = id.name.replace(/_id$/i, "").toLowerCase();
      if (dim.name.toLowerCase().includes(idBase) || idBase.includes(dim.name.toLowerCase())) {
        rels.push({ from: id.name, to: dim.name, type: "foreign_key", confidence: 0.7 });
      }
    }
  }

  return rels.slice(0, 8);
}

const AutoIngestPanel = ({ data, columns, datasetName }: AutoIngestPanelProps) => {
  const profiles = useMemo(() => {
    return columns.map(col => {
      const values = data.map(r => r[col]);
      const type = detectColumnType(values, col);
      const missing = values.filter(v => v === null || v === undefined || v === "").length;
      const unique = new Set(values.filter(v => v !== null && v !== undefined && v !== "").map(String)).size;
      const sample = [...new Set(values.filter(v => v !== null && v !== undefined && v !== "").map(String))].slice(0, 3);
      const issues = detectIssues(values, type);

      return {
        name: col,
        type,
        icon: TYPE_ICONS[type] || Type,
        missing,
        missingPct: (missing / data.length) * 100,
        unique,
        uniquePct: (unique / data.length) * 100,
        sample,
        issues,
      } as ColumnProfile;
    });
  }, [data, columns]);

  const relationships = useMemo(() => inferRelationships(profiles), [profiles]);

  const totalIssues = profiles.reduce((s, p) => s + p.issues.length, 0);
  const avgMissing = profiles.reduce((s, p) => s + p.missingPct, 0) / profiles.length;
  const typeConsistency = profiles.filter(p => !p.issues.some(i => i.includes("non-numeric"))).length / profiles.length * 100;
  const duplicateScore = 100 - (profiles.filter(p => p.issues.some(i => i.includes("duplicate"))).length / profiles.length * 100);
  const healthScore = Math.round(
    (100 - avgMissing) * 0.4 + typeConsistency * 0.3 + duplicateScore * 0.3
  );

  const healthColor = healthScore >= 80 ? "text-green-500" : healthScore >= 60 ? "text-yellow-500" : "text-red-500";
  const healthLabel = healthScore >= 80 ? "Excellent" : healthScore >= 60 ? "Fair" : "Poor";

  const typeCounts = profiles.reduce((acc, p) => {
    acc[p.type] = (acc[p.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      {/* Health Score */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              Data Health Score
            </CardTitle>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${healthColor}`}>{healthScore}</span>
              <Badge variant="outline" className={healthColor}>{healthLabel}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={healthScore} className="h-2" />
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Completeness</p>
              <p className="font-semibold">{(100 - avgMissing).toFixed(1)}%</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Type Consistency</p>
              <p className="font-semibold">{typeConsistency.toFixed(0)}%</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">Issues Found</p>
              <p className="font-semibold">{totalIssues}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Schema Intelligence */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            Schema Intelligence
          </CardTitle>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <Badge key={type} variant="outline" className={`text-[10px] ${TYPE_COLORS[type]}`}>
                {type}: {count}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {profiles.map(p => {
              const Icon = p.icon;
              return (
                <div key={p.name} className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className={`p-1 rounded ${TYPE_COLORS[p.type]}`}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium truncate">{p.name}</span>
                      <Badge variant="outline" className="text-[9px] px-1 py-0">{p.type}</Badge>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
                      <span>{p.unique} unique ({p.uniquePct.toFixed(0)}%)</span>
                      {p.missingPct > 0 && <span className="text-yellow-500">{p.missingPct.toFixed(1)}% missing</span>}
                    </div>
                    {p.issues.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {p.issues.map((issue, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-yellow-500/30 text-yellow-600 bg-yellow-500/5">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" />{issue}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Inferred Relationships */}
      {relationships.length > 0 && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary" />
              Inferred Relationships
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {relationships.map((rel, i) => (
                <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg bg-muted/30">
                  <Badge variant="outline" className="text-[10px]">{rel.from}</Badge>
                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px]">{rel.to}</Badge>
                  <span className="text-muted-foreground ml-auto">{(rel.confidence * 100).toFixed(0)}% conf</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AutoIngestPanel;
