import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Check,
  Clock,
  SkipForward,
  Loader2,
  Download,
  Sparkles,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { backend } from "@/platform";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { renderGlossaryAndWorkflow } from "@/lib/pdfGlossaryRenderer";
import type { CognitiveMode } from "@/components/data-agent/CognitiveModeSelector";

interface ReportSection {
  id: string;
  number: number;
  title: string;
  description: string;
  status: "pending" | "generating" | "generated" | "skipped";
  content?: string;
}

interface ReportForgeProps {
  mode: CognitiveMode;
  data: Record<string, unknown>[];
  columns: string[];
  datasetName: string;
  open: boolean;
  onClose: () => void;
}

const reportTemplates: Record<CognitiveMode, Omit<ReportSection, "status" | "content">[]> = {
  analyst: [
    { id: "exec_summary", number: 1, title: "Executive Summary", description: "High-level overview of key findings and recommendations" },
    { id: "data_dict", number: 2, title: "Data Dictionary", description: "Column definitions, types, and coverage statistics" },
    { id: "descriptive", number: 3, title: "Descriptive Statistics", description: "Mean, median, mode, std dev, quartiles for all numeric columns" },
    { id: "distribution", number: 4, title: "Distribution Analysis", description: "Histograms, skewness, kurtosis, normality tests" },
    { id: "correlation", number: 5, title: "Correlation Matrix", description: "Pearson/Spearman correlations with significance levels" },
    { id: "outlier", number: 6, title: "Outlier Analysis", description: "IQR and z-score based anomaly detection" },
    { id: "trend", number: 7, title: "Trend & Forecast", description: "Time-series decomposition with predictive modeling" },
    { id: "findings", number: 8, title: "Key Findings", description: "Top insights ranked by statistical significance" },
    { id: "risk", number: 9, title: "Risk Assessment", description: "Data quality risks and analytical confidence levels" },
    { id: "recommendations", number: 10, title: "Recommendations", description: "Actionable next steps based on analysis" },
    { id: "methodology", number: 11, title: "Methodology", description: "Statistical methods, tools, and assumptions used" },
    { id: "appendix", number: 12, title: "Appendix", description: "Raw tables, additional charts, and supplementary data" },
  ],
  scientist: [
    { id: "abstract", number: 1, title: "Abstract", description: "Concise summary of research objectives and key results" },
    { id: "literature", number: 2, title: "Literature Context", description: "Related work and theoretical framework" },
    { id: "hypothesis", number: 3, title: "Hypothesis", description: "Formal hypothesis statements with Hâ‚€ and Hâ‚" },
    { id: "methodology", number: 4, title: "Methodology", description: "Research design, sampling, and statistical methods" },
    { id: "experiment", number: 5, title: "Experiment Design", description: "Variables, controls, sample size, power analysis" },
    { id: "feature_eng", number: 6, title: "Feature Engineering", description: "Feature selection, PCA, dimensionality reduction" },
    { id: "results", number: 7, title: "Results", description: "Statistical test outcomes with p-values and effect sizes" },
    { id: "nlp_analysis", number: 8, title: "NLP Analysis", description: "Text mining, sentiment, topic modeling results" },
    { id: "causal", number: 9, title: "Causal Inference", description: "DAG analysis, instrumental variables, propensity scores" },
    { id: "discussion", number: 10, title: "Discussion", description: "Interpretation of results, limitations, and implications" },
    { id: "trust_layer", number: 11, title: "Trust & Explainability", description: "Bias audit, confidence scores, model interpretability" },
    { id: "conclusion", number: 12, title: "Conclusion", description: "Summary of findings and future research directions" },
    { id: "appendix", number: 13, title: "Appendix", description: "Raw outputs, code snippets, additional visualizations" },
  ],
  founder: [
    { id: "exec_summary", number: 1, title: "Executive Summary", description: "Strategic overview for leadership and board" },
    { id: "biz_kpis", number: 2, title: "Business KPIs", description: "CAC, LTV, churn rate, burn rate, runway metrics" },
    { id: "revenue", number: 3, title: "Revenue Analysis", description: "Revenue trends, cohort analysis, MRR/ARR breakdown" },
    { id: "risk", number: 4, title: "Risk Assessment", description: "Market, operational, and financial risk indicators" },
    { id: "competitive", number: 5, title: "Competitive Landscape", description: "Market positioning and competitive advantage analysis" },
    { id: "scenario", number: 6, title: "Scenario Simulation", description: "Best/worst/base case projections with Monte Carlo" },
    { id: "investor", number: 7, title: "Investor Metrics", description: "Unit economics, growth rate, TAM/SAM/SOM" },
    { id: "swot", number: 8, title: "SWOT Analysis", description: "Strengths, weaknesses, opportunities, threats" },
    { id: "action_plan", number: 9, title: "Action Plan", description: "Prioritized strategic initiatives with expected ROI" },
    { id: "appendix", number: 10, title: "Appendix", description: "Supporting data tables and detailed calculations" },
  ],
  organization: [
    { id: "exec_summary", number: 1, title: "Executive Summary", description: "Organizational performance overview" },
    { id: "data_dict", number: 2, title: "Data Dictionary", description: "Column definitions, types, and coverage statistics" },
    { id: "biz_kpis", number: 3, title: "Business KPIs", description: "CAC, LTV, churn rate, burn rate, runway metrics" },
    { id: "descriptive", number: 4, title: "Descriptive Statistics", description: "Mean, median, mode, std dev, quartiles" },
    { id: "revenue", number: 5, title: "Revenue Analysis", description: "Revenue trends, cohort analysis, MRR/ARR breakdown" },
    { id: "risk", number: 6, title: "Risk Assessment", description: "Market, operational, and financial risk indicators" },
    { id: "correlation", number: 7, title: "Correlation Matrix", description: "Pearson/Spearman correlations with significance" },
    { id: "scenario", number: 8, title: "Scenario Simulation", description: "Best/worst/base case projections" },
    { id: "investor", number: 9, title: "Investor Metrics", description: "Unit economics, growth rate, TAM/SAM/SOM" },
    { id: "findings", number: 10, title: "Key Findings", description: "Top insights ranked by significance" },
    { id: "recommendations", number: 11, title: "Recommendations", description: "Actionable next steps based on analysis" },
    { id: "action_plan", number: 12, title: "Action Plan", description: "Prioritized strategic initiatives with expected ROI" },
    { id: "appendix", number: 13, title: "Appendix", description: "Supporting data tables and detailed calculations" },
  ],
};

const modeLabels: Record<CognitiveMode, string> = {
  analyst: "Data Analysis Report",
  scientist: "Research Report",
  founder: "Founder Intelligence Report",
  organization: "Organization Intelligence Report",
};

const ReportForge = ({ mode, data, columns, datasetName, open, onClose }: ReportForgeProps) => {
  const [sections, setSections] = useState<ReportSection[]>(() =>
    reportTemplates[mode].map((s) => ({ ...s, status: "pending" as const }))
  );
  const [generating, setGenerating] = useState(false);

  // Reset sections when mode changes
  useEffect(() => {
    setSections(reportTemplates[mode].map((s) => ({ ...s, status: "pending" as const })));
  }, [mode]);

  const generatedCount = sections.filter((s) => s.status === "generated").length;
  const progress = Math.round((generatedCount / sections.length) * 100);

  const generateSection = async (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, status: "generating" } : s))
    );

    try {
      const section = sections.find((s) => s.id === sectionId);
      if (!section) return;

      const sampleData = data.slice(0, 30);

      // Build a data summary for context
      const numericCols = columns.filter((col) => {
        const vals = sampleData.map((r) => r[col]).filter((v) => !isNaN(Number(v)));
        return vals.length > sampleData.length * 0.5;
      });
      const dataSummary = numericCols.slice(0, 5).map((col) => {
        const vals = data.map((r) => Number(r[col])).filter((v) => !isNaN(v));
        const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
        const min = Math.min(...vals);
        const max = Math.max(...vals);
        return `${col}: avg=${avg.toFixed(2)}, min=${min}, max=${max}, count=${vals.length}`;
      }).join("; ");

      const { data: result, error } = await backend.functions.invoke("data-agent", {
        body: {
          message: `You are a professional data analyst writing a report section. Generate the "${section.title}" section for a ${modeLabels[mode]}.

Dataset: "${datasetName}" with ${data.length} rows and columns: [${columns.join(", ")}].
Data summary: ${dataSummary || "No numeric summary available."}

Section purpose: ${section.description}

Write 3-5 paragraphs of professional analysis. Use specific numbers from the data summary. Use plain text (no markdown). Be thorough but concise.`,
          data: sampleData,
          columns,
          datasetName,
        },
      });

      if (error) throw error;
      if (result?.error) throw new Error(typeof result.error === "string" ? result.error : "AI service error");

      const content = result?.choices?.[0]?.message?.content || result?.message || `Analysis for ${section.title} based on ${datasetName} dataset with ${data.length} records across ${columns.length} variables.`;

      // Clean markdown artifacts
      const cleanContent = content
        .replace(/^#+\s*/gm, "")
        .replace(/\*\*/g, "")
        .replace(/\*/g, "")
        .replace(/```[\s\S]*?```/g, "")
        .trim();

      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, status: "generated", content: cleanContent } : s))
      );
      toast.success(`Generated: ${section.title}`);
    } catch (err) {
      console.error("Section generation error:", err);
      setSections((prev) =>
        prev.map((s) => (s.id === sectionId ? { ...s, status: "pending" } : s))
      );
      toast.error(`Failed to generate ${sectionId}`);
    }
  };

  const generateFullReport = async () => {
    setGenerating(true);
    const pendingSections = sections.filter(
      (s) => s.status !== "generated" && s.status !== "skipped"
    );
    for (const section of pendingSections) {
      await generateSection(section.id);
      // Small delay between API calls
      await new Promise((r) => setTimeout(r, 300));
    }
    setGenerating(false);
    toast.success("Full report generated!");
  };

  const skipSection = (sectionId: string) => {
    setSections((prev) =>
      prev.map((s) => (s.id === sectionId ? { ...s, status: "skipped" } : s))
    );
  };

  const handleExportPdf = () => {
    try {
      const generatedSections = sections.filter((s) => s.status === "generated" && s.content);
      if (generatedSections.length === 0) {
        toast.error("No sections generated yet. Generate at least one section first.");
        return;
      }

      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let y = 0;

      const checkPage = (needed: number) => {
        if (y + needed > pageHeight - 25) {
          pdf.addPage();
          y = 20;
          // Top accent bar
          pdf.setFillColor(99, 102, 241);
          pdf.rect(0, 0, pageWidth, 3, "F");
          y = 16;
        }
      };

      // â”€â”€ COVER HEADER â”€â”€
      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 50, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont("helvetica", "bold");
      const titleLines = pdf.splitTextToSize(modeLabels[mode], pageWidth - margin * 2);
      let ty = 24;
      for (const line of titleLines) {
        pdf.text(line, margin, ty);
        ty += 10;
      }
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Dataset: ${datasetName}`, margin, ty + 2);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 50, ty + 2);

      y = 62;

      // â”€â”€ METADATA â”€â”€
      pdf.setFillColor(245, 245, 250);
      pdf.rect(margin, y - 5, pageWidth - margin * 2, 16, "F");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 120);
      pdf.text(`Rows: ${data.length} | Columns: ${columns.length} | Sections: ${generatedSections.length}/${sections.length}`, margin + 4, y + 3);
      pdf.text(`Mode: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`, pageWidth - margin - 40, y + 3);
      y += 20;

      // â”€â”€ TABLE OF CONTENTS â”€â”€
      pdf.setTextColor(99, 102, 241);
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Table of Contents", margin, y);
      y += 10;

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(50, 50, 60);
      for (const section of generatedSections) {
        pdf.text(`${String(section.number).padStart(2, "0")}. ${section.title}`, margin + 4, y);
        y += 6;
      }
      y += 10;

      // â”€â”€ SECTIONS â”€â”€
      for (const section of generatedSections) {
        checkPage(40);

        // Section header with accent bar
        pdf.setFillColor(99, 102, 241);
        pdf.rect(margin, y - 4, 3, 14, "F");
        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${String(section.number).padStart(2, "0")}. ${section.title}`, margin + 8, y + 5);
        y += 16;

        // Section content
        pdf.setTextColor(40, 40, 50);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");

        const content = section.content || "";
        const paragraphs = content.split(/\n\n|\n/).filter((p) => p.trim());

        for (const para of paragraphs) {
          const lines = pdf.splitTextToSize(para.trim(), pageWidth - margin * 2 - 8);
          for (const line of lines) {
            checkPage(6);
            pdf.text(line, margin + 8, y);
            y += 5;
          }
          y += 3;
        }

        // Divider
        y += 4;
        checkPage(8);
        pdf.setDrawColor(220, 220, 230);
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 10;
      }

      // â”€â”€ GLOSSARY & WORKFLOW APPENDIX â”€â”€
      renderGlossaryAndWorkflow(pdf);

      // â”€â”€ DISCLAIMER â”€â”€
      pdf.addPage();
      y = margin;
      checkPage(30);
      y += 4;
      pdf.setFillColor(245, 245, 250);
      pdf.rect(margin, y - 4, pageWidth - margin * 2, 20, "F");
      pdf.setTextColor(130, 130, 140);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      pdf.text("Disclaimer: This report was generated using automated analysis. Validate findings with domain expertise.", margin + 4, y + 3);
      pdf.text("Â© SpaceForge Analytics Platform â€” Confidential", margin + 4, y + 10);

      // â”€â”€ PAGE NUMBERS â”€â”€
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(7);
        pdf.setTextColor(150, 150, 160);
        pdf.text(`SpaceForge Report â€” Page ${i} of ${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
      }

      const filename = `${modeLabels[mode].replace(/\s+/g, "_").toLowerCase()}_${datasetName.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("PDF downloaded successfully!");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF. Check console for details.");
    }
  };

  const statusIcon = (status: ReportSection["status"]) => {
    switch (status) {
      case "generated": return <Check className="w-3.5 h-3.5 text-emerald-500" />;
      case "generating": return <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />;
      case "skipped": return <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />;
      default: return <Clock className="w-3.5 h-3.5 text-muted-foreground/50" />;
    }
  };

  if (!open) return null;

  return (
    <div
      className={cn(
        "fixed right-0 top-16 h-[calc(100vh-4rem)] w-80 z-50",
        "bg-card border-l border-border shadow-lg",
        "flex flex-col transition-transform duration-300",
        open ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Report Forge</h3>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-secondary">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 py-3 border-b border-border">
        <Badge variant="secondary" className="text-xs">
          {modeLabels[mode]}
        </Badge>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">
            {generatedCount}/{sections.length}
          </span>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-1">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => {
                if (section.status === "pending") generateSection(section.id);
              }}
              disabled={section.status === "generating"}
              className={cn(
                "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                "hover:bg-secondary/50 group",
                section.status === "generated" && "bg-emerald-500/5",
                section.status === "skipped" && "opacity-50"
              )}
            >
              <div className="mt-0.5 shrink-0">
                {statusIcon(section.status)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {String(section.number).padStart(2, "0")}
                  </span>
                  <span className={cn(
                    "text-xs font-medium truncate",
                    section.status === "generated" ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {section.title}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-2">
                  {section.description}
                </p>
              </div>
              {section.status === "pending" && (
                <button
                  onClick={(e) => { e.stopPropagation(); skipSection(section.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-secondary rounded shrink-0"
                  title="Skip section"
                >
                  <SkipForward className="w-3 h-3 text-muted-foreground" />
                </button>
              )}
            </button>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t border-border space-y-2">
        <Button
          onClick={generateFullReport}
          disabled={generating || generatedCount === sections.length}
          className="w-full"
          size="sm"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" /> Generating...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5 mr-2" /> Generate Full Report</>
          )}
        </Button>
        {generatedCount > 0 && (
          <Button
            onClick={handleExportPdf}
            variant="outline"
            className="w-full"
            size="sm"
          >
            <Download className="w-3.5 h-3.5 mr-2" /> Download PDF ({generatedCount} sections)
          </Button>
        )}
      </div>
    </div>
  );
};

export default ReportForge;
