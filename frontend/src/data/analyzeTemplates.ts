// Programmatic SEO templates. Each entry renders /analyze/:slug.
// Add a new entry → ship a new SEO page. No code changes needed.

export interface AnalyzeTemplate {
  slug: string;
  // SEO
  title: string;
  description: string;
  h1: string;
  intent: string; // shown under H1
  // Use case copy
  audience: string;          // e.g. "Shopify store owners"
  fileTypes: string[];       // e.g. ["Shopify export CSV", "Orders XLSX"]
  painPoints: string[];      // 3-4 bullets — concrete pains
  insights: string[];        // 5 insights the tool will deliver
  // Related (internal-linking for SEO)
  related: string[];         // other slugs
}

export const analyzeTemplates: AnalyzeTemplate[] = [
  {
    slug: "shopify-sales-data",
    title: "Analyze Shopify Sales Data in 60 Seconds — Free | SpaceForge",
    description:
      "Upload your Shopify orders CSV and instantly get a revenue dashboard, repeat-buyer breakdown, and the 5 insights that grow your store. No setup.",
    h1: "Analyze your Shopify sales data — in 60 seconds",
    intent:
      "For D2C founders who export from Shopify and waste hours in Excel. Get a CEO-ready dashboard, repeat-buyer insights, and a shareable report — free.",
    audience: "Shopify and D2C store owners",
    fileTypes: ["Shopify orders CSV", "Customers export", "Products CSV"],
    painPoints: [
      "Shopify Reports hides the answers behind 4 menus",
      "You don't know which SKUs are about to stock out",
      "Repeat-purchase rate is buried — you can't tell who your real customers are",
      "Investors ask for monthly cohort data and you scramble",
    ],
    insights: [
      "Revenue, AOV, and growth — by week, month, channel",
      "Top SKUs ranked by margin (not just revenue)",
      "Repeat-buyer cohort: who buys twice, how soon",
      "Stockout watchlist with reorder timing",
      "City-level demand heatmap",
    ],
    related: ["d2c-revenue-spreadsheet", "tally-excel-export", "restaurant-pos-data"],
  },
  {
    slug: "tally-excel-export",
    title: "Analyze Tally Excel Export — Instant Dashboard | SpaceForge",
    description:
      "Drop your Tally export and get an executive dashboard, P&L summary, and the insights your CA misses — in 60 seconds. Free. Data stays in your browser.",
    h1: "Turn your Tally export into a CEO dashboard",
    intent:
      "Built for Indian businesses running on Tally who need a clear picture without waiting for the month-end CA call.",
    audience: "Indian SMB founders running Tally / Tally Prime",
    fileTypes: ["Tally Day Book export", "Ledger XLSX", "Sales Register CSV"],
    painPoints: [
      "Tally reports are accurate but ugly — and no one shares them in meetings",
      "Cash-flow surprises hit you at the end of the month",
      "Your CA gives you numbers, not decisions",
      "You can't compare this quarter vs last in 30 seconds",
    ],
    insights: [
      "Real-time P&L summary in plain English",
      "Cash position vs receivables — 60 / 90 / 120 day ageing",
      "Top 10 vendors and customers by exposure",
      "Expense spikes flagged automatically",
      "Quarter-over-quarter comparison with commentary",
    ],
    related: ["zoho-books-report", "d2c-revenue-spreadsheet", "shopify-sales-data"],
  },
  {
    slug: "zoho-books-report",
    title: "Analyze Zoho Books Reports — Instant Insights | SpaceForge",
    description:
      "Export from Zoho Books, drop the file, get an executive summary and the 5 insights that matter. No SQL, no analyst, no setup.",
    h1: "Make sense of your Zoho Books data — instantly",
    intent:
      "For founders and finance teams using Zoho Books who want decisions, not just numbers.",
    audience: "Founders and finance leads on Zoho Books",
    fileTypes: ["Zoho Books P&L CSV", "Invoice register", "Bills export"],
    painPoints: [
      "Zoho dashboards are generic — they don't surface YOUR anomalies",
      "Invoice ageing is hidden in a sub-menu",
      "You can't drag-and-drop charts into an investor update",
      "GST reconciliation eats your Saturday",
    ],
    insights: [
      "Cash runway projection from real receivables",
      "Customer concentration risk — top 5 customers % of revenue",
      "Expense category breakdown with month-over-month deltas",
      "Outstanding invoices by ageing bucket",
      "Auto-generated investor-grade summary",
    ],
    related: ["tally-excel-export", "d2c-revenue-spreadsheet", "shopify-sales-data"],
  },
  {
    slug: "restaurant-pos-data",
    title: "Analyze Restaurant POS Data — Instant F&B Dashboard | SpaceForge",
    description:
      "Drop your Petpooja, Posist or Zomato sales export — get an F&B dashboard, peak-hour insights, and item-level margin in 60 seconds.",
    h1: "Turn your restaurant POS data into a profit dashboard",
    intent:
      "For restaurant owners, cloud kitchen operators, and F&B chains who want to know what to push tomorrow, not next month.",
    audience: "Restaurant and cloud-kitchen owners",
    fileTypes: ["Petpooja sales CSV", "Posist export", "Zomato sales report"],
    painPoints: [
      "You know revenue is up, but not which items are killing your margin",
      "Peak-hour staffing is a guess",
      "Aggregator vs dine-in mix — no clear view",
      "Wastage data sits in a separate sheet you never open",
    ],
    insights: [
      "Item-level margin ranked — push the top 5, drop the bottom 5",
      "Hour-by-hour demand heatmap for staffing",
      "Channel mix: Zomato vs Swiggy vs dine-in vs direct",
      "Repeat customer % and average order frequency",
      "Wastage flagged when it exceeds normal range",
    ],
    related: ["shopify-sales-data", "d2c-revenue-spreadsheet", "tally-excel-export"],
  },
  {
    slug: "d2c-revenue-spreadsheet",
    title: "D2C Revenue Spreadsheet to Dashboard — Free | SpaceForge",
    description:
      "Drop your D2C revenue sheet (Shopify, WooCommerce, Razorpay) and get a CEO dashboard, growth drivers, and a shareable report. Free.",
    h1: "From D2C revenue sheet to investor-ready dashboard",
    intent:
      "Built for D2C founders raising or running lean — get the growth story your spreadsheet is hiding.",
    audience: "D2C founders and growth leads",
    fileTypes: ["Revenue spreadsheet (any format)", "Razorpay payments export", "WooCommerce orders"],
    painPoints: [
      "Investor updates take 4 hours every month",
      "You can sense growth but can't articulate the driver",
      "Channel-level CAC is a wild guess",
      "No clean view of repeat behaviour vs first-time",
    ],
    insights: [
      "Monthly growth decomposed: new vs repeat vs ARPU lift",
      "Top growth channel ranked by contribution",
      "Cohort retention table (auto-generated)",
      "Investor-ready 1-page summary, copy-paste into email",
      "Forecast: next-quarter revenue range",
    ],
    related: ["shopify-sales-data", "zoho-books-report", "restaurant-pos-data"],
  },
  {
    slug: "excel-dashboard-generator",
    title: "Free Excel Dashboard Generator — Upload & Visualize | SpaceForge",
    description:
      "Free Excel and CSV dashboard generator. Drop any sheet, get a clean dashboard with charts and AI insights — no setup, no templates, no formulas.",
    h1: "Free Excel dashboard generator — upload any sheet",
    intent:
      "Tired of building Excel dashboards from scratch? Drop your file. We build the dashboard. You get the insights. Free, browser-only, no signup.",
    audience: "Anyone with a spreadsheet they need to understand",
    fileTypes: ["Excel (.xlsx)", "CSV", "Google Sheets export", "JSON"],
    painPoints: [
      "Excel dashboards take hours and break the moment data changes",
      "Pivot tables are powerful but unreadable to your team",
      "You don't have time to learn Power Query, DAX, or Tableau",
      "ChatGPT can't actually see your spreadsheet's structure",
    ],
    insights: [
      "Auto-detected KPIs surfaced as clean tiles",
      "Best chart for each column picked automatically",
      "Top trends and anomalies called out in plain English",
      "One-click shareable link or PDF",
      "Works on any spreadsheet — sales, ops, HR, finance",
    ],
    related: ["d2c-revenue-spreadsheet", "shopify-sales-data", "tally-excel-export"],
  },
];

export const analyzeBySlug = (slug: string) => analyzeTemplates.find((t) => t.slug === slug);
