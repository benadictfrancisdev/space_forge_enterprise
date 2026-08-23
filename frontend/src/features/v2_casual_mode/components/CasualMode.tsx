import { ArrowRight } from "lucide-react";
import { useState, type FormEvent } from "react";

import { RuleCard } from "@/features/v2_casual_mode/components/RuleCard";
import {
  DEFAULT_CASUAL_RULES,
  translatePromptToRule,
} from "@/features/v2_casual_mode/translatePrompt";
import type { CasualRule } from "@/features/v2_casual_mode/types";

const STARTER_SUGGESTIONS = [
  "Stripe dispute spike guardrail",
  "Database lock > 3s circuit breaker",
  "API Latency > 450ms alert",
] as const;

export function CasualMode() {
  const [input, setInput] = useState("");
  const [rules, setRules] = useState<CasualRule[]>(DEFAULT_CASUAL_RULES);

  const handleSubmit = (event?: FormEvent) => {
    event?.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) return;

    const translated = translatePromptToRule(trimmed);

    setRules((current) => [
      {
        ...translated,
        id: crypto.randomUUID(),
        active: true,
      },
      ...current,
    ]);
    setInput("");
  };

  const handleToggleActive = (id: string, active: boolean) => {
    setRules((current) =>
      current.map((rule) => (rule.id === id ? { ...rule, active } : rule)),
    );
  };

  return (
    <div className="h-full w-full overflow-y-auto p-6">
      <div className="mx-auto flex max-w-3xl flex-col items-center px-4 py-8">
        <header className="text-center">
          <h1 className="font-mono text-3xl font-semibold leading-relaxed tracking-tight text-text-main">
            What do you want to automate?
          </h1>
          <p className="mt-2 text-sm leading-relaxed tracking-tight text-text-muted">
            Describe your guardrails or workflows in plain English.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="mt-8 w-full rounded-md border border-v2-border bg-surface p-4 shadow-v2-inner transition-all focus-within:border-v2-primary"
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            rows={4}
            placeholder="e.g. If Stripe failed charges exceed 5 in an hour, send an alert and lock new checkouts..."
            className="w-full resize-none bg-transparent font-mono text-sm leading-relaxed tracking-tight text-text-main outline-none placeholder:text-text-muted"
          />

          <div className="mt-4 flex items-center justify-between gap-4 border-t border-v2-border pt-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
              Zero-Burn AI Gateway
            </p>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md bg-v2-primary px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-v2-primary/90"
            >
              Generate Rule
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </form>

        <div className="mt-4 flex w-full flex-wrap gap-2">
          {STARTER_SUGGESTIONS.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="rounded-md border border-v2-border bg-v2-background px-4 py-2 font-mono text-xs text-text-muted transition-colors hover:border-v2-primary hover:text-text-main"
            >
              {suggestion}
            </button>
          ))}
        </div>

        <section className="mt-8 w-full">
          <h2 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">
            Active Guardrails
          </h2>

          {rules.map((rule) => (
            <RuleCard key={rule.id} rule={rule} onToggleActive={handleToggleActive} />
          ))}
        </section>
      </div>
    </div>
  );
}
