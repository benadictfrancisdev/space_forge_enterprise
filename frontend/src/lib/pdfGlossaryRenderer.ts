import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { glossaryCategories, workflowStages, chartSelectionGuide } from "./pdfGlossaryData";

interface RenderColors {
  primary: [number, number, number];
  secondary: [number, number, number];
  text: [number, number, number];
  muted: [number, number, number];
}

const defaultColors: RenderColors = {
  primary: [99, 102, 241],
  secondary: [245, 245, 250],
  text: [40, 40, 40],
  muted: [120, 120, 130],
};

export function renderGlossaryAndWorkflow(
  pdf: jsPDF,
  colors: Partial<RenderColors> = {}
): void {
  const c = { ...defaultColors, ...colors };
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;

  const checkPage = (needed: number, y: number): number => {
    if (y + needed > pageHeight - 20) {
      pdf.addPage();
      return margin;
    }
    return y;
  };

  // ── REFERENCE GUIDE COVER ──
  pdf.addPage();
  let y = margin;

  pdf.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
  pdf.rect(0, 0, pageWidth, 50, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.text("Data Analyst Reference Guide", margin, 28);
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Complete Glossary of Terms & 9-Stage Workflow", margin, 40);

  y = 65;
  pdf.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
  pdf.setFontSize(9);
  pdf.text("This appendix contains 100+ essential data analyst terms and the complete analytical workflow.", margin, y);
  pdf.text("Stages marked with ⚡ are automated by SpaceForge AI.", margin, y + 6);
  y += 20;

  // ── GLOSSARY SECTION ──
  pdf.setTextColor(c.primary[0], c.primary[1], c.primary[2]);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Part 1: Essential Terms", margin, y);
  y += 12;

  for (const category of glossaryCategories) {
    y = checkPage(40, y);

    // Category header
    pdf.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
    pdf.rect(margin, y - 5, pageWidth - margin * 2, 10, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text(`${category.emoji}  ${category.title}`, margin + 4, y + 2);
    y += 12;

    // Terms table
    const rows = category.terms.map((t) => [t.term, t.meaning]);

    autoTable(pdf, {
      startY: y,
      head: [["Term", "Meaning"]],
      body: rows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 3, overflow: "linebreak" },
      headStyles: {
        fillColor: [c.primary[0], c.primary[1], c.primary[2]],
        textColor: 255,
        fontStyle: "bold",
        fontSize: 8,
      },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 45 },
        1: { cellWidth: "auto" },
      },
      alternateRowStyles: { fillColor: [c.secondary[0], c.secondary[1], c.secondary[2]] },
    });

    y = (pdf as any).lastAutoTable.finalY + 10;
  }

  // ── WORKFLOW SECTION ──
  pdf.addPage();
  y = margin;

  pdf.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
  pdf.rect(0, 0, pageWidth, 35, "F");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(16);
  pdf.setFont("helvetica", "bold");
  pdf.text("Part 2: The Complete Data Analyst Workflow", margin, 22);

  y = 50;

  for (const stage of workflowStages) {
    y = checkPage(50, y);

    // Stage number circle
    pdf.setFillColor(c.primary[0], c.primary[1], c.primary[2]);
    pdf.circle(margin + 5, y + 2, 5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(stage.number), margin + 3.3, y + 4.5);

    // Stage title
    pdf.setTextColor(c.text[0], c.text[1], c.text[2]);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    const automatedTag = stage.automated ? "  ⚡ Automated by SpaceForge" : "";
    pdf.text(`${stage.emoji} ${stage.title}`, margin + 14, y + 4);

    if (stage.automated) {
      pdf.setFontSize(8);
      pdf.setTextColor(99, 102, 241);
      pdf.text("⚡ Automated by SpaceForge", margin + 14 + pdf.getTextWidth(`${stage.emoji} ${stage.title}  `), y + 4);
    }

    y += 10;

    // Subtitle
    pdf.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "italic");
    pdf.text(stage.subtitle, margin + 14, y);
    y += 7;

    // Steps
    pdf.setTextColor(c.text[0], c.text[1], c.text[2]);
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "normal");

    for (const step of stage.steps) {
      y = checkPage(7, y);
      const lines = pdf.splitTextToSize(`• ${step}`, pageWidth - margin * 2 - 18);
      pdf.text(lines, margin + 18, y);
      y += lines.length * 4.5 + 1.5;
    }

    y += 6;

    // Divider
    pdf.setDrawColor(220, 220, 230);
    pdf.setLineWidth(0.2);
    pdf.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // ── CHART SELECTION GUIDE ──
  y = checkPage(60, y);
  pdf.setTextColor(c.primary[0], c.primary[1], c.primary[2]);
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.text("Chart Selection Guide", margin, y);
  y += 8;

  autoTable(pdf, {
    startY: y,
    head: [["Use Case", "Recommended Chart Type"]],
    body: chartSelectionGuide.map((r) => [r.useCase, r.chartType]),
    margin: { left: margin, right: margin },
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: {
      fillColor: [c.primary[0], c.primary[1], c.primary[2]],
      textColor: 255,
    },
    alternateRowStyles: { fillColor: [c.secondary[0], c.secondary[1], c.secondary[2]] },
  });

  y = (pdf as any).lastAutoTable.finalY + 12;

  // ── SPACEFORGE CALLOUT ──
  y = checkPage(30, y);
  pdf.setFillColor(240, 237, 255);
  pdf.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, "F");
  pdf.setTextColor(c.primary[0], c.primary[1], c.primary[2]);
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.text("⚡ SpaceForge AI automates Stages 3–8 entirely", margin + 6, y + 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(c.muted[0], c.muted[1], c.muted[2]);
  pdf.text("From Data Cleaning through Reporting — so you can focus on defining problems and acting on insights.", margin + 6, y + 17);
}
