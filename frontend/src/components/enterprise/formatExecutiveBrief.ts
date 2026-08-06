/** Extract readable executive brief text from platform AI response */
export function formatExecutiveBrief(brief: unknown): string {
  if (!brief) return "No executive brief generated yet.";
  if (typeof brief === "string") return brief;
  if (typeof brief !== "object") return String(brief);

  const obj = brief as Record<string, unknown>;
  const result = obj.result as Record<string, unknown> | undefined;
  const lines: string[] = [];

  const headline =
    obj.headline ||
    obj.summary ||
    result?.summary ||
    (result?.details as Record<string, unknown>)?.headline;
  if (headline) lines.push(String(headline));

  const answer =
    obj.answer ||
    result?.answer ||
    (result?.details as Record<string, unknown>)?.answer;
  if (answer) lines.push(String(answer));

  const recommendations = result?.recommendations;
  if (Array.isArray(recommendations) && recommendations.length) {
    lines.push("");
    lines.push("Recommendations:");
    recommendations.forEach((r) => lines.push(`• ${String(r)}`));
  }

  if (lines.length === 0) {
    return JSON.stringify(brief, null, 2);
  }
  return lines.join("\n\n");
}
