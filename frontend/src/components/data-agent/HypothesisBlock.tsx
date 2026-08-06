/**
 * HypothesisBlock — renders structured Hypothesis → Test → Result blocks
 * for the Full Report. Each block presents a scientific reasoning narrative
 * backed by a statistical test (Welch's t-test, correlation, seasonality, etc).
 */
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, FlaskConical, CheckCircle2, XCircle, Minus, TrendingUp, TrendingDown } from "lucide-react";
import type { PoPDelta, DriverScore, SeasonalityResult } from "@/lib/advancedStats";

export interface HypothesisItem {
  id: string;
  hypothesis: string;          // "H1: Revenue grew period-over-period"
  test: string;                // "Welch's t-test on first vs second half"
  resultText: string;          // human summary
  verdict: "supported" | "rejected" | "inconclusive";
  pValue?: number;
  effectSize?: number | string;
  direction?: "up" | "down" | "flat" | "positive" | "negative";
  evidence?: { label: string; value: string }[];
}

interface Props {
  items: HypothesisItem[];
}

const verdictStyle: Record<HypothesisItem["verdict"], string> = {
  supported: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40",
  rejected: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/40",
  inconclusive: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40",
};

function VerdictIcon({ verdict }: { verdict: HypothesisItem["verdict"] }) {
  if (verdict === "supported") return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
  if (verdict === "rejected") return <XCircle className="w-3.5 h-3.5 text-rose-500" />;
  return <Minus className="w-3.5 h-3.5 text-amber-500" />;
}

function DirIcon({ direction }: { direction?: string }) {
  if (direction === "up" || direction === "positive") return <TrendingUp className="w-3 h-3 text-emerald-500" />;
  if (direction === "down" || direction === "negative") return <TrendingDown className="w-3 h-3 text-rose-500" />;
  return null;
}

const HypothesisBlock = ({ items }: Props) => {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-3">
      {items.map((h, idx) => (
        <Card key={h.id || idx} className="border-l-4 border-l-primary/60">
          <CardContent className="pt-4 pb-3 space-y-2.5">
            {/* Hypothesis */}
            <div className="flex items-start gap-2">
              <Beaker className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Hypothesis {idx + 1}
                </p>
                <p className="text-sm font-medium text-foreground leading-snug">{h.hypothesis}</p>
              </div>
            </div>

            {/* Test */}
            <div className="flex items-start gap-2 pl-6">
              <FlaskConical className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  Statistical Test
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{h.test}</p>
              </div>
            </div>

            {/* Result */}
            <div className="flex items-start gap-2 pl-6">
              <VerdictIcon verdict={h.verdict} />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                    Result
                  </p>
                  <Badge variant="outline" className={`text-[9px] py-0 px-1.5 ${verdictStyle[h.verdict]}`}>
                    {h.verdict}
                  </Badge>
                  <DirIcon direction={h.direction} />
                  {h.pValue != null && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      p = {h.pValue < 0.001 ? "<0.001" : h.pValue.toFixed(3)}
                    </Badge>
                  )}
                  {h.effectSize != null && (
                    <Badge variant="outline" className="text-[9px] py-0 px-1.5">
                      effect: {h.effectSize}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-foreground/90 leading-relaxed">{h.resultText}</p>
                {h.evidence && h.evidence.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {h.evidence.map((e, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-muted/60 border border-border/60 rounded px-1.5 py-0.5"
                      >
                        <span className="text-muted-foreground">{e.label}: </span>
                        <span className="text-foreground font-medium">{e.value}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default HypothesisBlock;

// ─── Builders ──────────────────────────────────────────────────────────────

/**
 * Convert Period-over-Period deltas into Hypothesis items.
 */
export function hypothesesFromDeltas(deltas: PoPDelta[]): HypothesisItem[] {
  return deltas.slice(0, 5).map((d, i) => {
    const moved = d.direction === "flat"
      ? `did not change meaningfully (Δ ${d.deltaPct.toFixed(1)}%)`
      : `${d.direction === "up" ? "increased" : "decreased"} by ${Math.abs(d.deltaPct).toFixed(1)}%`;
    const verdict: HypothesisItem["verdict"] =
      d.significant ? "supported" : d.direction === "flat" ? "inconclusive" : "inconclusive";
    return {
      id: `delta-${i}-${d.metric}`,
      hypothesis: `H${i + 1}: ${d.metric} changed period-over-period.`,
      test: `Welch's two-sample t-test comparing first half vs second half of ${d.metric}.`,
      resultText: `${d.metric} ${moved} (mean ${d.previous} → ${d.current}). ${
        d.significant ? "Statistically significant." : "Not statistically significant — change may be noise."
      } Effect magnitude: ${d.effectMagnitude}.`,
      verdict,
      pValue: d.pValue,
      effectSize: d.effectMagnitude,
      direction: d.direction,
      evidence: [
        { label: "previous", value: String(d.previous) },
        { label: "current", value: String(d.current) },
        { label: "Δ%", value: `${d.deltaPct.toFixed(1)}%` },
      ],
    };
  });
}

/**
 * Convert driver attribution scores into Hypothesis items
 * ("Does feature X drive target Y?").
 */
export function hypothesesFromDrivers(
  target: string,
  drivers: DriverScore[],
): HypothesisItem[] {
  return drivers.slice(0, 3).map((d, i) => {
    const verdict: HypothesisItem["verdict"] =
      d.strength === "strong" || d.strength === "moderate" ? "supported"
        : d.strength === "weak" ? "inconclusive" : "rejected";
    return {
      id: `driver-${target}-${d.driver}`,
      hypothesis: `H: ${d.driver} is associated with ${target}.`,
      test: `Pearson correlation between ${d.driver} and ${target}.`,
      resultText: `Correlation r = ${d.correlation} (${d.strength}, ${d.direction}). ${
        d.strength === "strong" ? "Strong evidence of relationship." :
        d.strength === "moderate" ? "Moderate evidence of relationship." :
        d.strength === "weak" ? "Weak relationship — likely confounded." :
        "No meaningful relationship detected."
      } Explains ${(d.shareOfVariance * 100).toFixed(1)}% of variance.`,
      verdict,
      effectSize: d.strength,
      direction: d.direction,
      evidence: [
        { label: "r", value: String(d.correlation) },
        { label: "r²", value: d.shareOfVariance.toFixed(3) },
      ],
    };
  });
}

/**
 * Convert seasonality detections into Hypothesis items.
 */
export function hypothesesFromSeasonality(
  entries: { column: string; result: SeasonalityResult }[],
): HypothesisItem[] {
  return entries.slice(0, 3).map((e, i) => {
    const best = e.result.candidates[0];
    return {
      id: `season-${i}-${e.column}`,
      hypothesis: `H: ${e.column} exhibits a recurring seasonal cycle.`,
      test: `Autocorrelation analysis at common lags (${e.result.candidates.map(c => c.label).join(", ")}).`,
      resultText: e.result.detected
        ? `Strongest autocorrelation at lag ${best?.lag} (${best?.label}) with r = ${best?.r}. Seasonal pattern detected.`
        : `No significant seasonality detected (max autocorrelation < 0.3).`,
      verdict: e.result.detected ? "supported" : "rejected",
      effectSize: e.result.strength.toFixed(2),
      evidence: e.result.candidates.slice(0, 3).map(c => ({
        label: c.label,
        value: `r=${c.r}`,
      })),
    };
  });
}
