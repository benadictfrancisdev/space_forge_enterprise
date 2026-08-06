// Tiny safe formula DSL for calculated fields.
// Supports: SUM(col), AVG(col), COUNT(col), MIN(col), MAX(col),
//           PCT(a,b), GROWTH(col), IF(cond, a, b)
//           arithmetic + - * /, parentheses, numbers, "string" literals,
//           column refs as bare identifiers, comparisons > < >= <= == !=

type Row = Record<string, unknown>;

type Token =
  | { t: "num"; v: number }
  | { t: "str"; v: string }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "lp" } | { t: "rp" } | { t: "comma" };

const OPS = ["==", "!=", ">=", "<=", ">", "<", "+", "-", "*", "/"];

function tokenize(src: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t" || c === "\n") { i++; continue; }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    if (c === ",") { out.push({ t: "comma" }); i++; continue; }
    if (c === '"' || c === "'") {
      const q = c; let j = i + 1; let s = "";
      while (j < src.length && src[j] !== q) { s += src[j++]; }
      i = j + 1; out.push({ t: "str", v: s }); continue;
    }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: Number(src.slice(i, j)) }); i = j; continue;
    }
    let matched = false;
    for (const op of OPS) {
      if (src.startsWith(op, i)) { out.push({ t: "op", v: op }); i += op.length; matched = true; break; }
    }
    if (matched) continue;
    if (/[A-Za-z_]/.test(c)) {
      let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: "id", v: src.slice(i, j) }); i = j; continue;
    }
    throw new Error(`Unexpected character: ${c}`);
  }
  return out;
}

// Pratt-ish parser → AST evaluated against rows.
type Node =
  | { k: "num"; v: number }
  | { k: "str"; v: string }
  | { k: "col"; v: string }
  | { k: "bin"; op: string; a: Node; b: Node }
  | { k: "call"; fn: string; args: Node[] };

function parse(tokens: Token[]): Node {
  let p = 0;
  const peek = () => tokens[p];
  const eat = () => tokens[p++];
  const prec: Record<string, number> = {
    "==": 1, "!=": 1, ">": 2, "<": 2, ">=": 2, "<=": 2,
    "+": 3, "-": 3, "*": 4, "/": 4,
  };
  function parseExpr(min = 0): Node {
    let left = parsePrimary();
    while (true) {
      const t = peek();
      if (!t || t.t !== "op" || (prec[t.v] ?? 0) < min) break;
      const op = (eat() as { t: "op"; v: string }).v;
      const right = parseExpr((prec[op] ?? 0) + 1);
      left = { k: "bin", op, a: left, b: right };
    }
    return left;
  }
  function parsePrimary(): Node {
    const t = eat();
    if (!t) throw new Error("Unexpected end");
    if (t.t === "num") return { k: "num", v: t.v };
    if (t.t === "str") return { k: "str", v: t.v };
    if (t.t === "lp") { const n = parseExpr(0); if (eat()?.t !== "rp") throw new Error("Missing )"); return n; }
    if (t.t === "id") {
      if (peek()?.t === "lp") {
        eat();
        const args: Node[] = [];
        if (peek()?.t !== "rp") {
          args.push(parseExpr(0));
          while (peek()?.t === "comma") { eat(); args.push(parseExpr(0)); }
        }
        if (eat()?.t !== "rp") throw new Error("Missing )");
        return { k: "call", fn: t.v.toUpperCase(), args };
      }
      return { k: "col", v: t.v };
    }
    throw new Error(`Unexpected token ${JSON.stringify(t)}`);
  }
  return parseExpr(0);
}

function num(x: unknown): number {
  if (x == null || x === "") return NaN;
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : NaN;
}

function aggregate(fn: string, rows: Row[], col: string): number {
  const vals = rows.map(r => num(r[col])).filter(v => !Number.isNaN(v));
  if (!vals.length) return 0;
  switch (fn) {
    case "SUM": return vals.reduce((a, b) => a + b, 0);
    case "AVG": return vals.reduce((a, b) => a + b, 0) / vals.length;
    case "MIN": return Math.min(...vals);
    case "MAX": return Math.max(...vals);
    case "COUNT": return vals.length;
    default: return 0;
  }
}

function evalNode(node: Node, row: Row, allRows: Row[]): number | string | boolean {
  switch (node.k) {
    case "num": return node.v;
    case "str": return node.v;
    case "col": return num(row[node.v]);
    case "bin": {
      const a = evalNode(node.a, row, allRows) as number;
      const b = evalNode(node.b, row, allRows) as number;
      switch (node.op) {
        case "+": return (a as number) + (b as number);
        case "-": return (a as number) - (b as number);
        case "*": return (a as number) * (b as number);
        case "/": return (b as number) === 0 ? 0 : (a as number) / (b as number);
        case ">": return a > b; case "<": return a < b;
        case ">=": return a >= b; case "<=": return a <= b;
        case "==": return a === b; case "!=": return a !== b;
      }
      return 0;
    }
    case "call": {
      const fn = node.fn;
      if (["SUM", "AVG", "MIN", "MAX", "COUNT"].includes(fn)) {
        const colNode = node.args[0];
        if (colNode?.k !== "col") throw new Error(`${fn} expects a column name`);
        return aggregate(fn, allRows, colNode.v);
      }
      if (fn === "PCT") {
        const a = Number(evalNode(node.args[0], row, allRows));
        const b = Number(evalNode(node.args[1], row, allRows));
        return b === 0 ? 0 : (a / b) * 100;
      }
      if (fn === "GROWTH") {
        // GROWTH(col) → ((last - first) / first) * 100 across rows
        const colNode = node.args[0];
        if (colNode?.k !== "col") throw new Error("GROWTH expects a column");
        const series = allRows.map(r => num(r[colNode.v])).filter(v => !Number.isNaN(v));
        if (series.length < 2) return 0;
        const first = series[0]; const last = series[series.length - 1];
        return first === 0 ? 0 : ((last - first) / first) * 100;
      }
      if (fn === "IF") {
        const cond = evalNode(node.args[0], row, allRows);
        return cond ? evalNode(node.args[1], row, allRows) : evalNode(node.args[2], row, allRows);
      }
      throw new Error(`Unknown function ${fn}`);
    }
  }
}

export interface CalculatedField {
  id: string;
  name: string;
  formula: string;
}

export function evaluateFormula(formula: string, rows: Row[]): number | string {
  const ast = parse(tokenize(formula));
  // Aggregate-only formulas evaluate once over all rows
  const result = evalNode(ast, rows[0] || {}, rows);
  return result as number | string;
}

export function evaluateFormulaPerRow(formula: string, rows: Row[]): (number | string | boolean)[] {
  const ast = parse(tokenize(formula));
  return rows.map(r => evalNode(ast, r, rows));
}

export function validateFormula(formula: string): { ok: boolean; error?: string } {
  try { parse(tokenize(formula)); return { ok: true }; }
  catch (e) { return { ok: false, error: (e as Error).message }; }
}
