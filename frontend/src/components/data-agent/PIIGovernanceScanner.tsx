import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Shield,
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Lock,
  FileWarning,
  Download,
  Mail,
  Phone,
  CreditCard,
  User,
  MapPin,
  Calendar,
  Hash,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DatasetState } from "@/pages/DataAgent";

interface PIIFinding {
  column: string;
  type: PIIType;
  count: number;
  sampleValues: string[];
  riskLevel: "critical" | "high" | "medium" | "low";
  recommendation: string;
}

type PIIType = "email" | "phone" | "ssn" | "credit_card" | "name" | "address" | "date_of_birth" | "ip_address" | "password" | "api_key";

interface PIIGovernanceScannerProps {
  dataset: DatasetState;
  onDataMasked: (maskedData: Record<string, unknown>[]) => void;
}

const PII_PATTERNS: Record<PIIType, { pattern: RegExp; icon: typeof Mail; label: string; risk: PIIFinding["riskLevel"] }> = {
  email: {
    pattern: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    icon: Mail,
    label: "Email Address",
    risk: "high",
  },
  phone: {
    pattern: /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/,
    icon: Phone,
    label: "Phone Number",
    risk: "high",
  },
  ssn: {
    pattern: /^\d{3}[-]?\d{2}[-]?\d{4}$/,
    icon: Hash,
    label: "SSN / National ID",
    risk: "critical",
  },
  credit_card: {
    pattern: /^(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})$/,
    icon: CreditCard,
    label: "Credit Card",
    risk: "critical",
  },
  name: {
    pattern: /^[A-Z][a-z]+\s[A-Z][a-z]+$/,
    icon: User,
    label: "Full Name",
    risk: "medium",
  },
  address: {
    pattern: /^\d+\s[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr)/i,
    icon: MapPin,
    label: "Physical Address",
    risk: "high",
  },
  date_of_birth: {
    pattern: /^(0[1-9]|1[0-2])[\/\-](0[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}$/,
    icon: Calendar,
    label: "Date of Birth",
    risk: "medium",
  },
  ip_address: {
    pattern: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    icon: Hash,
    label: "IP Address",
    risk: "medium",
  },
  password: {
    pattern: /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/,
    icon: Lock,
    label: "Password",
    risk: "critical",
  },
  api_key: {
    pattern: /^(sk|pk|api)[_-][a-zA-Z0-9]{20,}$/,
    icon: Lock,
    label: "API Key",
    risk: "critical",
  },
};

const RISK_COLORS: Record<PIIFinding["riskLevel"], string> = {
  critical: "text-red-500 bg-red-500/10 border-red-500/30",
  high: "text-orange-500 bg-orange-500/10 border-orange-500/30",
  medium: "text-yellow-500 bg-yellow-500/10 border-yellow-500/30",
  low: "text-green-500 bg-green-500/10 border-green-500/30",
};

const PIIGovernanceScanner = ({ dataset, onDataMasked }: PIIGovernanceScannerProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [findings, setFindings] = useState<PIIFinding[]>([]);
  const [scanComplete, setScanComplete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [autoMask, setAutoMask] = useState(true);
  const [selectedFindings, setSelectedFindings] = useState<Set<string>>(new Set());

  const detectPIIType = useCallback((value: string): PIIType | null => {
    const strVal = String(value).trim();
    if (!strVal || strVal.length < 3) return null;

    for (const [type, config] of Object.entries(PII_PATTERNS)) {
      if (config.pattern.test(strVal)) {
        return type as PIIType;
      }
    }

    // Additional heuristics for names
    const nameParts = strVal.split(/\s+/);
    if (nameParts.length >= 2 && nameParts.every(p => /^[A-Z][a-z]{1,20}$/.test(p))) {
      return "name";
    }

    // Check for email-like columns
    if (strVal.includes("@") && strVal.includes(".")) {
      return "email";
    }

    return null;
  }, []);

  const runScan = useCallback(async () => {
    setIsScanning(true);
    setScanProgress(0);
    setFindings([]);
    setScanComplete(false);

    const data = dataset.cleanedData || dataset.rawData;
    const foundPII: PIIFinding[] = [];
    const totalCols = dataset.columns.length;

    for (let i = 0; i < dataset.columns.length; i++) {
      const col = dataset.columns[i];
      setScanProgress(Math.round(((i + 1) / totalCols) * 100));
      
      // Analyze column values
      const piiCounts: Record<PIIType, { count: number; samples: string[] }> = {} as any;
      
      for (const row of data.slice(0, 500)) {
        const value = row[col];
        if (value === null || value === undefined) continue;
        
        const piiType = detectPIIType(String(value));
        if (piiType) {
          if (!piiCounts[piiType]) {
            piiCounts[piiType] = { count: 0, samples: [] };
          }
          piiCounts[piiType].count++;
          if (piiCounts[piiType].samples.length < 3) {
            piiCounts[piiType].samples.push(String(value));
          }
        }
      }

      // If >20% of values match a PII pattern, flag the column
      for (const [type, stats] of Object.entries(piiCounts)) {
        const piiType = type as PIIType;
        const threshold = data.length * 0.2;
        
        if (stats.count > threshold || stats.count > 10) {
          const config = PII_PATTERNS[piiType];
          foundPII.push({
            column: col,
            type: piiType,
            count: stats.count,
            sampleValues: stats.samples,
            riskLevel: config.risk,
            recommendation: `Consider masking or removing ${config.label} data from column "${col}"`,
          });
        }
      }

      // Small delay to show progress
      await new Promise(r => setTimeout(r, 50));
    }

    setFindings(foundPII);
    setSelectedFindings(new Set(foundPII.map(f => `${f.column}_${f.type}`)));
    setScanComplete(true);
    setIsScanning(false);

    if (foundPII.length === 0) {
      toast.success("No PII detected in dataset");
    } else {
      toast.warning(`Found ${foundPII.length} potential PII columns`);
    }
  }, [dataset, detectPIIType]);

  const toggleFinding = (key: string) => {
    setSelectedFindings(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const maskValue = (value: string, type: PIIType): string => {
    switch (type) {
      case "email":
        const [local, domain] = value.split("@");
        return `${local[0]}***@${domain}`;
      case "phone":
        return value.replace(/\d(?=\d{4})/g, "*");
      case "ssn":
        return "***-**-" + value.slice(-4);
      case "credit_card":
        return "**** **** **** " + value.slice(-4);
      case "name":
        return value.split(" ").map(p => p[0] + "***").join(" ");
      case "address":
        return "*** " + value.split(" ").slice(-2).join(" ");
      case "date_of_birth":
        return "**/**/" + value.slice(-4);
      case "ip_address":
        return value.split(".").map((_, i) => i < 2 ? "***" : _).join(".");
      case "password":
      case "api_key":
        return "********";
      default:
        return "***";
    }
  };

  const applyMasking = () => {
    const data = dataset.cleanedData || dataset.rawData;
    const selectedCols = findings
      .filter(f => selectedFindings.has(`${f.column}_${f.type}`))
      .reduce((acc, f) => ({ ...acc, [f.column]: f.type }), {} as Record<string, PIIType>);

    const maskedData = data.map(row => {
      const newRow = { ...row };
      for (const [col, type] of Object.entries(selectedCols)) {
        if (newRow[col] !== null && newRow[col] !== undefined) {
          newRow[col] = maskValue(String(newRow[col]), type);
        }
      }
      return newRow;
    });

    onDataMasked(maskedData);
    toast.success(`Masked ${Object.keys(selectedCols).length} columns`);
  };

  const getRiskSummary = () => {
    const summary = { critical: 0, high: 0, medium: 0, low: 0 };
    findings.forEach(f => { summary[f.riskLevel]++; });
    return summary;
  };

  const riskSummary = getRiskSummary();
  const overallScore = scanComplete
    ? Math.max(0, 100 - (riskSummary.critical * 30 + riskSummary.high * 15 + riskSummary.medium * 5))
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">PII Governance Scanner</CardTitle>
              <CardDescription>
                Detect and mask sensitive personal information in your data
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Scanner Control */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4" />
              Data Scan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Dataset</span>
                <span className="font-medium">{dataset.name}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Rows</span>
                <span className="font-medium">{dataset.rawData.length.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span>Columns</span>
                <span className="font-medium">{dataset.columns.length}</span>
              </div>
            </div>

            {isScanning && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Scanning columns...</span>
                  <span>{scanProgress}%</span>
                </div>
                <Progress value={scanProgress} className="h-2" />
              </div>
            )}

            <Button
              className="w-full gap-2"
              onClick={runScan}
              disabled={isScanning}
            >
              {isScanning ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isScanning ? "Scanning..." : "Run PII Scan"}
            </Button>

            {scanComplete && (
              <div className="flex items-center gap-2 text-sm">
                <Switch checked={autoMask} onCheckedChange={setAutoMask} />
                <span>Auto-select all findings</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Risk Summary */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="w-4 h-4" />
              Risk Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Compliance Score */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary/10 to-accent/5 border border-primary/20 text-center">
              <div className={cn(
                "text-4xl font-bold",
                overallScore >= 80 ? "text-green-500" : overallScore >= 50 ? "text-yellow-500" : "text-red-500"
              )}>
                {overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Privacy Score</div>
            </div>

            {/* Risk Breakdown */}
            <div className="space-y-2">
              {Object.entries(riskSummary).map(([level, count]) => (
                <div key={level} className="flex items-center justify-between">
                  <Badge className={RISK_COLORS[level as PIIFinding["riskLevel"]]}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Badge>
                  <span className="text-sm font-medium">{count}</span>
                </div>
              ))}
            </div>

            {scanComplete && findings.length > 0 && (
              <Button
                className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
                onClick={applyMasking}
                disabled={selectedFindings.size === 0}
              >
                <Lock className="w-4 h-4" />
                Mask Selected ({selectedFindings.size})
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Detection Legend */}
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              PII Types Detected
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="space-y-2">
                {Object.entries(PII_PATTERNS).map(([type, config]) => {
                  const Icon = config.icon;
                  const found = findings.some(f => f.type === type);
                  return (
                    <div
                      key={type}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                        found ? "bg-muted/50" : "opacity-50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{config.label}</span>
                      {found && <CheckCircle className="w-4 h-4 text-yellow-500" />}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Findings Detail */}
      {findings.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              PII Findings ({findings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <div className="space-y-3">
                {findings.map((finding, idx) => {
                  const config = PII_PATTERNS[finding.type];
                  const Icon = config.icon;
                  const key = `${finding.column}_${finding.type}`;
                  const isSelected = selectedFindings.has(key);

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-4 rounded-xl border transition-colors cursor-pointer",
                        isSelected ? "bg-primary/10 border-primary/30" : "bg-muted/30 border-border/50"
                      )}
                      onClick={() => toggleFinding(key)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          RISK_COLORS[finding.riskLevel]
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{finding.column}</span>
                            <Badge className={RISK_COLORS[finding.riskLevel]}>
                              {finding.riskLevel}
                            </Badge>
                            <Badge variant="outline">{config.label}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {finding.count} instances detected
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {finding.sampleValues.map((v, i) => (
                              <code key={i} className="text-xs bg-muted px-2 py-0.5 rounded">
                                {isSelected ? maskValue(v, finding.type) : v}
                              </code>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0">
                          {isSelected ? (
                            <EyeOff className="w-5 h-5 text-primary" />
                          ) : (
                            <Eye className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PIIGovernanceScanner;
