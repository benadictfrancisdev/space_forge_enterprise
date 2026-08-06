export interface ReportSection {
  section: string;
  modules: string[];
  depth: number;
}

export interface Persona {
  id: string;
  label: string;
  icon: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  badgeClass: string;
  tagline: string;
  focus: string;
  reportSections: ReportSection[];
  strengths: string[];
  gaps: string[];
  aiUsage: string;
}

export const personas: Record<string, Persona> = {
  analyst: {
    id: "analyst",
    label: "Data Analyst",
    icon: "◈",
    colorClass: "text-chart-5",
    bgClass: "bg-chart-5/10",
    borderClass: "border-chart-5/20",
    badgeClass: "bg-chart-5/10 text-chart-5 border-chart-5/20",
    tagline: "Insight → Decision",
    focus: "Business Intelligence & Reporting",
    reportSections: [
      { section: "Executive Summary", modules: ["KPI Scorecard", "Period-over-Period Δ", "Top 3 Findings"], depth: 95 },
      { section: "Trend Analysis", modules: ["Time Series", "MTD / QTD / YTD", "Seasonality"], depth: 90 },
      { section: "Segmentation", modules: ["Cohort Breakdown", "Category Drill-down", "Filters"], depth: 85 },
      { section: "Anomaly Flags", modules: ["Outlier Detection", "Alert Thresholds", "Root Cause"], depth: 70 },
      { section: "Visualisations", modules: ["Bar / Line / Pie", "Heat Maps", "Sparklines"], depth: 95 },
      { section: "Data Export", modules: ["Excel / CSV", "PDF Report", "Dashboard Share"], depth: 90 },
    ],
    strengths: ["Fast turnaround", "Stakeholder-ready", "No-code friendly"],
    gaps: ["No predictive depth", "Correlation ≠ causation"],
    aiUsage: "Narrative generation, anomaly explanation, chart suggestions",
  },
  scientist: {
    id: "scientist",
    label: "Data Scientist",
    icon: "⬡",
    colorClass: "text-chart-4",
    bgClass: "bg-chart-4/10",
    borderClass: "border-chart-4/20",
    badgeClass: "bg-chart-4/10 text-chart-4 border-chart-4/20",
    tagline: "Model → Predict → Explain",
    focus: "Statistical Modelling & ML Experiments",
    reportSections: [
      { section: "Problem Definition", modules: ["Hypothesis", "Success Metrics", "Constraints"], depth: 85 },
      { section: "EDA", modules: ["Distribution Analysis", "Correlation Matrix", "Missing Values"], depth: 95 },
      { section: "Feature Engineering", modules: ["Derived Variables", "Encoding Strategy", "Dimensionality"], depth: 90 },
      { section: "Model Evaluation", modules: ["Train/Test Split", "CV Scores", "Confusion Matrix"], depth: 95 },
      { section: "Statistical Tests", modules: ["A/B Testing", "Significance", "Effect Size"], depth: 80 },
      { section: "Explainability", modules: ["SHAP Values", "Feature Importance", "Residuals"], depth: 75 },
    ],
    strengths: ["Rigorous methodology", "Predictive power", "Statistical validity"],
    gaps: ["Needs technical reader", "High iteration time"],
    aiUsage: "Code generation, model interpretation, hypothesis framing",
  },
  founder: {
    id: "founder",
    label: "Founder",
    icon: "◆",
    colorClass: "text-warning",
    bgClass: "bg-warning/10",
    borderClass: "border-warning/20",
    badgeClass: "bg-warning/10 text-warning border-warning/20",
    tagline: "Metrics → Strategy → Capital",
    focus: "Growth, Unit Economics & Investor Readiness",
    reportSections: [
      { section: "North Star Metrics", modules: ["Revenue / ARR", "MoM Growth %", "Burn Rate"], depth: 100 },
      { section: "Unit Economics", modules: ["CAC", "LTV", "LTV:CAC Ratio"], depth: 95 },
      { section: "Funnel Performance", modules: ["Acquisition", "Activation", "Retention"], depth: 90 },
      { section: "Cohort Retention", modules: ["D1/D7/D30", "Revenue Cohorts", "Churn Waterfall"], depth: 85 },
      { section: "Scenario Modelling", modules: ["Best / Base / Worst", "Runway Calculator", "Sensitivity"], depth: 80 },
      { section: "Investor Deck Output", modules: ["1-page Summary", "Traction Slide", "Forecast Table"], depth: 90 },
    ],
    strengths: ["Decision velocity", "Investor-ready", "Strategic framing"],
    gaps: ["Less statistical rigour", "Macro blind spots"],
    aiUsage: "Narrative framing, benchmark comparison, scenario generation",
  },
  org: {
    id: "org",
    label: "Organisation",
    icon: "⬣",
    colorClass: "text-success",
    bgClass: "bg-success/10",
    borderClass: "border-success/20",
    badgeClass: "bg-success/10 text-success border-success/20",
    tagline: "Align → Govern → Scale",
    focus: "Cross-team Governance & Enterprise Analytics",
    reportSections: [
      { section: "Org-wide KPI Hub", modules: ["Department Scorecards", "Rollup Views", "OKR Tracking"], depth: 95 },
      { section: "Data Governance", modules: ["Access Controls", "Audit Logs", "Data Lineage"], depth: 85 },
      { section: "Cross-function Analysis", modules: ["Multi-dataset Joins", "Shared Definitions", "Blended Views"], depth: 90 },
      { section: "Collaboration Layer", modules: ["Report Sharing", "Comments", "Version History"], depth: 80 },
      { section: "Scheduled Reporting", modules: ["Auto-dispatch", "Email Digests", "Alert Rules"], depth: 85 },
      { section: "Executive Dashboards", modules: ["C-Suite View", "Board Pack", "Benchmark vs Industry"], depth: 90 },
    ],
    strengths: ["Alignment at scale", "Governance ready", "Single source of truth"],
    gaps: ["Slower iteration", "Requires data maturity"],
    aiUsage: "Cross-team narrative synthesis, anomaly triage, board summaries",
  },
};

export interface ComparisonDimension {
  label: string;
  analyst: number;
  scientist: number;
  founder: number;
  org: number;
}

export const comparisonDimensions: ComparisonDimension[] = [
  { label: "Technical Depth", analyst: 70, scientist: 100, founder: 50, org: 65 },
  { label: "Speed to Insight", analyst: 95, scientist: 55, founder: 90, org: 75 },
  { label: "Stakeholder Focus", analyst: 85, scientist: 40, founder: 100, org: 95 },
  { label: "Statistical Rigour", analyst: 60, scientist: 100, founder: 35, org: 55 },
  { label: "Predictive Power", analyst: 45, scientist: 100, founder: 60, org: 50 },
  { label: "Collaboration", analyst: 70, scientist: 50, founder: 65, org: 100 },
  { label: "Visual Output", analyst: 95, scientist: 70, founder: 90, org: 85 },
];
