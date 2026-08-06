// Lightweight column-type inference used across Analytics Hub panels.
// Most panels accept columnTypes: Record<string, "numeric"|"date"|"categorical">.

export type ColumnType = "numeric" | "date" | "categorical";

const DATE_RX =
  /^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|^\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}/;

export const inferColumnTypes = (
  rows: Record<string, unknown>[],
  columns: string[],
): Record<string, ColumnType> => {
  const out: Record<string, ColumnType> = {};
  const sample = rows.slice(0, 100);
  for (const col of columns) {
    let nums = 0,
      dates = 0,
      total = 0;
    for (const r of sample) {
      const v = r?.[col];
      if (v === null || v === undefined || v === "") continue;
      total++;
      if (typeof v === "number" && Number.isFinite(v)) {
        nums++;
        continue;
      }
      const s = String(v).trim();
      if (s === "") continue;
      if (!Number.isNaN(Number(s.replace(/[, %$₹]/g, "")))) nums++;
      if (DATE_RX.test(s) || !Number.isNaN(Date.parse(s))) dates++;
    }
    if (total === 0) out[col] = "categorical";
    else if (dates / total > 0.7) out[col] = "date";
    else if (nums / total > 0.7) out[col] = "numeric";
    else out[col] = "categorical";
  }
  return out;
};

export const firstDateColumn = (
  types: Record<string, ColumnType>,
): string | null => {
  for (const [k, v] of Object.entries(types)) if (v === "date") return k;
  return null;
};
