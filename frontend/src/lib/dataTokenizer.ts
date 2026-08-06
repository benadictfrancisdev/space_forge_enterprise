/**
 * Client-side Data Tokenizer
 * Replaces PII values with random tokens, keeping a local map for de-tokenization.
 * Token map lives only in browser memory — never persisted or transmitted.
 */

export interface TokenMap {
  /** token → original value */
  [token: string]: string;
}

export interface TokenizeResult {
  tokenizedData: Record<string, unknown>[];
  tokenMap: TokenMap;
  reverseMap: Record<string, string>; // original → token (for fast lookup)
}

// ── Helpers ──────────────────────────────────────────────────────

function generateToken(prefix: string, index: number): string {
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}_${rand}_${index}`;
}

const TYPE_PREFIXES: Record<string, string> = {
  email: "EMAIL",
  phone: "PHONE",
  credit_card: "CARD",
  aadhaar: "AADHAAR",
  pan: "PAN",
  ssn: "SSN",
  ip_address: "IP",
  name_heuristic: "PERSON",
};

// ── Public API ───────────────────────────────────────────────────

/**
 * Tokenizes PII columns in a dataset.
 * @param data       – array of row objects
 * @param piiColumns – map of column name → PII type detected
 * @returns tokenised data + bidirectional maps
 */
export function tokenizeDataset(
  data: Record<string, unknown>[],
  piiColumns: Record<string, string>
): TokenizeResult {
  const tokenMap: TokenMap = {};
  const reverseMap: Record<string, string> = {};
  let counter = 0;

  // Build unique-value → token mapping per column
  const columnTokenMaps: Record<string, Record<string, string>> = {};

  for (const [col, piiType] of Object.entries(piiColumns)) {
    const prefix = TYPE_PREFIXES[piiType] || "PII";
    const colMap: Record<string, string> = {};

    const uniqueValues = new Set(data.map((row) => String(row[col] ?? "")));
    for (const val of uniqueValues) {
      if (!val) continue;
      const token = generateToken(prefix, counter++);
      colMap[val] = token;
      tokenMap[token] = val;
      reverseMap[val] = token;
    }

    columnTokenMaps[col] = colMap;
  }

  // Produce tokenized copy
  const tokenizedData = data.map((row) => {
    const newRow = { ...row };
    for (const col of Object.keys(piiColumns)) {
      const val = String(row[col] ?? "");
      const colMap = columnTokenMaps[col];
      if (colMap && colMap[val]) {
        newRow[col] = colMap[val];
      }
    }
    return newRow;
  });

  return { tokenizedData, tokenMap, reverseMap };
}

/**
 * Re-maps tokens in an AI-generated insight string back to real values.
 */
export function detokenizeInsights(text: string, tokenMap: TokenMap): string {
  let result = text;
  for (const [token, original] of Object.entries(tokenMap)) {
    // Replace all occurrences (case-sensitive)
    result = result.split(token).join(original);
  }
  return result;
}
