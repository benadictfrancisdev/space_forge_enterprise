import { useState, useEffect, useCallback, useRef } from "react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  FileText, Download, Loader2, Sparkles, Calendar, Target, CheckCircle, AlertCircle,
  TrendingUp, TrendingDown, BarChart3, Settings, FileDown, RefreshCw, Clock, Zap,
  BookOpen, Lightbulb, Rocket, Eye, Palette, Shield, Activity, Layers,
  ArrowUpRight, ArrowDownRight, Minus, Database, PieChart, Search, ChevronDown,
  ChevronRight, ListTree, Hash, AlertTriangle, Info, Gauge,
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { DatasetState } from "@/pages/DataAgent";
import PDFTemplateSelector, { PDFTemplate, PDF_TEMPLATES } from "./PDFTemplateSelector";
import EnterpriseInsightView from "./EnterpriseInsightView";
import HypothesisBlock, {
  hypothesesFromDeltas,
  hypothesesFromDrivers,
  hypothesesFromSeasonality,
  type HypothesisItem,
} from "./HypothesisBlock";
import { isUniversalEnvelope, type UniversalEnvelope } from "@/lib/outputEnvelope";
import { recordFinding } from "@/lib/insightMemory";
import { buildEvidencePacket } from "@/lib/advancedStats";

interface ReportGeneratorProps {
  dataset: DatasetState;
}

interface KeyFinding {
  id?: string; headline?: string; description?: string; evidence?: string;
  impact?: string; confidence?: number; finding?: string; title?: string;
}

interface Recommendation {
  id?: string; priority?: string; action?: string; rationale?: string;
  expectedOutcome?: string; timeline?: string; roi?: string; reason?: string;
}

interface RiskItem {
  risk?: string; probability?: string; impact?: string; mitigation?: string; severity?: number;
}

interface Opportunity {
  opportunity?: string; value?: string; effort?: string; timeline?: string;
}

interface PatternAnalysis {
  trends?: Array<{ name?: string; description?: string; trajectory?: string; magnitude?: string; }>;
  correlations?: Array<{ variables?: string[]; strength?: number; interpretation?: string; }>;
  anomalies?: Array<{ description?: string; severity?: string; }>;
  segments?: Array<{ name?: string; characteristics?: string; size?: string; }>;
}

interface DataDictionaryEntry {
  column?: string; type?: string; description?: string; uniqueCount?: number;
  missingPct?: number; sampleValues?: string[]; statsSummary?: string;
}

interface DescriptiveStatEntry {
  column?: string; mean?: number; median?: number; std?: number; min?: number;
  max?: number; q1?: number; q3?: number; skewness?: number; kurtosis?: number;
}

interface DataQualityAssessment {
  overallScore?: number; completeness?: number; consistency?: number; accuracy?: number;
  missingValueSummary?: Array<{ column?: string; missingCount?: number; missingPct?: number; }>;
  duplicateRows?: number; duplicatePct?: number; dataTypeIssues?: string[];
  qualityGrade?: string; summary?: string;
}

interface DistributionEntry {
  column?: string; skewness?: number; skewnessInterpretation?: string;
  kurtosis?: number; kurtosisInterpretation?: string;
  normalityAssessment?: string; outlierCount?: number; outlierPct?: number;
}

interface CorrelationMatrix {
  topCorrelations?: Array<{ column1?: string; column2?: string; coefficient?: number;
    strength?: string; direction?: string; interpretation?: string; }>;
  confoundingNotes?: string; summary?: string;
}

interface OutlierAnalysis {
  totalOutliers?: number; outlierRate?: number;
  severityBreakdown?: { critical?: number; high?: number; medium?: number; low?: number; };
  affectedColumns?: string[];
  rootCauseGroups?: Array<{ groupName?: string; pattern?: string; count?: number; businessImpact?: string; }>;
  summary?: string;
}

interface TrendAnalysis {
  trendDirection?: string; trendColumn?: string; seasonalityDetected?: boolean;
  seasonalityPeriod?: string; forecastSummary?: string;
  forecastedValues?: Array<{ period?: string; value?: number; ciLower?: number; ciUpper?: number; }>;
  changeRate?: string;
}

interface LimitationsAndAssumptions {
  dataLimitations?: string[]; statisticalAssumptions?: string[];
  confidenceCaveats?: string[]; sampleSizeNotes?: string;
}

interface AppendixData {
  rawStatistics?: string; methodologyNotes?: string; dataSourceNotes?: string;
}

interface GeneratedReport {
  title: string;
  executiveSummary: string;
  situationAnalysis?: string;
  introduction: string;
  objectives: string[];
  problemStatement: string;
  methodology: string;
  datasetOverview: { name: string; records: number; columns: number; dataTypes: string[]; };
  toolsAndTechnologies: string[];
  implementationSteps: Array<string | { phase?: string; step?: string; description?: string; }>;
  keyFindings: string[];
  dataDictionary?: DataDictionaryEntry[];
  descriptiveStatistics?: DescriptiveStatEntry[];
  dataQualityAssessment?: DataQualityAssessment;
  distributionAnalysis?: DistributionEntry[];
  correlationMatrix?: CorrelationMatrix;
  outlierAnalysis?: OutlierAnalysis;
  trendAnalysis?: TrendAnalysis;
  patternAnalysis?: PatternAnalysis;
  rootCauseAnalysis?: Array<{ finding?: string; causes?: string[]; contributingFactors?: string[]; }>;
  riskAssessment?: RiskItem[];
  opportunities?: Opportunity[];
  recommendations: string[];
  implementationRoadmap?: {
    phase1?: { name?: string; actions?: string[]; milestones?: string[]; };
    phase2?: { name?: string; actions?: string[]; milestones?: string[]; };
    phase3?: { name?: string; actions?: string[]; milestones?: string[]; };
  };
  limitationsAndAssumptions?: LimitationsAndAssumptions;
  appendix?: AppendixData;
  conclusion: string;
  futureScope: string[];
  keyMetrics?: Array<{ name?: string; value?: string; change?: string; trend?: string; status?: string; }>;
  confidence?: number;
  wordCount?: number;
  generatedAt: string;
}

// Table of Contents sections
const TOC_SECTIONS = [
  { id: "executive-summary", label: "Executive Summary", icon: Target },
  { id: "key-metrics", label: "Key Metrics", icon: Activity },
  { id: "data-quality", label: "Data Quality", icon: Gauge },
  { id: "data-dictionary", label: "Data Dictionary", icon: Database },
  { id: "descriptive-stats", label: "Descriptive Statistics", icon: Hash },
  { id: "distribution", label: "Distribution Analysis", icon: PieChart },
  { id: "correlation-matrix", label: "Correlation Analysis", icon: Layers },
  { id: "situation-analysis", label: "Situation Analysis", icon: Layers },
  { id: "methodology", label: "Methodology", icon: Settings },
  { id: "key-findings", label: "Key Findings", icon: TrendingUp },
  { id: "pattern-analysis", label: "Pattern Analysis", icon: Activity },
  { id: "outlier-analysis", label: "Outlier Analysis", icon: AlertTriangle },
  { id: "trend-analysis", label: "Trend & Forecast", icon: TrendingUp },
  { id: "risk-assessment", label: "Risk Assessment", icon: Shield },
  { id: "opportunities", label: "Opportunities", icon: Zap },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
  { id: "roadmap", label: "Implementation Roadmap", icon: Rocket },
  { id: "limitations", label: "Limitations", icon: Info },
  { id: "conclusion", label: "Conclusion", icon: CheckCircle },
  { id: "appendix", label: "Appendix", icon: BookOpen },
];

const ReportGenerator = ({ dataset }: ReportGeneratorProps) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [projectDetails, setProjectDetails] = useState("");
  const [projectGoals, setProjectGoals] = useState("");
  const [projectStatus, setProjectStatus] = useState("in-progress");
  const [generationProgress, setGenerationProgress] = useState(0);
  const [autoUpdate, setAutoUpdate] = useState(false);
  const [lastDataHash, setLastDataHash] = useState<string>("");
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<PDFTemplate>(PDF_TEMPLATES[0]);
  const [progressLabel, setProgressLabel] = useState("");
  const [appendixOpen, setAppendixOpen] = useState(false);
  const [enterprise, setEnterprise] = useState<UniversalEnvelope | null>(null);
  const [hypotheses, setHypotheses] = useState<HypothesisItem[]>([]);
  const reportRef = useRef<HTMLDivElement>(null);

  const calculateDataHash = useCallback(() => {
    const dataToHash = dataset.cleanedData || dataset.rawData;
    return JSON.stringify(dataToHash.slice(0, 50)).length + "-" + dataToHash.length;
  }, [dataset]);

  useEffect(() => {
    if (!autoUpdate || !report) return;
    const currentHash = calculateDataHash();
    if (currentHash !== lastDataHash && lastDataHash !== "") {
      generateReport();
    }
    setLastDataHash(currentHash);
  }, [dataset, autoUpdate, report, lastDataHash, calculateDataHash]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(`report-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const generateReport = async () => {
    if (!user) {
      toast.error("Please sign in to generate a full report.");
      return;
    }
    setIsGenerating(true);
    setGenerationProgress(5);
    setProgressLabel("Preparing analysis...");

    try {
      const dataToAnalyze = dataset.cleanedData || dataset.rawData;
      const sampleData = dataToAnalyze.slice(0, 200);
      const authBody = { userId: user.id, userEmail: user.email };

      // â”€â”€â”€ Stats-First: build evidence packet locally before any AI call â”€â”€â”€
      const numericColumns = dataset.columns.filter((c) => {
        for (const row of dataToAnalyze.slice(0, 100)) {
          const v = row?.[c];
          if (v != null && v !== "" && Number.isFinite(Number(v))) return true;
        }
        return false;
      });
      const evidencePacket = buildEvidencePacket(dataToAnalyze, numericColumns);

      // Derive Hypothesis â†’ Test â†’ Result blocks from local stats (no AI needed)
      const localHypotheses: HypothesisItem[] = [
        ...hypothesesFromDeltas(evidencePacket.topDeltas),
        ...evidencePacket.topDrivers.flatMap((d) =>
          hypothesesFromDrivers(d.target, d.drivers),
        ),
        ...hypothesesFromSeasonality(evidencePacket.seasonality),
      ];
      setHypotheses(localHypotheses);

      // Step 1: Run 5 analysis calls in parallel (now passing preComputedStats)
      setGenerationProgress(10);
      setProgressLabel("Running analysis dashboard (EDA, insights, correlations, anomaly, forecast)...");

      const baseBody = {
        data: sampleData,
        columns: dataset.columns,
        datasetName: dataset.name,
        preComputedStats: evidencePacket,
        ...authBody,
      };

      const [edaResult, insightsResult, correlationsResult, anomalyResult, forecastResult] = await Promise.allSettled([
        backend.functions.invoke('data-agent', { body: { action: 'eda', ...baseBody } }),
        backend.functions.invoke('data-agent', { body: { action: 'insights', ...baseBody } }),
        backend.functions.invoke('data-agent', { body: { action: 'correlations', ...baseBody } }),
        backend.functions.invoke('data-agent', { body: { action: 'anomaly', ...baseBody } }),
        backend.functions.invoke('data-agent', { body: { action: 'forecast', ...baseBody } }),
      ]);

      setGenerationProgress(50);
      setProgressLabel("All 5 analyses complete. Generating comprehensive DS/DA report...");

      const analysisResults = {
        eda: edaResult.status === 'fulfilled' ? edaResult.value?.data : null,
        insights: insightsResult.status === 'fulfilled' ? insightsResult.value?.data : null,
        correlations: correlationsResult.status === 'fulfilled' ? correlationsResult.value?.data : null,
        anomaly: anomalyResult.status === 'fulfilled' ? anomalyResult.value?.data : null,
        forecast: forecastResult.status === 'fulfilled' ? forecastResult.value?.data : null,
      };

      // Step 2: Generate the report with all analysis context
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 3, 85));
      }, 1000);

      const { data, error } = await backend.functions.invoke('data-agent', {
        body: {
          action: 'generate-report',
          data: sampleData,
          datasetName: dataset.name,
          projectDetails,
          projectGoals,
          projectStatus,
          columns: dataset.columns,
          analysisResults,
          preComputedStats: evidencePacket,
          ...authBody,
        }
      });

      clearInterval(progressInterval);
      setGenerationProgress(90);
      setProgressLabel("Formatting report...");

      if (error) throw error;
      if (data?.success === false) throw new Error(typeof data.error === "string" ? data.error : "AI service error");

      const responseData = data?.module === 'generate-report' || data?.module === 'full_report'
        ? (data.data || {})
        : (data || {});

      const extractFindingText = (f: unknown): string => {
        if (typeof f === 'string') return f;
        const obj = f as KeyFinding;
        return obj?.headline || obj?.description || obj?.finding || obj?.title || String(f);
      };
      
      const extractRecommendationText = (r: unknown): string => {
        if (typeof r === 'string') return r;
        const obj = r as Recommendation;
        return obj?.action || obj?.rationale || obj?.reason || String(r);
      };

      const reportData: GeneratedReport = {
        title: responseData.title || `${dataset.name} Analysis Report`,
        executiveSummary: responseData.executiveSummary || responseData.summary || "Comprehensive analysis has been completed.",
        situationAnalysis: responseData.situationAnalysis || undefined,
        introduction: responseData.introduction || `This report presents a comprehensive analysis of the ${dataset.name} dataset.`,
        objectives: Array.isArray(responseData.objectives) ? responseData.objectives.map((o: unknown) => typeof o === 'string' ? o : String(o)) : ["Analyze data patterns", "Identify key insights", "Provide recommendations"],
        problemStatement: responseData.problemStatement || "Understanding complex data patterns to derive actionable intelligence.",
        methodology: responseData.methodology || "Multi-phase approach including data validation, statistical analysis, and AI-driven insight generation.",
        datasetOverview: {
          name: dataset.name,
          records: dataToAnalyze.length,
          columns: dataset.columns.length,
          dataTypes: dataset.columns.map(c => {
            const sample = dataToAnalyze[0]?.[c];
            return typeof sample === 'number' ? 'Numeric' : typeof sample === 'boolean' ? 'Boolean' : 'Text';
          }),
        },
        toolsAndTechnologies: Array.isArray(responseData.toolsAndTechnologies) ? responseData.toolsAndTechnologies.map((t: unknown) => String(t)) : ["AI Data Analysis Engine", "Statistical Processing Module"],
        implementationSteps: Array.isArray(responseData.implementationSteps) ? responseData.implementationSteps : ["Data Upload", "Automated Cleaning", "Statistical Analysis", "Report Compilation"],
        keyFindings: Array.isArray(responseData.keyFindings) ? responseData.keyFindings.map(extractFindingText) : ["Analysis completed successfully"],
        dataDictionary: responseData.dataDictionary || undefined,
        descriptiveStatistics: responseData.descriptiveStatistics || undefined,
        dataQualityAssessment: responseData.dataQualityAssessment || undefined,
        distributionAnalysis: responseData.distributionAnalysis || undefined,
        correlationMatrix: responseData.correlationMatrix || undefined,
        outlierAnalysis: responseData.outlierAnalysis || undefined,
        trendAnalysis: responseData.trendAnalysis || undefined,
        patternAnalysis: responseData.patternAnalysis || undefined,
        rootCauseAnalysis: responseData.rootCauseAnalysis || undefined,
        riskAssessment: responseData.riskAssessment || undefined,
        opportunities: responseData.opportunities || undefined,
        recommendations: Array.isArray(responseData.recommendations) ? responseData.recommendations.map(extractRecommendationText) : ["Review detailed findings"],
        implementationRoadmap: responseData.implementationRoadmap || undefined,
        limitationsAndAssumptions: responseData.limitationsAndAssumptions || undefined,
        appendix: responseData.appendix || undefined,
        conclusion: responseData.conclusion || "The analysis has been successfully completed.",
        futureScope: Array.isArray(responseData.futureScope) ? responseData.futureScope.map((s: unknown) => String(s)) : ["Continuous monitoring", "Predictive modeling"],
        keyMetrics: responseData.keyMetrics || undefined,
        confidence: responseData.confidence || undefined,
        wordCount: responseData.wordCount || undefined,
        generatedAt: new Date().toISOString(),
      };

      setReport(reportData);

      // Capture Universal Envelope from edge function response (Databricks-grade output)
      const env = (responseData as { enterprise?: unknown })?.enterprise;
      if (isUniversalEnvelope(env)) {
        setEnterprise(env);
        recordFinding(dataset.name, "full_report", env);
      } else {
        setEnterprise(null);
      }

      setGenerationProgress(100);
      setLastDataHash(calculateDataHash());
      toast.success("Report generated successfully!");
    } catch (error) {
      console.error("Report generation error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const exportToPDF = (template: PDFTemplate = selectedTemplate) => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPos = 20;

    const { primary, secondary, accent, text, textLight, background, headerBg } = template.colors;

    const checkPageBreak = (neededSpace: number = 30) => {
      if (yPos + neededSpace > pageHeight - 20) {
        doc.addPage();
        if (template.style === "elegant" || template.style === "modern") {
          doc.setFillColor(background[0], background[1], background[2]);
          doc.rect(0, 0, pageWidth, pageHeight, 'F');
        }
        yPos = 20;
      }
    };

    const addDecorativeElement = (style: string) => {
      if (style === "elegant") {
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.rect(0, 0, 4, pageHeight, 'F');
      } else if (style === "bold") {
        doc.setFillColor(secondary[0], secondary[1], secondary[2]);
        doc.rect(0, pageHeight - 3, pageWidth, 3, 'F');
      }
    };

    // Title Page
    doc.setFillColor(headerBg[0], headerBg[1], headerBg[2]);
    doc.rect(0, 0, pageWidth, 70, 'F');
    doc.setFillColor(accent[0], accent[1], accent[2]);
    doc.rect(0, 70, pageWidth, 4, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(report.title, pageWidth / 2, 30, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(template.name + " Template", pageWidth / 2, 45, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Generated: ${new Date(report.generatedAt).toLocaleDateString()}`, pageWidth / 2, 58, { align: "center" });
    yPos = 90;

    const addSectionHeader = (title: string) => {
      checkPageBreak(40);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(primary[0], primary[1], primary[2]);
      if (template.style === "bold") {
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(14, yPos - 6, pageWidth - 28, 10, 'F');
        doc.setTextColor(255, 255, 255);
        doc.text(title, 18, yPos);
        doc.setTextColor(text[0], text[1], text[2]);
      } else if (template.style === "elegant") {
        doc.text(title, 14, yPos);
        doc.setDrawColor(accent[0], accent[1], accent[2]);
        doc.setLineWidth(0.5);
        doc.line(14, yPos + 2, 14 + doc.getTextWidth(title), yPos + 2);
      } else if (template.style === "minimal") {
        doc.setTextColor(text[0], text[1], text[2]);
        doc.text(title.toUpperCase(), 14, yPos);
      } else {
        doc.setFillColor(primary[0], primary[1], primary[2]);
        doc.rect(14, yPos - 5, 3, 8, 'F');
        doc.text(title, 22, yPos);
      }
      yPos += 12;
    };

    const addParagraph = (content: string) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(text[0], text[1], text[2]);
      const lines = doc.splitTextToSize(content, pageWidth - 28);
      checkPageBreak(lines.length * 5 + 5);
      doc.text(lines, 14, yPos);
      yPos += lines.length * 5 + 10;
    };

    const addBulletList = (items: string[]) => {
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(text[0], text[1], text[2]);
      items.forEach(item => {
        checkPageBreak(10);
        doc.setFillColor(secondary[0], secondary[1], secondary[2]);
        doc.circle(17, yPos - 1.5, 1.5, 'F');
        const lines = doc.splitTextToSize(item, pageWidth - 38);
        doc.text(lines, 22, yPos);
        yPos += lines.length * 5 + 3;
      });
      yPos += 5;
    };

    // Executive Summary
    addSectionHeader("Executive Summary");
    addParagraph(report.executiveSummary);

    // Data Quality Assessment
    if (report.dataQualityAssessment) {
      addSectionHeader("Data Quality Assessment");
      const dq = report.dataQualityAssessment;
      addParagraph(`Overall Quality Score: ${dq.overallScore || 'N/A'}/100 (Grade: ${dq.qualityGrade || 'N/A'}) | Completeness: ${dq.completeness || 'N/A'}% | Duplicates: ${dq.duplicateRows || 0} rows (${dq.duplicatePct || 0}%)`);
      if (dq.summary) addParagraph(dq.summary);
    }

    // Data Dictionary
    if (report.dataDictionary && report.dataDictionary.length > 0) {
      addSectionHeader("Data Dictionary");
      autoTable(doc, {
        startY: yPos,
        head: [["Column", "Type", "Description", "Unique", "Missing %", "Stats"]],
        body: report.dataDictionary.map(d => [d.column || "", d.type || "", d.description || "", String(d.uniqueCount ?? ""), `${d.missingPct ?? 0}%`, d.statsSummary || ""]),
        theme: template.style === "minimal" ? "plain" : "striped",
        headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
        styles: { textColor: [text[0], text[1], text[2]], fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Descriptive Statistics
    if (report.descriptiveStatistics && report.descriptiveStatistics.length > 0) {
      addSectionHeader("Descriptive Statistics");
      autoTable(doc, {
        startY: yPos,
        head: [["Column", "Mean", "Median", "Std", "Min", "Max", "Q1", "Q3", "Skew"]],
        body: report.descriptiveStatistics.map(s => [s.column || "", n(s.mean), n(s.median), n(s.std), n(s.min), n(s.max), n(s.q1), n(s.q3), n(s.skewness)]),
        theme: template.style === "minimal" ? "plain" : "striped",
        headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
        styles: { textColor: [text[0], text[1], text[2]], fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Distribution Analysis
    if (report.distributionAnalysis && report.distributionAnalysis.length > 0) {
      addSectionHeader("Distribution Analysis");
      autoTable(doc, {
        startY: yPos,
        head: [["Column", "Skewness", "Interpretation", "Normality", "Outliers"]],
        body: report.distributionAnalysis.map(d => [d.column || "", n(d.skewness), d.skewnessInterpretation || "", d.normalityAssessment || "", `${d.outlierCount ?? 0} (${d.outlierPct ?? 0}%)`]),
        theme: template.style === "minimal" ? "plain" : "striped",
        headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
        styles: { textColor: [text[0], text[1], text[2]], fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Correlation Matrix
    if (report.correlationMatrix?.topCorrelations?.length) {
      addSectionHeader("Correlation Analysis");
      autoTable(doc, {
        startY: yPos,
        head: [["Variable 1", "Variable 2", "Coefficient", "Strength", "Interpretation"]],
        body: report.correlationMatrix.topCorrelations.map(c => [c.column1 || "", c.column2 || "", n(c.coefficient), c.strength || "", c.interpretation || ""]),
        theme: template.style === "minimal" ? "plain" : "striped",
        headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
        styles: { textColor: [text[0], text[1], text[2]], fontSize: 7, cellPadding: 2 },
        alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      if (report.correlationMatrix.summary) addParagraph(report.correlationMatrix.summary);
    }

    // Dataset Overview
    addSectionHeader("Dataset Overview");
    autoTable(doc, {
      startY: yPos,
      head: [["Property", "Value"]],
      body: [
        ["Dataset Name", report.datasetOverview.name],
        ["Total Records", report.datasetOverview.records.toLocaleString()],
        ["Total Columns", report.datasetOverview.columns.toString()],
        ["Status", projectStatus.charAt(0).toUpperCase() + projectStatus.slice(1).replace('-', ' ')],
      ],
      theme: template.style === "minimal" ? "plain" : "striped",
      headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
      styles: { textColor: [text[0], text[1], text[2]] },
    });
    yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 20;

    // Objectives
    addSectionHeader("Objectives");
    addBulletList(report.objectives);

    // Key Findings
    addSectionHeader(`Key Findings (${report.keyFindings.length})`);
    report.keyFindings.forEach((finding, idx) => {
      checkPageBreak(15);
      doc.setFillColor(secondary[0], secondary[1], secondary[2]);
      doc.roundedRect(14, yPos - 4, 8, 6, 1, 1, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text(String(idx + 1), 16.5, yPos, { align: 'center' });
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFontSize(10);
      const findingLines = doc.splitTextToSize(finding, pageWidth - 38);
      doc.text(findingLines, 26, yPos);
      yPos += findingLines.length * 5 + 5;
    });
    yPos += 10;

    // Outlier Analysis
    if (report.outlierAnalysis) {
      addSectionHeader("Outlier / Anomaly Analysis");
      const oa = report.outlierAnalysis;
      addParagraph(`Total Outliers: ${oa.totalOutliers ?? 'N/A'} (${oa.outlierRate ?? 'N/A'}% of data) | Critical: ${oa.severityBreakdown?.critical ?? 0}, High: ${oa.severityBreakdown?.high ?? 0}, Medium: ${oa.severityBreakdown?.medium ?? 0}, Low: ${oa.severityBreakdown?.low ?? 0}`);
      if (oa.summary) addParagraph(oa.summary);
      if (oa.rootCauseGroups?.length) {
        autoTable(doc, {
          startY: yPos,
          head: [["Root Cause Group", "Pattern", "Count", "Business Impact"]],
          body: oa.rootCauseGroups.map(g => [g.groupName || "", g.pattern || "", String(g.count ?? ""), g.businessImpact || ""]),
          theme: template.style === "minimal" ? "plain" : "striped",
          headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
          styles: { textColor: [text[0], text[1], text[2]], fontSize: 7 },
          alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
        });
        yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      }
    }

    // Trend & Forecast
    if (report.trendAnalysis) {
      addSectionHeader("Trend & Forecast Analysis");
      const ta = report.trendAnalysis;
      addParagraph(`Trend Direction: ${ta.trendDirection || 'N/A'} | Column: ${ta.trendColumn || 'N/A'} | Seasonality: ${ta.seasonalityDetected ? `Yes (${ta.seasonalityPeriod})` : 'No'} | Change Rate: ${ta.changeRate || 'N/A'}`);
      if (ta.forecastSummary) addParagraph(ta.forecastSummary);
      if (ta.forecastedValues?.length) {
        autoTable(doc, {
          startY: yPos,
          head: [["Period", "Forecast", "CI Lower", "CI Upper"]],
          body: ta.forecastedValues.map(f => [f.period || "", n(f.value), n(f.ciLower), n(f.ciUpper)]),
          theme: template.style === "minimal" ? "plain" : "striped",
          headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255], fontSize: 8 },
          styles: { textColor: [text[0], text[1], text[2]], fontSize: 7 },
          alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
        });
        yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
      }
    }

    // Recommendations
    addSectionHeader(`Recommendations (${report.recommendations.length})`);
    report.recommendations.forEach((rec, idx) => {
      checkPageBreak(15);
      doc.setFillColor(accent[0], accent[1], accent[2]);
      doc.roundedRect(14, yPos - 4, 8, 6, 1, 1, 'F');
      doc.setTextColor(primary[0], primary[1], primary[2]);
      doc.setFontSize(8);
      doc.text(String(idx + 1), 16.5, yPos, { align: 'center' });
      doc.setTextColor(text[0], text[1], text[2]);
      doc.setFontSize(10);
      const recLines = doc.splitTextToSize(rec, pageWidth - 38);
      doc.text(recLines, 26, yPos);
      yPos += recLines.length * 5 + 5;
    });
    yPos += 10;

    // Risk Assessment
    if (report.riskAssessment && report.riskAssessment.length > 0) {
      addSectionHeader("Risk Assessment");
      autoTable(doc, {
        startY: yPos,
        head: [["Risk", "Probability", "Impact", "Mitigation"]],
        body: report.riskAssessment.map(r => [r.risk || "", r.probability || "", r.impact || "", r.mitigation || ""]),
        theme: template.style === "minimal" ? "plain" : "striped",
        headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
        styles: { textColor: [text[0], text[1], text[2]], fontSize: 9 },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Opportunities
    if (report.opportunities && report.opportunities.length > 0) {
      addSectionHeader("Opportunities");
      autoTable(doc, {
        startY: yPos,
        head: [["Opportunity", "Value", "Effort", "Timeline"]],
        body: report.opportunities.map(o => [o.opportunity || "", o.value || "", o.effort || "", o.timeline || ""]),
        theme: template.style === "minimal" ? "plain" : "striped",
        headStyles: { fillColor: [primary[0], primary[1], primary[2]], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [background[0], background[1], background[2]] },
        styles: { textColor: [text[0], text[1], text[2]], fontSize: 9 },
      });
      yPos = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 15;
    }

    // Implementation Roadmap
    if (report.implementationRoadmap) {
      addSectionHeader("Implementation Roadmap");
      [report.implementationRoadmap.phase1, report.implementationRoadmap.phase2, report.implementationRoadmap.phase3]
        .filter(Boolean).forEach((phase, i) => {
          checkPageBreak(20);
          doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(text[0], text[1], text[2]);
          doc.text(`Phase ${i + 1}: ${phase?.name || ""}`, 14, yPos); yPos += 6;
          doc.setFont("helvetica", "normal");
          phase?.actions?.forEach(a => { checkPageBreak(8); doc.text(`â€¢ ${a}`, 18, yPos); yPos += 5; });
          yPos += 5;
        });
    }

    // Limitations
    if (report.limitationsAndAssumptions) {
      addSectionHeader("Limitations & Assumptions");
      const la = report.limitationsAndAssumptions;
      if (la.dataLimitations?.length) { addParagraph("Data Limitations:"); addBulletList(la.dataLimitations); }
      if (la.statisticalAssumptions?.length) { addParagraph("Statistical Assumptions:"); addBulletList(la.statisticalAssumptions); }
      if (la.confidenceCaveats?.length) { addParagraph("Confidence Caveats:"); addBulletList(la.confidenceCaveats); }
      if (la.sampleSizeNotes) addParagraph(`Sample Size Notes: ${la.sampleSizeNotes}`);
    }

    // Conclusion
    addSectionHeader("Conclusion");
    addParagraph(report.conclusion);

    // Future Scope
    addSectionHeader("Future Scope");
    addBulletList(report.futureScope);

    // Appendix
    if (report.appendix) {
      addSectionHeader("Appendix");
      if (report.appendix.rawStatistics) addParagraph(`Raw Statistics: ${report.appendix.rawStatistics}`);
      if (report.appendix.methodologyNotes) addParagraph(`Methodology Notes: ${report.appendix.methodologyNotes}`);
      if (report.appendix.dataSourceNotes) addParagraph(`Data Source Notes: ${report.appendix.dataSourceNotes}`);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      addDecorativeElement(template.style);
      doc.setFillColor(primary[0], primary[1], primary[2]);
      doc.rect(0, pageHeight - 12, pageWidth, 12, 'F');
      doc.setFontSize(8); doc.setTextColor(255, 255, 255);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 5, { align: "center" });
      doc.text("Generated by SpaceForge AI", 14, pageHeight - 5);
      doc.text(template.name, pageWidth - 14, pageHeight - 5, { align: "right" });
    }

    doc.save(`${report.title.replace(/\s+/g, '_')}_${template.id}_Report.pdf`);
    toast.success(`PDF exported with ${template.name} template!`);
  };

  const handleTemplateSelect = (template: PDFTemplate) => {
    setSelectedTemplate(template);
    exportToPDF(template);
    setShowTemplateSelector(false);
  };

  const qualityGradeColor = (grade?: string) => {
    switch (grade) {
      case 'A': return 'text-green-500';
      case 'B': return 'text-blue-500';
      case 'C': return 'text-yellow-500';
      case 'D': return 'text-orange-500';
      case 'F': return 'text-red-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card className="premium-card">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-cyan-500 shadow-button">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-xl">AI Report Generator</CardTitle>
              <CardDescription className="mt-1">
                Generate comprehensive DS/DA reports with full statistical analysis
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch id="auto-update" checked={autoUpdate} onCheckedChange={setAutoUpdate} />
                <Label htmlFor="auto-update" className="text-sm flex items-center gap-1.5 cursor-pointer">
                  <RefreshCw className={`h-3.5 w-3.5 ${autoUpdate ? 'text-primary' : 'text-muted-foreground'}`} />
                  Auto-update
                </Label>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" /> Project Details
              </Label>
              <Textarea placeholder="Describe your project, requirements, context..." value={projectDetails} onChange={(e) => setProjectDetails(e.target.value)} className="min-h-[120px] bg-background resize-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" /> Project Goals
              </Label>
              <Textarea placeholder="Goals, expected outcomes, success metrics..." value={projectGoals} onChange={(e) => setProjectGoals(e.target.value)} className="min-h-[120px] bg-background resize-none" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="space-y-2 w-full sm:w-48">
              <Label className="text-sm font-medium">Project Status</Label>
              <Select value={projectStatus} onValueChange={setProjectStatus}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning"><span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Planning</span></SelectItem>
                  <SelectItem value="in-progress"><span className="flex items-center gap-2"><Zap className="h-4 w-4" /> In Progress</span></SelectItem>
                  <SelectItem value="review"><span className="flex items-center gap-2"><Eye className="h-4 w-4" /> Review</span></SelectItem>
                  <SelectItem value="completed"><span className="flex items-center gap-2"><CheckCircle className="h-4 w-4" /> Completed</span></SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={generateReport} disabled={isGenerating} size="lg" className="bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 shadow-button transition-all">
              {isGenerating ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>) : (<><Sparkles className="w-5 h-5 mr-2" />Generate Report</>)}
            </Button>
          </div>

          {isGenerating && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex flex-col items-center justify-center py-4 gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary animate-pulse" />
                  <span className="text-lg font-medium text-primary">Creating your professional DS/DA report</span>
                </div>
                <span className="text-sm text-muted-foreground">{progressLabel || "Please wait..."}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{progressLabel || "Processing..."}</span>
                <span className="font-medium">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generated Report */}
      {report && (
        <div className="space-y-5 animate-fade-in" ref={reportRef}>
          {/* Report Header */}
          <Card className="overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-cyan-500 to-primary" />
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 min-w-0">
                <div className="min-w-0 overflow-hidden flex-1">
                  <CardTitle className="text-2xl truncate">{report.title}</CardTitle>
                  <CardDescription className="mt-1.5 flex flex-wrap items-center gap-2">
                    <BarChart3 className="h-4 w-4 shrink-0" />
                    <span className="break-words">{dataset.name} â€¢ {report.datasetOverview.records.toLocaleString()} records â€¢ {report.datasetOverview.columns} columns</span>
                    {report.confidence != null && <Badge variant="outline" className="shrink-0">Confidence: {Math.round(report.confidence * 100)}%</Badge>}
                    {report.wordCount && <Badge variant="outline" className="shrink-0">~{report.wordCount} words</Badge>}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <Badge variant="outline" className="text-xs"><Calendar className="h-3 w-3 mr-1.5" />{new Date(report.generatedAt).toLocaleDateString()}</Badge>
                  <Button variant="outline" onClick={() => setShowTemplateSelector(true)} className="shadow-button"><Palette className="w-4 h-4 mr-2" />Templates</Button>
                  <Button onClick={() => exportToPDF()} className="shadow-button"><FileDown className="w-4 h-4 mr-2" />Export PDF</Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
            {/* Table of Contents Sidebar */}
            <div className="lg:col-span-1">
              <Card className="stat-card sticky top-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <ListTree className="h-4 w-4 text-primary" /> Table of Contents
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="h-[60vh]">
                    <nav className="space-y-0.5">
                      {TOC_SECTIONS.map(section => {
                        const hasContent = (() => {
                          switch (section.id) {
                            case "executive-summary": case "key-findings": case "recommendations": case "conclusion": return true;
                            case "key-metrics": return !!report.keyMetrics?.length;
                            case "data-quality": return !!report.dataQualityAssessment;
                            case "data-dictionary": return !!report.dataDictionary?.length;
                            case "descriptive-stats": return !!report.descriptiveStatistics?.length;
                            case "distribution": return !!report.distributionAnalysis?.length;
                            case "correlation-matrix": return !!report.correlationMatrix?.topCorrelations?.length;
                            case "situation-analysis": return !!report.situationAnalysis;
                            case "methodology": return !!report.methodology;
                            case "pattern-analysis": return !!report.patternAnalysis;
                            case "outlier-analysis": return !!report.outlierAnalysis;
                            case "trend-analysis": return !!report.trendAnalysis;
                            case "risk-assessment": return !!report.riskAssessment?.length;
                            case "opportunities": return !!report.opportunities?.length;
                            case "roadmap": return !!report.implementationRoadmap;
                            case "limitations": return !!report.limitationsAndAssumptions;
                            case "appendix": return !!report.appendix;
                            default: return false;
                          }
                        })();
                        if (!hasContent) return null;
                        const Icon = section.icon;
                        return (
                          <button key={section.id} onClick={() => scrollToSection(section.id)} className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors text-left">
                            <Icon className="h-3 w-3 shrink-0" />
                            <span className="truncate">{section.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3 space-y-5">
              {/* Executive Summary */}
              <Card className="stat-card" id="report-executive-summary">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Executive Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.executiveSummary}</p>
                </CardContent>
              </Card>

              {/* Enterprise Envelope (Databricks-grade structured output) */}
              {enterprise && (
                <div id="report-enterprise-briefing">
                  <EnterpriseInsightView
                    envelope={enterprise}
                    title="Executive Briefing"
                    module="full_report"
                  />
                </div>
              )}

              {/* Hypothesis â†’ Test â†’ Result blocks (Stats-First, no AI) */}
              {hypotheses.length > 0 && (
                <Card className="stat-card" id="report-hypothesis-tests">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <Search className="h-4 w-4 text-primary" /> Hypothesis Â· Test Â· Result ({hypotheses.length})
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Auto-generated scientific reasoning blocks backed by Welch's t-tests, Pearson correlations, and autocorrelation analysis.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <HypothesisBlock items={hypotheses} />
                  </CardContent>
                </Card>
              )}

              {/* Key Metrics */}
              {report.keyMetrics && report.keyMetrics.length > 0 && (
                <Card className="stat-card" id="report-key-metrics">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Key Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {report.keyMetrics.map((metric, idx) => (
                        <div key={idx} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                          <p className="text-xs text-muted-foreground">{metric.name}</p>
                          <p className="text-lg font-bold">{metric.value}</p>
                          <div className="flex items-center gap-1 text-xs">
                            {metric.trend === 'up' ? <ArrowUpRight className="h-3 w-3 text-green-500" /> : metric.trend === 'down' ? <ArrowDownRight className="h-3 w-3 text-red-500" /> : <Minus className="h-3 w-3 text-muted-foreground" />}
                            <span className={metric.trend === 'up' ? 'text-green-500' : metric.trend === 'down' ? 'text-red-500' : 'text-muted-foreground'}>{metric.change || 'stable'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Data Quality Assessment */}
              {report.dataQualityAssessment && (
                <Card className="stat-card" id="report-data-quality">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Gauge className="h-4 w-4 text-primary" /> Data Quality Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className={`text-3xl font-bold ${qualityGradeColor(report.dataQualityAssessment.qualityGrade)}`}>{report.dataQualityAssessment.qualityGrade || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Quality Grade</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold text-primary">{report.dataQualityAssessment.overallScore ?? 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Overall Score</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{report.dataQualityAssessment.completeness ?? 'N/A'}%</p>
                        <p className="text-xs text-muted-foreground">Completeness</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <p className="text-2xl font-bold">{report.dataQualityAssessment.duplicateRows ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Duplicate Rows</p>
                      </div>
                    </div>
                    {report.dataQualityAssessment.completeness != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs"><span className="text-muted-foreground">Completeness</span><span>{report.dataQualityAssessment.completeness}%</span></div>
                        <Progress value={report.dataQualityAssessment.completeness} className="h-2" />
                      </div>
                    )}
                    {report.dataQualityAssessment.missingValueSummary && report.dataQualityAssessment.missingValueSummary.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-2">Missing Values by Column</p>
                        <div className="space-y-1">
                          {report.dataQualityAssessment.missingValueSummary.filter(m => (m.missingPct ?? 0) > 0).map((m, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs">
                              <span className="w-24 truncate text-muted-foreground">{m.column}</span>
                              <div className="flex-1"><Progress value={m.missingPct ?? 0} className="h-1.5" /></div>
                              <span className="w-12 text-right">{m.missingPct ?? 0}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.dataQualityAssessment.summary && <p className="text-sm text-muted-foreground leading-relaxed">{report.dataQualityAssessment.summary}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Data Dictionary */}
              {report.dataDictionary && report.dataDictionary.length > 0 && (
                <Card className="stat-card" id="report-data-dictionary">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Data Dictionary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Column</TableHead>
                            <TableHead className="text-xs">Type</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-xs">Unique</TableHead>
                            <TableHead className="text-xs">Missing</TableHead>
                            <TableHead className="text-xs">Stats</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.dataDictionary.map((d, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs font-medium">{d.column}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{d.type}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{d.description}</TableCell>
                              <TableCell className="text-xs">{d.uniqueCount}</TableCell>
                              <TableCell className="text-xs">{d.missingPct ?? 0}%</TableCell>
                              <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">{d.statsSummary}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Descriptive Statistics */}
              {report.descriptiveStatistics && report.descriptiveStatistics.length > 0 && (
                <Card className="stat-card" id="report-descriptive-stats">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Hash className="h-4 w-4 text-primary" /> Descriptive Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Column</TableHead>
                            <TableHead className="text-xs">Mean</TableHead>
                            <TableHead className="text-xs">Median</TableHead>
                            <TableHead className="text-xs">Std</TableHead>
                            <TableHead className="text-xs">Min</TableHead>
                            <TableHead className="text-xs">Max</TableHead>
                            <TableHead className="text-xs">Q1</TableHead>
                            <TableHead className="text-xs">Q3</TableHead>
                            <TableHead className="text-xs">Skewness</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.descriptiveStatistics.map((s, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs font-medium">{s.column}</TableCell>
                              <TableCell className="text-xs">{n(s.mean)}</TableCell>
                              <TableCell className="text-xs">{n(s.median)}</TableCell>
                              <TableCell className="text-xs">{n(s.std)}</TableCell>
                              <TableCell className="text-xs">{n(s.min)}</TableCell>
                              <TableCell className="text-xs">{n(s.max)}</TableCell>
                              <TableCell className="text-xs">{n(s.q1)}</TableCell>
                              <TableCell className="text-xs">{n(s.q3)}</TableCell>
                              <TableCell className="text-xs">{n(s.skewness)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Distribution Analysis */}
              {report.distributionAnalysis && report.distributionAnalysis.length > 0 && (
                <Card className="stat-card" id="report-distribution">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><PieChart className="h-4 w-4 text-primary" /> Distribution Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {report.distributionAnalysis.map((d, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-2">
                          <p className="text-sm font-medium">{d.column}</p>
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="outline" className="text-xs">{d.skewnessInterpretation || 'N/A'}</Badge>
                            <Badge variant={d.normalityAssessment === 'normal' ? 'default' : 'outline'} className="text-xs">{d.normalityAssessment || 'N/A'}</Badge>
                            {(d.outlierCount ?? 0) > 0 && <Badge variant="destructive" className="text-xs">{d.outlierCount} outliers ({d.outlierPct}%)</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground">Skewness: {n(d.skewness)} | Kurtosis: {n(d.kurtosis)} ({d.kurtosisInterpretation || ''})</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Correlation Matrix */}
              {report.correlationMatrix?.topCorrelations && report.correlationMatrix.topCorrelations.length > 0 && (
                <Card className="stat-card" id="report-correlation-matrix">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Correlation Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {report.correlationMatrix.topCorrelations.map((c, i) => (
                        <div key={i} className="p-2.5 rounded-md border bg-muted/30 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{c.column1} â†” {c.column2}</span>
                            <Badge variant={c.strength === 'strong' ? 'default' : 'outline'} className="text-xs">r = {n(c.coefficient)}</Badge>
                            <Badge variant="outline" className="text-xs">{c.strength} {c.direction}</Badge>
                          </div>
                          <p className="text-muted-foreground mt-1 text-xs">{c.interpretation}</p>
                        </div>
                      ))}
                    </div>
                    {report.correlationMatrix.confoundingNotes && <p className="text-xs text-muted-foreground italic">{report.correlationMatrix.confoundingNotes}</p>}
                    {report.correlationMatrix.summary && <p className="text-sm text-muted-foreground">{report.correlationMatrix.summary}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Situation Analysis */}
              {report.situationAnalysis && (
                <Card className="stat-card" id="report-situation-analysis">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Layers className="h-4 w-4 text-primary" /> Situation Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.situationAnalysis}</p>
                  </CardContent>
                </Card>
              )}

              {/* Methodology */}
              {report.methodology && (
                <Card className="stat-card" id="report-methodology">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Settings className="h-4 w-4 text-primary" /> Methodology</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.methodology}</p>
                  </CardContent>
                </Card>
              )}

              {/* Key Findings */}
              <Card className="stat-card" id="report-key-findings">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Key Findings ({report.keyFindings.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {report.keyFindings.map((finding, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center"><CheckCircle className="h-3 w-3 text-green-500" /></div>
                        <span className="text-muted-foreground">{finding}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Pattern Analysis */}
              {report.patternAnalysis && (
                <Card className="stat-card" id="report-pattern-analysis">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Activity className="h-4 w-4 text-primary" /> Pattern Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {report.patternAnalysis.trends && report.patternAnalysis.trends.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5 text-primary" /> Trends</h4>
                        <div className="space-y-2">
                          {report.patternAnalysis.trends.map((t, i) => (
                            <div key={i} className="p-2.5 rounded-md border bg-muted/30 text-sm">
                              <span className="font-medium">{t.name}</span><span className="text-muted-foreground"> â€” {t.description}</span>
                              {t.magnitude && <Badge variant="outline" className="ml-2 text-xs">{t.magnitude}</Badge>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.patternAnalysis.anomalies && report.patternAnalysis.anomalies.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5 text-destructive" /> Anomalies</h4>
                        <div className="space-y-2">
                          {report.patternAnalysis.anomalies.map((a, i) => (
                            <div key={i} className="p-2.5 rounded-md border bg-muted/30 text-sm flex items-start gap-2">
                              <Badge variant={a.severity === 'critical' || a.severity === 'high' ? 'destructive' : 'outline'} className="text-xs shrink-0">{a.severity}</Badge>
                              <span className="text-muted-foreground">{a.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {report.patternAnalysis.segments && report.patternAnalysis.segments.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Segments</h4>
                        <div className="space-y-2">
                          {report.patternAnalysis.segments.map((s, i) => (
                            <div key={i} className="p-2.5 rounded-md border bg-muted/30 text-sm">
                              <span className="font-medium">{s.name}</span> <Badge variant="outline" className="text-xs ml-1">{s.size}</Badge>
                              <p className="text-muted-foreground mt-1">{s.characteristics}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Outlier Analysis */}
              {report.outlierAnalysis && (
                <Card className="stat-card" id="report-outlier-analysis">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-yellow-500" /> Outlier / Anomaly Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xl font-bold">{report.outlierAnalysis.totalOutliers ?? 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Total Outliers</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-xl font-bold">{report.outlierAnalysis.outlierRate ?? 'N/A'}%</p>
                        <p className="text-xs text-muted-foreground">Outlier Rate</p>
                      </div>
                      {report.outlierAnalysis.severityBreakdown && (
                        <>
                          <div className="text-center p-2 rounded-lg bg-red-500/10">
                            <p className="text-xl font-bold text-red-500">{(report.outlierAnalysis.severityBreakdown.critical ?? 0) + (report.outlierAnalysis.severityBreakdown.high ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">Critical+High</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
                            <p className="text-xl font-bold text-yellow-500">{(report.outlierAnalysis.severityBreakdown.medium ?? 0) + (report.outlierAnalysis.severityBreakdown.low ?? 0)}</p>
                            <p className="text-xs text-muted-foreground">Medium+Low</p>
                          </div>
                        </>
                      )}
                    </div>
                    {report.outlierAnalysis.rootCauseGroups && report.outlierAnalysis.rootCauseGroups.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Root Cause Groups</h4>
                        {report.outlierAnalysis.rootCauseGroups.map((g, i) => (
                          <div key={i} className="p-2.5 rounded-md border bg-muted/30 text-sm mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{g.groupName}</span>
                              <Badge variant="outline" className="text-xs">{g.count} anomalies</Badge>
                            </div>
                            <p className="text-muted-foreground mt-1 text-xs">{g.pattern}</p>
                            {g.businessImpact && <p className="text-xs text-yellow-600 mt-1">Impact: {g.businessImpact}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                    {report.outlierAnalysis.summary && <p className="text-sm text-muted-foreground">{report.outlierAnalysis.summary}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Trend & Forecast */}
              {report.trendAnalysis && (
                <Card className="stat-card" id="report-trend-analysis">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Trend & Forecast Analysis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <div className="flex items-center justify-center gap-1">
                          {report.trendAnalysis.trendDirection === 'increasing' ? <ArrowUpRight className="h-5 w-5 text-green-500" /> : report.trendAnalysis.trendDirection === 'decreasing' ? <ArrowDownRight className="h-5 w-5 text-red-500" /> : <Minus className="h-5 w-5 text-muted-foreground" />}
                          <p className="text-sm font-bold capitalize">{report.trendAnalysis.trendDirection}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Direction</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-sm font-bold">{report.trendAnalysis.trendColumn || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Column</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <Badge variant={report.trendAnalysis.seasonalityDetected ? 'default' : 'outline'} className="text-xs">{report.trendAnalysis.seasonalityDetected ? `Yes (${report.trendAnalysis.seasonalityPeriod})` : 'No'}</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Seasonality</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-muted/50">
                        <p className="text-sm font-bold">{report.trendAnalysis.changeRate || 'N/A'}</p>
                        <p className="text-xs text-muted-foreground">Change Rate</p>
                      </div>
                    </div>
                    {report.trendAnalysis.forecastSummary && <p className="text-sm text-muted-foreground">{report.trendAnalysis.forecastSummary}</p>}
                    {report.trendAnalysis.forecastedValues && report.trendAnalysis.forecastedValues.length > 0 && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs">Period</TableHead>
                              <TableHead className="text-xs">Forecast</TableHead>
                              <TableHead className="text-xs">CI Lower</TableHead>
                              <TableHead className="text-xs">CI Upper</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {report.trendAnalysis.forecastedValues.map((f, i) => (
                              <TableRow key={i}>
                                <TableCell className="text-xs">{f.period}</TableCell>
                                <TableCell className="text-xs font-medium">{n(f.value)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{n(f.ciLower)}</TableCell>
                                <TableCell className="text-xs text-muted-foreground">{n(f.ciUpper)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Risk Assessment */}
              {report.riskAssessment && report.riskAssessment.length > 0 && (
                <Card className="stat-card" id="report-risk-assessment">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Shield className="h-4 w-4 text-destructive" /> Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">Risk</TableHead>
                            <TableHead className="text-xs">Probability</TableHead>
                            <TableHead className="text-xs">Impact</TableHead>
                            <TableHead className="text-xs">Mitigation</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {report.riskAssessment.map((r, i) => (
                            <TableRow key={i}>
                              <TableCell className="text-xs text-muted-foreground">{r.risk}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{r.probability}</Badge></TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{r.impact}</Badge></TableCell>
                              <TableCell className="text-xs text-muted-foreground">{r.mitigation}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Opportunities */}
              {report.opportunities && report.opportunities.length > 0 && (
                <Card className="stat-card" id="report-opportunities">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Zap className="h-4 w-4 text-yellow-500" /> Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {report.opportunities.map((opp, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-muted/30 space-y-1">
                          <p className="text-sm font-medium">{opp.opportunity}</p>
                          <div className="flex flex-wrap gap-2">
                            {opp.value && <Badge variant="outline" className="text-xs">Value: {opp.value}</Badge>}
                            {opp.effort && <Badge variant="outline" className="text-xs">Effort: {opp.effort}</Badge>}
                            {opp.timeline && <Badge variant="outline" className="text-xs">{opp.timeline}</Badge>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              <Card className="stat-card" id="report-recommendations">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2"><Lightbulb className="h-4 w-4 text-yellow-500" /> Recommendations ({report.recommendations.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {report.recommendations.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm">
                        <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center"><AlertCircle className="h-3 w-3 text-primary" /></div>
                        <span className="text-muted-foreground">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Implementation Roadmap */}
              {report.implementationRoadmap && (
                <Card className="stat-card" id="report-roadmap">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Rocket className="h-4 w-4 text-primary" /> Implementation Roadmap</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[report.implementationRoadmap.phase1, report.implementationRoadmap.phase2, report.implementationRoadmap.phase3].filter(Boolean).map((phase, i) => (
                        <div key={i} className="p-3 rounded-lg border bg-muted/30">
                          <h4 className="text-sm font-medium mb-2">Phase {i + 1}: {phase?.name}</h4>
                          {phase?.actions && <ul className="space-y-1 mb-2">{phase.actions.map((a, j) => (<li key={j} className="flex items-start gap-2 text-sm text-muted-foreground"><div className="w-1.5 h-1.5 mt-2 rounded-full bg-primary flex-shrink-0" />{a}</li>))}</ul>}
                          {phase?.milestones && phase.milestones.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{phase.milestones.map((m, j) => <Badge key={j} variant="secondary" className="text-xs">{m}</Badge>)}</div>}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Limitations & Assumptions */}
              {report.limitationsAndAssumptions && (
                <Card className="stat-card" id="report-limitations">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-medium flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> Limitations & Assumptions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.limitationsAndAssumptions.dataLimitations?.length ? (
                      <div>
                        <p className="text-xs font-medium mb-1">Data Limitations</p>
                        <ul className="space-y-1">{report.limitationsAndAssumptions.dataLimitations.map((l, i) => <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><div className="w-1 h-1 mt-1.5 rounded-full bg-muted-foreground shrink-0" />{l}</li>)}</ul>
                      </div>
                    ) : null}
                    {report.limitationsAndAssumptions.statisticalAssumptions?.length ? (
                      <div>
                        <p className="text-xs font-medium mb-1">Statistical Assumptions</p>
                        <ul className="space-y-1">{report.limitationsAndAssumptions.statisticalAssumptions.map((a, i) => <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><div className="w-1 h-1 mt-1.5 rounded-full bg-muted-foreground shrink-0" />{a}</li>)}</ul>
                      </div>
                    ) : null}
                    {report.limitationsAndAssumptions.confidenceCaveats?.length ? (
                      <div>
                        <p className="text-xs font-medium mb-1">Confidence Caveats</p>
                        <ul className="space-y-1">{report.limitationsAndAssumptions.confidenceCaveats.map((c, i) => <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground"><div className="w-1 h-1 mt-1.5 rounded-full bg-muted-foreground shrink-0" />{c}</li>)}</ul>
                      </div>
                    ) : null}
                    {report.limitationsAndAssumptions.sampleSizeNotes && <p className="text-xs text-muted-foreground italic">{report.limitationsAndAssumptions.sampleSizeNotes}</p>}
                  </CardContent>
                </Card>
              )}

              {/* Conclusion */}
              <Card className="stat-card" id="report-conclusion">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-medium flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" /> Conclusion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{report.conclusion}</p>
                </CardContent>
              </Card>

              {/* Appendix */}
              {report.appendix && (
                <Card className="stat-card" id="report-appendix">
                  <Collapsible open={appendixOpen} onOpenChange={setAppendixOpen}>
                    <CardHeader className="pb-3">
                      <CollapsibleTrigger className="w-full">
                        <CardTitle className="text-base font-medium flex items-center gap-2 cursor-pointer">
                          <BookOpen className="h-4 w-4 text-muted-foreground" /> Appendix
                          {appendixOpen ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
                        </CardTitle>
                      </CollapsibleTrigger>
                    </CardHeader>
                    <CollapsibleContent>
                      <CardContent className="space-y-3">
                        {report.appendix.rawStatistics && <div><p className="text-xs font-medium mb-1">Raw Statistics</p><p className="text-xs text-muted-foreground whitespace-pre-line">{report.appendix.rawStatistics}</p></div>}
                        {report.appendix.methodologyNotes && <div><p className="text-xs font-medium mb-1">Methodology Notes</p><p className="text-xs text-muted-foreground whitespace-pre-line">{report.appendix.methodologyNotes}</p></div>}
                        {report.appendix.dataSourceNotes && <div><p className="text-xs font-medium mb-1">Data Source Notes</p><p className="text-xs text-muted-foreground whitespace-pre-line">{report.appendix.dataSourceNotes}</p></div>}
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar with Dataset Overview, Objectives, Future Scope removed from grid â€” now in TOC column */}
        </div>
      )}

      <PDFTemplateSelector open={showTemplateSelector} onOpenChange={setShowTemplateSelector} onSelectTemplate={handleTemplateSelect} selectedTemplateId={selectedTemplate.id} />
    </div>
  );
};

// Helper to format numbers
function n(val: number | undefined | null): string {
  if (val == null) return 'N/A';
  if (Number.isInteger(val)) return val.toLocaleString();
  return Number(val).toFixed(2);
}

export default ReportGenerator;
