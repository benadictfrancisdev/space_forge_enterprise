// Lightweight PDF → tabular rows parser using pdfjs-dist.
// Strategy:
//  1. Extract text items from each page with their X/Y coordinates.
//  2. Group items by Y (line) → reconstruct visual lines in reading order.
//  3. If most lines on a page have the same number of "columns" (>=2) when split
//     by large X-gaps, treat the first such line as a header and emit table rows.
//  4. Otherwise fall back to one row per line: { page, line, text }.

import * as pdfjsLib from "pdfjs-dist";
// Vite-friendly worker URL
// @ts-ignore - ?url import handled by Vite
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

(pdfjsLib as unknown as { GlobalWorkerOptions: { workerSrc: string } })
  .GlobalWorkerOptions.workerSrc = workerUrl;

export interface PdfParseResult {
  rows: Record<string, unknown>[];
  columns: string[];
  totalRows: number;
  pageCount: number;
}

interface TextItem {
  str: string;
  x: number;
  y: number;
  w: number;
}

const GAP_THRESHOLD = 12; // pixels — gap between columns

const groupIntoLines = (items: TextItem[]): TextItem[][] => {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: TextItem[][] = [];
  let current: TextItem[] = [];
  let currentY: number | null = null;
  for (const it of sorted) {
    if (currentY === null || Math.abs(it.y - currentY) < 3) {
      current.push(it);
      currentY = currentY ?? it.y;
    } else {
      if (current.length) lines.push(current.sort((a, b) => a.x - b.x));
      current = [it];
      currentY = it.y;
    }
  }
  if (current.length) lines.push(current.sort((a, b) => a.x - b.x));
  return lines;
};

const splitLineToCells = (line: TextItem[]): string[] => {
  if (line.length === 0) return [];
  const cells: string[] = [];
  let buf = line[0].str;
  let prevEnd = line[0].x + line[0].w;
  for (let i = 1; i < line.length; i++) {
    const it = line[i];
    if (it.x - prevEnd > GAP_THRESHOLD) {
      cells.push(buf.trim());
      buf = it.str;
    } else {
      buf += (buf.endsWith(" ") || it.str.startsWith(" ") ? "" : " ") + it.str;
    }
    prevEnd = it.x + it.w;
  }
  cells.push(buf.trim());
  return cells.filter(c => c.length > 0);
};

export const parsePdfFile = async (
  file: File,
  onProgress?: (pct: number) => void,
): Promise<PdfParseResult> => {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageCount = pdf.numPages;

  const allLines: { page: number; cells: string[]; text: string }[] = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const items: TextItem[] = (content.items as unknown[])
      .map(raw => {
        const it = raw as { str?: unknown; transform?: number[]; width?: number };
        if (typeof it.str !== "string" || !Array.isArray(it.transform)) return null;
        return { str: it.str, x: it.transform[4], y: it.transform[5], w: it.width ?? 0 };
      })
      .filter((it): it is TextItem => !!it && it.str.trim().length > 0);

    const lines = groupIntoLines(items);
    for (const line of lines) {
      const cells = splitLineToCells(line);
      const text = cells.join(" ");
      if (text.length === 0) continue;
      allLines.push({ page: p, cells, text });
    }
    onProgress?.(Math.round((p / pageCount) * 100));
  }

  // Try table detection: most common cell-count >= 2
  const counts = new Map<number, number>();
  for (const l of allLines) counts.set(l.cells.length, (counts.get(l.cells.length) ?? 0) + 1);
  let bestN = 0;
  let bestCount = 0;
  for (const [n, c] of counts) {
    if (n >= 2 && c > bestCount) { bestN = n; bestCount = c; }
  }

  const tableLines = bestN > 0 ? allLines.filter(l => l.cells.length === bestN) : [];
  const isTable = tableLines.length >= 5 && tableLines.length / allLines.length > 0.4;

  if (isTable) {
    const header = tableLines[0].cells.map((c, i) => c || `col_${i + 1}`);
    // De-dupe headers
    const seen = new Map<string, number>();
    const cols = header.map(h => {
      const k = h.trim() || "col";
      const n = (seen.get(k) ?? 0) + 1;
      seen.set(k, n);
      return n === 1 ? k : `${k}_${n}`;
    });
    const rows = tableLines.slice(1).map(l => {
      const row: Record<string, unknown> = {};
      cols.forEach((c, i) => { row[c] = l.cells[i] ?? ""; });
      return row;
    });
    return { rows, columns: cols, totalRows: rows.length, pageCount };
  }

  // Fallback: per-line rows
  const rows = allLines.map((l, idx) => ({
    page: l.page,
    line: idx + 1,
    content: l.text,
  }));
  return {
    rows,
    columns: ["page", "line", "content"],
    totalRows: rows.length,
    pageCount,
  };
};
