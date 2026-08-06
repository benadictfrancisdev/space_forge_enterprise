/**
 * Schema Normalizer
 * - Detects column semantic roles (date / numeric / category / id / amount / etc.)
 * - Normalizes column names across files using an alias dictionary
 * - Merges multiple datasets (CSVs / XLSX sheets) into a single unified table
 *
 * Pure client-side. No AI calls.
 */

export type ColumnRole =
  | "date" | "amount" | "quantity" | "price" | "revenue" | "expense"
  | "profit" | "customer" | "product" | "region" | "category"
  | "id" | "numeric" | "text" | "boolean" | "unknown";

export interface ColumnProfile {
  original: string;
  normalized: string;
  role: ColumnRole;
  type: "numeric" | "date" | "categorical" | "boolean" | "text";
  sampleValues: unknown[];
}

export interface NormalizedDataset {
  rows: Record<string, unknown>[];
  columns: string[];                 // normalized column names
  originalColumns: string[];         // original column names (parallel array)
  profiles: ColumnProfile[];
  domain: string;                    // finance / sales / sports / general
  source: string;                    // filename / sheet
}

// ── Alias dictionary: maps user-provided headers → canonical name ──
const ALIAS_MAP: Record<string, string[]> = {
  date:        ["date", "txn_date", "transaction_date", "order_date", "invoice_date", "posting_date", "created_at", "timestamp", "day", "month_year"],
  amount:      ["amount", "total", "value", "amt", "grand_total", "net_amount", "gross_amount", "subtotal"],
  revenue:     ["revenue", "sales", "income", "turnover", "gross_revenue", "net_sales"],
  expense:     ["expense", "expenses", "cost", "spend", "cogs", "opex", "outflow"],
  profit:      ["profit", "margin", "net_profit", "earnings", "ebitda", "gross_profit"],
  quantity:    ["quantity", "qty", "units", "count", "volume", "pcs"],
  price:       ["price", "unit_price", "rate", "mrp", "cost_per_unit"],
  customer:    ["customer", "client", "buyer", "account", "customer_name", "party", "vendor_name"],
  product:     ["product", "sku", "item", "item_name", "product_name", "service"],
  region:      ["region", "city", "state", "country", "territory", "zone", "area", "location"],
  category:    ["category", "type", "segment", "class", "group"],
};

const REVERSE_ALIAS: Map<string, string> = (() => {
  const m = new Map<string, string>();
  for (const [canon, aliases] of Object.entries(ALIAS_MAP)) {
    for (const a of aliases) m.set(a, canon);
    m.set(canon, canon);
  }
  return m;
})();

const slug = (s: string) =>
  s.toLowerCase().trim().replace(/[\s\-./\\]+/g, "_").replace(/[^\w]/g, "");

export function canonicalize(header: string): string {
  const k = slug(header);
  return REVERSE_ALIAS.get(k) ?? k;
}

// ── Value-based type detection ────────────────────────────────────

function isNumericLike(v: unknown): boolean {
  if (v === null || v === undefined || v === "") return false;
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v !== "string") return false;
  // strip currency / commas
  const cleaned = v.replace(/[₹$€£,\s]/g, "");
  return cleaned !== "" && !isNaN(Number(cleaned));
}

function isDateLike(v: unknown): boolean {
  if (v instanceof Date) return !isNaN(v.getTime());
  if (typeof v !== "string") return false;
  if (v.length < 6 || v.length > 32) return false;
  if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}/.test(v)) return true;
  if (/^\d{1,2}[-/]\d{1,2}[-/]\d{2,4}/.test(v)) return true;
  const d = Date.parse(v);
  return !isNaN(d);
}

function isBoolLike(v: unknown): boolean {
  if (typeof v === "boolean") return true;
  if (typeof v !== "string") return false;
  return /^(true|false|yes|no|y|n|0|1)$/i.test(v.trim());
}

function detectType(values: unknown[]): ColumnProfile["type"] {
  const sample = values.filter(v => v !== null && v !== undefined && v !== "").slice(0, 200);
  if (sample.length === 0) return "text";
  const num = sample.filter(isNumericLike).length;
  const date = sample.filter(isDateLike).length;
  const bool = sample.filter(isBoolLike).length;
  if (date / sample.length > 0.7) return "date";
  if (num / sample.length > 0.8) return "numeric";
  if (bool / sample.length > 0.9 && bool >= 5) return "boolean";
  // categorical heuristic: low cardinality
  const unique = new Set(sample.map(v => String(v))).size;
  if (unique / sample.length < 0.5 && unique <= 100) return "categorical";
  return "text";
}

function inferRole(canon: string, type: ColumnProfile["type"]): ColumnRole {
  if (REVERSE_ALIAS.has(canon)) {
    const r = REVERSE_ALIAS.get(canon)!;
    if (["date", "amount", "quantity", "price", "revenue", "expense",
         "profit", "customer", "product", "region", "category"].includes(r)) {
      return r as ColumnRole;
    }
  }
  if (/_id$|^id$|uuid|guid/.test(canon)) return "id";
  if (type === "date") return "date";
  if (type === "numeric") return "numeric";
  if (type === "boolean") return "boolean";
  if (type === "categorical") return "category";
  return "text";
}

// ── Domain classification (column names + roles) ─────────────────

const DOMAIN_RULES: { domain: string; required: ColumnRole[]; bonusKeywords: string[] }[] = [
  { domain: "finance",  required: [], bonusKeywords: ["revenue","profit","expense","cash","invoice","gst","payable","receivable","ledger","tally","zoho","ebitda","margin"] },
  { domain: "sales",    required: [], bonusKeywords: ["sales","order","quantity","discount","deal","lead","pipeline","sku"] },
  { domain: "sports",   required: [], bonusKeywords: ["runs","wickets","overs","innings","batsman","bowler","player","team","goals","assists","match","score"] },
  { domain: "marketing",required: [], bonusKeywords: ["campaign","impression","click","ctr","cpc","reach","engagement"] },
  { domain: "hr",       required: [], bonusKeywords: ["employee","salary","attrition","tenure","department"] },
];

export function classifyDomain(profiles: ColumnProfile[]): string {
  const haystack = profiles.map(p => `${p.normalized} ${p.original}`.toLowerCase()).join(" ");
  let best = "general", bestScore = 0;
  for (const rule of DOMAIN_RULES) {
    let score = rule.bonusKeywords.filter(k => haystack.includes(k)).length;
    if (rule.domain === "finance" && profiles.some(p => p.role === "revenue" || p.role === "expense" || p.role === "profit")) score += 2;
    if (rule.domain === "sales" && profiles.some(p => p.role === "product" || p.role === "quantity")) score += 1;
    if (score > bestScore) { bestScore = score; best = rule.domain; }
  }
  return bestScore >= 1 ? best : "general";
}

// ── Profile a single dataset ─────────────────────────────────────

export function profileDataset(
  rows: Record<string, unknown>[],
  columns: string[],
  source = "dataset"
): NormalizedDataset {
  const originalColumns = [...columns];
  const profiles: ColumnProfile[] = [];
  const normalized: string[] = [];
  const seen = new Map<string, number>();

  for (const col of columns) {
    let canon = canonicalize(col);
    // dedupe collisions across aliases (e.g. two "amount"-like cols)
    if (seen.has(canon)) {
      const n = (seen.get(canon) ?? 1) + 1;
      seen.set(canon, n);
      canon = `${canon}_${n}`;
    } else seen.set(canon, 1);

    const values = rows.map(r => r[col]);
    const type = detectType(values);
    const role = inferRole(canon, type);
    profiles.push({
      original: col,
      normalized: canon,
      role,
      type,
      sampleValues: values.filter(v => v !== null && v !== undefined && v !== "").slice(0, 3),
    });
    normalized.push(canon);
  }

  // Rewrite rows with normalized keys
  const aliasByOriginal = new Map(profiles.map(p => [p.original, p.normalized]));
  const remappedRows = rows.map(r => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) {
      const nk = aliasByOriginal.get(k) ?? slug(k);
      // Coerce numeric-looking strings to numbers for the columns we detected as numeric
      const profile = profiles.find(p => p.normalized === nk);
      if (profile?.type === "numeric" && typeof v === "string") {
        const cleaned = v.replace(/[₹$€£,\s]/g, "");
        const n = Number(cleaned);
        out[nk] = isNaN(n) ? v : n;
      } else {
        out[nk] = v;
      }
    }
    return out;
  });

  return {
    rows: remappedRows,
    columns: normalized,
    originalColumns,
    profiles,
    domain: classifyDomain(profiles),
    source,
  };
}

// ── Merge multiple normalized datasets into one ──────────────────

export function mergeDatasets(datasets: NormalizedDataset[]): NormalizedDataset {
  if (datasets.length === 0) {
    return { rows: [], columns: [], originalColumns: [], profiles: [], domain: "general", source: "merged" };
  }
  if (datasets.length === 1) return datasets[0];

  // Union of column names
  const allColumns = new Set<string>();
  datasets.forEach(d => d.columns.forEach(c => allColumns.add(c)));
  const columns = Array.from(allColumns);

  // Combine rows; missing columns become null; tag with __source for traceability
  const rows: Record<string, unknown>[] = [];
  for (const d of datasets) {
    for (const r of d.rows) {
      const merged: Record<string, unknown> = { __source: d.source };
      for (const c of columns) merged[c] = r[c] ?? null;
      rows.push(merged);
    }
  }

  // Re-profile the merged set so types reflect combined data
  const merged = profileDataset(rows, [...columns, "__source"], "merged");
  return merged;
}
