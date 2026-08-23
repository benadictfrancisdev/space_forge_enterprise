import type { CasualRule } from "@/features/v2_casual_mode/types";

type TranslatedRule = Omit<CasualRule, "id" | "active">;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function buildRuleMd(
  id: string,
  name: string,
  whenClause: string,
  thenClause: string,
): string {
  return `---
id: ${id}
version: "1.0.0"
name: ${name}
owner: casual-mode
---

# ${name}

${whenClause}
${thenClause}`;
}

const PRESET_TRANSLATIONS: Record<string, TranslatedRule> = {
  "stripe dispute spike guardrail": {
    title: "Stripe Dispute Spike Guardrail",
    summary:
      "Monitors failed Stripe charges and escalates when more than 5 disputes occur within an hour.",
    tags: [
      { type: "metric", identifier: "stripe.failed_charges" },
      { type: "module", identifier: "incident_loop" },
      { type: "connector", identifier: "stripe_production" },
    ],
    ruleMd: buildRuleMd(
      "stripe-dispute-spike",
      "Stripe Dispute Spike Guardrail",
      "WHEN @metric:stripe.failed_charges > 5 IN 1h",
      "THEN trigger @module:incident_loop AND notify @connector:stripe_production",
    ),
  },
  "database lock > 3s circuit breaker": {
    title: "Database Lock Circuit Breaker",
    summary:
      "Opens a circuit breaker when database lock wait time exceeds 3 seconds to protect checkout throughput.",
    tags: [
      { type: "metric", identifier: "db.lock_wait_ms" },
      { type: "module", identifier: "circuit_breaker" },
    ],
    ruleMd: buildRuleMd(
      "db-lock-circuit-breaker",
      "Database Lock Circuit Breaker",
      "WHEN @metric:db.lock_wait_ms > 3000",
      "THEN trigger @module:circuit_breaker",
    ),
  },
  "api latency > 450ms alert": {
    title: "API Latency Alert",
    summary:
      "Sends an alert when API latency crosses 450ms so on-call can intervene before customer impact.",
    tags: [
      { type: "metric", identifier: "api.latency" },
      { type: "module", identifier: "incident_loop" },
    ],
    ruleMd: buildRuleMd(
      "api-latency-alert",
      "API Latency Alert",
      "WHEN @metric:api.latency > 450",
      "THEN trigger @module:incident_loop",
    ),
  },
};

export const DEFAULT_CASUAL_RULES: CasualRule[] = [
  {
    id: "checkout-latency-guard",
    title: "Checkout Latency Breaker",
    summary:
      "Triggers the incident workflow when checkout API latency exceeds 500ms during peak traffic.",
    tags: [
      { type: "metric", identifier: "api.latency" },
      { type: "module", identifier: "incident_loop" },
    ],
    active: true,
    ruleMd: buildRuleMd(
      "checkout-latency-guard",
      "Checkout Latency Guard",
      "WHEN @metric:api.latency > 500",
      "THEN trigger @module:incident_loop",
    ),
  },
];

/** Simulates Zero-Burn AI Gateway translation from natural language to .rule.md */
export function translatePromptToRule(prompt: string): TranslatedRule {
  const normalized = prompt.trim().toLowerCase();

  if (PRESET_TRANSLATIONS[normalized]) {
    return PRESET_TRANSLATIONS[normalized];
  }

  if (normalized.includes("stripe") || normalized.includes("dispute")) {
    return PRESET_TRANSLATIONS["stripe dispute spike guardrail"];
  }

  if (normalized.includes("database") || normalized.includes("lock")) {
    return PRESET_TRANSLATIONS["database lock > 3s circuit breaker"];
  }

  if (normalized.includes("latency") || normalized.includes("api")) {
    return PRESET_TRANSLATIONS["api latency > 450ms alert"];
  }

  const id = slugify(prompt) || "custom-guardrail";
  const title = prompt.trim().slice(0, 64) || "Custom Guardrail";

  return {
    title,
    summary: `Automates the workflow: "${prompt.trim()}"`,
    tags: [{ type: "module", identifier: "incident_loop" }],
    ruleMd: buildRuleMd(
      id,
      title,
      "WHEN @metric:custom.signal > threshold",
      "THEN trigger @module:incident_loop",
    ),
  };
}
