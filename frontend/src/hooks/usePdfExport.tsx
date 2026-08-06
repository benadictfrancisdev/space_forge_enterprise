import { useCallback } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface ExportOptions {
  title: string;
  subtitle?: string;
  datasetName?: string;
  sections?: {
    title: string;
    content: string | string[];
    type?: "text" | "list" | "table";
    tableData?: { headers: string[]; rows: string[][] };
  }[];
  statistics?: Record<string, string | number>;
  insights?: { title: string; description: string; importance?: string }[];
  recommendations?: string[];
  footer?: string;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
  sentiment?: { sentiment: string };
}

interface ChartExportData {
  type: string;
  title: string;
  data?: Record<string, unknown>[];
  config?: Record<string, unknown>;
}

// Default colors (indigo theme)
const DEFAULT_COLORS = {
  primary: [99, 102, 241] as [number, number, number],
  secondary: [129, 140, 248] as [number, number, number],
  accent: [199, 210, 254] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  textLight: [100, 116, 139] as [number, number, number],
  background: [248, 250, 252] as [number, number, number],
  headerBg: [99, 102, 241] as [number, number, number],
};

export const usePdfExport = () => {
  const exportToPdf = useCallback((options: ExportOptions, templateColors?: typeof DEFAULT_COLORS) => {
    try {
      const colors = templateColors || DEFAULT_COLORS;
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      const checkNewPage = (height: number) => {
        if (yPosition + height > pageHeight - margin) {
          pdf.addPage();
          yPosition = margin;
          // Add thin top bar on continuation pages
          pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          pdf.rect(0, 0, pageWidth, 4, "F");
          yPosition = 14;
          return true;
        }
        return false;
      };

      const drawDivider = () => {
        pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPosition, pageWidth - margin, yPosition);
        yPosition += 8;
      };

      const drawSectionHeader = (title: string) => {
        checkNewPage(25);
        // Colored sidebar stripe
        pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.rect(margin, yPosition - 4, 3, 16, "F");
        
        pdf.setTextColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.setFontSize(13);
        pdf.setFont("helvetica", "bold");
        pdf.text(title, margin + 8, yPosition + 5);
        yPosition += 16;
      };

      // ─── HEADER ───
      pdf.setFillColor(colors.headerBg[0], colors.headerBg[1], colors.headerBg[2]);
      const titleLines = pdf.splitTextToSize(options.title, pageWidth - margin * 2 - 10);
      const headerHeight = Math.max(40, 20 + titleLines.length * 9 + (options.subtitle ? 12 : 0));
      pdf.rect(0, 0, pageWidth, headerHeight, "F");

      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      let titleY = 22;
      for (const line of titleLines) {
        pdf.text(line, margin, titleY);
        titleY += 9;
      }

      if (options.subtitle) {
        pdf.setFontSize(10);
        pdf.setFont("helvetica", "normal");
        const subtitleLines = pdf.splitTextToSize(options.subtitle, pageWidth - margin * 2 - 10);
        for (const sl of subtitleLines) {
          pdf.text(sl, margin, titleY);
          titleY += 5;
        }
      }

      yPosition = headerHeight + 12;

      // ─── METADATA BAR ───
      if (options.datasetName) {
        pdf.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        pdf.rect(margin, yPosition - 6, pageWidth - margin * 2, 18, "F");
        pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        pdf.setFontSize(9);
        pdf.text(`Dataset: ${options.datasetName}`, margin + 4, yPosition + 2);
        pdf.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - margin - 60, yPosition + 2);
        pdf.text(`Report Type: Data Analysis`, margin + 4, yPosition + 9);
        yPosition += 20;
      }

      // ─── METHODOLOGY SECTION ───
      checkNewPage(50);
      drawSectionHeader("Methodology & Data Overview");
      pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      const methodologyText = [
        `This report was generated using an automated Data Science & Analytics pipeline. The analysis follows`,
        `industry-standard frameworks including Exploratory Data Analysis (EDA), statistical hypothesis testing,`,
        `and machine learning-based pattern recognition. Data quality was assessed prior to analysis, and`,
        `findings are presented with confidence levels where applicable.`,
        ``,
        `Analysis Approach: Comprehensive multi-dimensional analysis with cross-validation`,
        `Data Quality: Pre-processed and validated before analysis`,
        `Framework: CRISP-DM (Cross-Industry Standard Process for Data Mining)`,
      ];
      for (const line of methodologyText) {
        pdf.text(line, margin + 8, yPosition);
        yPosition += 5;
      }
      yPosition += 6;
      drawDivider();

      // ─── EXECUTIVE SUMMARY BOX ───
      if (options.insights && options.insights.length > 0) {
        checkNewPage(60);
        drawSectionHeader("Executive Summary");
        
        // Highlight box
        pdf.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
        pdf.setDrawColor(colors.primary[0], colors.primary[1], colors.primary[2]);
        pdf.setLineWidth(0.8);
        const topInsights = options.insights.slice(0, 3);
        const boxHeight = topInsights.length * 18 + 10;
        pdf.roundedRect(margin, yPosition - 4, pageWidth - margin * 2, boxHeight, 2, 2, "FD");
        
        pdf.setFontSize(9);
        for (const insight of topInsights) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          const prefix = insight.importance ? `[${insight.importance.toUpperCase()}] ` : "● ";
          pdf.text(prefix + insight.title, margin + 6, yPosition + 4);
          yPosition += 6;
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          const descLines = pdf.splitTextToSize(insight.description, pageWidth - margin * 2 - 16);
          pdf.text(descLines.slice(0, 2), margin + 6, yPosition + 2);
          yPosition += descLines.slice(0, 2).length * 5 + 6;
        }
        yPosition += 8;
        drawDivider();
      }

      // ─── SECTIONS ───
      if (options.sections) {
        for (const section of options.sections) {
          checkNewPage(30);
          drawSectionHeader(section.title);

          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");

          if (section.type === "table" && section.tableData) {
            autoTable(pdf, {
              startY: yPosition,
              head: [section.tableData.headers],
              body: section.tableData.rows,
              margin: { left: margin, right: margin },
              styles: { fontSize: 8, cellPadding: 3.5, lineColor: [230, 230, 235] as any, lineWidth: 0.3 },
              headStyles: { fillColor: colors.primary as any, textColor: 255, fontStyle: "bold" },
              alternateRowStyles: { fillColor: colors.background as any },
            });
            yPosition = (pdf as any).lastAutoTable.finalY + 10;
          } else if (section.type === "list" && Array.isArray(section.content)) {
            for (const item of section.content) {
              checkNewPage(8);
              const lines = pdf.splitTextToSize(`▸ ${item}`, pageWidth - margin * 2 - 10);
              pdf.text(lines, margin + 8, yPosition);
              yPosition += lines.length * 5 + 3;
            }
            yPosition += 5;
          } else {
            const content = Array.isArray(section.content) ? section.content.join("\n") : section.content;
            const lines = pdf.splitTextToSize(content, pageWidth - margin * 2 - 8);
            for (const line of lines) {
              checkNewPage(6);
              pdf.text(line, margin + 8, yPosition);
              yPosition += 5;
            }
            yPosition += 8;
          }
          drawDivider();
        }
      }

      // ─── STATISTICS ───
      if (options.statistics && Object.keys(options.statistics).length > 0) {
        checkNewPage(40);
        drawSectionHeader("Key Performance Metrics");

        const statsData = Object.entries(options.statistics).map(([key, value]) => [
          key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
          String(value),
        ]);

        autoTable(pdf, {
          startY: yPosition,
          head: [["Metric", "Value"]],
          body: statsData,
          margin: { left: margin, right: margin },
          styles: { fontSize: 9, cellPadding: 4, lineColor: [230, 230, 235] as any, lineWidth: 0.3 },
          headStyles: { fillColor: colors.primary as any, textColor: 255 },
          columnStyles: { 0: { fontStyle: "bold", cellWidth: 80 } },
          alternateRowStyles: { fillColor: colors.background as any },
        });
        yPosition = (pdf as any).lastAutoTable.finalY + 10;
        drawDivider();
      }

      // ─── DETAILED INSIGHTS ───
      if (options.insights && options.insights.length > 3) {
        checkNewPage(30);
        drawSectionHeader("Detailed Findings & Analysis");

        for (const insight of options.insights.slice(3)) {
          checkNewPage(20);
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.setFontSize(10);
          pdf.setFont("helvetica", "bold");
          const titleText = insight.importance ? `[${insight.importance.toUpperCase()}] ${insight.title}` : insight.title;
          pdf.text(titleText, margin + 8, yPosition);
          yPosition += 6;

          pdf.setFont("helvetica", "normal");
          pdf.setFontSize(9);
          pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
          const descLines = pdf.splitTextToSize(insight.description, pageWidth - margin * 2 - 12);
          pdf.text(descLines, margin + 8, yPosition);
          yPosition += descLines.length * 5 + 8;
        }
        drawDivider();
      }

      // ─── RECOMMENDATIONS ───
      if (options.recommendations && options.recommendations.length > 0) {
        checkNewPage(30);
        drawSectionHeader("Strategic Recommendations");

        pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
        pdf.setFontSize(9);
        pdf.setFont("helvetica", "normal");

        options.recommendations.forEach((rec, index) => {
          checkNewPage(14);
          // Numbered circle
          pdf.setFillColor(colors.primary[0], colors.primary[1], colors.primary[2]);
          pdf.circle(margin + 6, yPosition - 1.5, 3.5, "F");
          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(7);
          pdf.setFont("helvetica", "bold");
          pdf.text(String(index + 1), margin + 4.8, yPosition);
          
          pdf.setTextColor(colors.text[0], colors.text[1], colors.text[2]);
          pdf.setFontSize(9);
          pdf.setFont("helvetica", "normal");
          const lines = pdf.splitTextToSize(rec, pageWidth - margin * 2 - 18);
          pdf.text(lines, margin + 14, yPosition);
          yPosition += lines.length * 5 + 5;
        });
      }

      // ─── DISCLAIMER ───
      checkNewPage(30);
      yPosition += 8;
      pdf.setFillColor(colors.background[0], colors.background[1], colors.background[2]);
      pdf.rect(margin, yPosition - 4, pageWidth - margin * 2, 22, "F");
      pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "italic");
      pdf.text("Disclaimer: This report was generated using automated data analysis. Findings should be validated", margin + 4, yPosition + 3);
      pdf.text("with domain expertise before making business decisions. Statistical significance does not imply causation.", margin + 4, yPosition + 9);
      pdf.text("© SpaceForge Analytics Platform — Confidential", margin + 4, yPosition + 15);

      // ─── PAGE FOOTERS ───
      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        // Footer line
        pdf.setDrawColor(colors.accent[0], colors.accent[1], colors.accent[2]);
        pdf.setLineWidth(0.3);
        pdf.line(margin, pageHeight - 16, pageWidth - margin, pageHeight - 16);
        
        pdf.setFontSize(7);
        pdf.setTextColor(colors.textLight[0], colors.textLight[1], colors.textLight[2]);
        pdf.text(
          `SpaceForge Analytics Report — Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
        if (options.footer) {
          pdf.text(options.footer, margin, pageHeight - 10);
        }
      }

      const filename = `${options.title.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("PDF exported successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF. Please try again.");
    }
  }, []);

  // Export chat conversation to PDF
  const exportChatToPdf = useCallback((messages: ChatMessage[], datasetName: string, sessionTitle?: string) => {
    try {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      const checkNewPage = (height: number) => {
        if (yPosition + height > pageHeight - margin - 15) {
          pdf.addPage();
          yPosition = margin;
          return true;
        }
        return false;
      };

      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 45, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont("helvetica", "bold");
      pdf.text("Conversation History", margin, 22);

      pdf.setFontSize(11);
      pdf.setFont("helvetica", "normal");
      const chatTitle = sessionTitle || `Chat with ${datasetName}`;
      const chatTitleLines = pdf.splitTextToSize(chatTitle, pageWidth - margin * 2 - 10);
      pdf.text(chatTitleLines[0], margin, 32);
      pdf.text(`${messages.length} messages`, margin, 40);

      yPosition = 55;

      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(9);
      pdf.text(`Dataset: ${datasetName}`, margin, yPosition);
      pdf.text(`Exported: ${new Date().toLocaleString()}`, pageWidth - margin - 55, yPosition);
      yPosition += 15;

      pdf.setDrawColor(200, 200, 200);
      pdf.line(margin, yPosition - 5, pageWidth - margin, yPosition - 5);

      for (const message of messages) {
        checkNewPage(30);
        const isUser = message.role === "user";
        const bubbleColor = isUser ? [99, 102, 241] : [240, 240, 245];
        const textColor = isUser ? [255, 255, 255] : [40, 40, 40];
        
        pdf.setFontSize(9);
        pdf.setTextColor(120, 120, 120);
        const roleLabel = isUser ? "You" : "AI Assistant";
        const timestamp = message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "";
        pdf.text(`${roleLabel} ${timestamp ? `• ${timestamp}` : ""}`, isUser ? pageWidth - margin - 40 : margin, yPosition);
        yPosition += 6;

        const maxWidth = pageWidth - margin * 2 - 20;
        pdf.setFontSize(10);
        const contentLines = pdf.splitTextToSize(message.content, maxWidth);
        const bubbleHeight = contentLines.length * 5 + 10;
        const bubbleX = isUser ? pageWidth - margin - maxWidth - 10 : margin;
        
        pdf.setFillColor(bubbleColor[0], bubbleColor[1], bubbleColor[2]);
        pdf.roundedRect(bubbleX, yPosition - 3, maxWidth + 10, bubbleHeight, 3, 3, "F");
        
        pdf.setTextColor(textColor[0], textColor[1], textColor[2]);
        pdf.setFont("helvetica", "normal");
        
        let lineY = yPosition + 4;
        for (const line of contentLines) {
          pdf.text(line, bubbleX + 5, lineY);
          lineY += 5;
        }

        yPosition += bubbleHeight + 8;

        if (isUser && message.sentiment?.sentiment) {
          pdf.setFontSize(8);
          pdf.setTextColor(150, 150, 150);
          pdf.text(`Mood: ${message.sentiment.sentiment}`, pageWidth - margin - 35, yPosition - 5);
        }
      }

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `SpaceForge Chat Export - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      const filename = `chat_${datasetName.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("Chat exported to PDF!");
    } catch (error) {
      console.error("Chat PDF export error:", error);
      toast.error("Failed to export chat. Please try again.");
    }
  }, []);

  const exportVisualizationToPdf = useCallback((
    charts: ChartExportData[],
    datasetName: string,
    dashboardTitle?: string
  ) => {
    try {
      const pdf = new jsPDF("landscape");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let yPosition = margin;

      pdf.setFillColor(99, 102, 241);
      pdf.rect(0, 0, pageWidth, 35, "F");
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont("helvetica", "bold");
      const dashTitle = dashboardTitle || "Dashboard Export";
      const dashTitleLines = pdf.splitTextToSize(dashTitle, pageWidth - margin * 2 - 10);
      pdf.text(dashTitleLines[0], margin, 20);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`Dataset: ${datasetName} | ${charts.length} visualization(s) | ${new Date().toLocaleString()}`, margin, 30);

      yPosition = 45;

      const chartData = charts.map((chart, index) => [
        String(index + 1),
        chart.title || `Chart ${index + 1}`,
        chart.type.charAt(0).toUpperCase() + chart.type.slice(1),
        chart.config?.xAxis as string || "-",
        chart.config?.yAxis as string || "-",
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [["#", "Title", "Type", "X-Axis", "Y-Axis"]],
        body: chartData,
        margin: { left: margin, right: margin },
        styles: { fontSize: 10, cellPadding: 4 },
        headStyles: { fillColor: [99, 102, 241], textColor: 255 },
        alternateRowStyles: { fillColor: [248, 248, 252] },
      });

      yPosition = (pdf as any).lastAutoTable.finalY + 15;

      for (const chart of charts) {
        if (yPosition > pageHeight - 60) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setTextColor(99, 102, 241);
        pdf.setFontSize(12);
        pdf.setFont("helvetica", "bold");
        pdf.text(`${chart.title || "Chart"} - ${chart.type}`, margin, yPosition);
        yPosition += 8;

        if (chart.data && chart.data.length > 0) {
          const headers = Object.keys(chart.data[0]);
          const rows = chart.data.slice(0, 10).map(row => 
            headers.map(h => String(row[h] ?? "-"))
          );

          autoTable(pdf, {
            startY: yPosition,
            head: [headers],
            body: rows,
            margin: { left: margin, right: margin },
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [120, 120, 140], textColor: 255 },
          });

          yPosition = (pdf as any).lastAutoTable.finalY + 10;

          if (chart.data.length > 10) {
            pdf.setFontSize(8);
            pdf.setTextColor(120, 120, 120);
            pdf.text(`... and ${chart.data.length - 10} more rows`, margin, yPosition);
            yPosition += 10;
          }
        }
      }

      const pageCount = pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(
          `SpaceForge Visualization Export - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" }
        );
      }

      const filename = `dashboard_${datasetName.replace(/\s+/g, "_").toLowerCase()}_${new Date().toISOString().split("T")[0]}.pdf`;
      pdf.save(filename);
      toast.success("Dashboard exported to PDF!");
    } catch (error) {
      console.error("Visualization PDF export error:", error);
      toast.error("Failed to export dashboard. Please try again.");
    }
  }, []);

  const generateShareableLink = useCallback((messages: ChatMessage[], datasetName: string): string => {
    try {
      const shareData = {
        dataset: datasetName,
        messages: messages.map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp?.toISOString(),
        })),
        exportedAt: new Date().toISOString(),
      };

      const encoded = btoa(encodeURIComponent(JSON.stringify(shareData)));
      const shareUrl = `${window.location.origin}/shared-chat?data=${encoded}`;
      
      navigator.clipboard.writeText(shareUrl).then(() => {
        toast.success("Shareable link copied to clipboard!");
      }).catch(() => {
        toast.error("Failed to copy link. Please try again.");
      });

      return shareUrl;
    } catch (error) {
      console.error("Share link generation error:", error);
      toast.error("Failed to generate shareable link.");
      return "";
    }
  }, []);

  const exportToCsv = useCallback((data: Record<string, unknown>[], filename: string) => {
    try {
      if (!data || data.length === 0) {
        toast.error("No data to export");
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(","),
        ...data.map(row => 
          headers.map(h => {
            const val = row[h];
            const stringVal = String(val ?? "");
            if (stringVal.includes(",") || stringVal.includes('"') || stringVal.includes("\n")) {
              return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
          }).join(",")
        )
      ];

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
      link.click();
      
      URL.revokeObjectURL(url);
      toast.success("CSV exported successfully!");
    } catch (error) {
      console.error("CSV export error:", error);
      toast.error("Failed to export CSV. Please try again.");
    }
  }, []);

  return { 
    exportToPdf, 
    exportChatToPdf, 
    exportVisualizationToPdf, 
    generateShareableLink,
    exportToCsv,
  };
};

export default usePdfExport;
