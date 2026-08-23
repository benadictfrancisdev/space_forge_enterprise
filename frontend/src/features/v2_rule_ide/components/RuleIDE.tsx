import Editor from "@monaco-editor/react";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { useRuleValidation } from "@/features/v2_rule_ide/hooks/useRuleValidation";

const DEFAULT_RULE = `---
id: checkout-latency-guard
version: "1.0.0"
name: Checkout Latency Guard
owner: platform-team
target_modules:
  - api/v1/checkout
connectors:
  - stripe_production
---

# Checkout Latency Guard

WHEN @metric:api.latency > 500 THEN trigger @module:incident_loop`;

function tagTypeColor(type: string): string {
  switch (type) {
    case "metric":
      return "text-v2-primary";
    case "module":
      return "text-purple-400";
    case "connector":
      return "text-orange-400";
    default:
      return "text-text-muted";
  }
}

export function RuleIDE() {
  const [content, setContent] = useState(DEFAULT_RULE);
  const { isValid, extractedTags, errors, isAnalyzing } = useRuleValidation(content);

  return (
    <section className="flex h-[calc(100vh-4rem)] flex-col overflow-hidden rounded-md border border-v2-border bg-surface">
      <div className="grid h-full min-h-0 flex-1 grid-cols-2 overflow-hidden">
        <div className="flex min-h-0 flex-col overflow-hidden border-r border-v2-border">
          <header className="border-b border-v2-border px-4 py-4">
            <h2 className="font-mono text-xs font-medium uppercase tracking-wide text-text-muted">
              Markdown-as-Logic Editor
            </h2>
          </header>
          <div className="min-h-0 flex-1 overflow-hidden">
            <Editor
              height="100%"
              defaultLanguage="markdown"
              theme="vs-dark"
              value={content}
              onChange={(value) => setContent(value ?? "")}
              options={{
                minimap: { enabled: false },
                fontFamily: "JetBrains Mono, monospace",
                fontSize: 14,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                renderLineHighlight: "none",
                overviewRulerLanes: 0,
                hideCursorInOverviewRuler: true,
              }}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-b border-v2-border px-4 py-4">
            <h2 className="font-mono text-xs font-medium uppercase tracking-wide text-text-muted">
              Live Sandbox Validation
            </h2>
            {isAnalyzing && (
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-text-muted">
                <Loader2 className="h-3 w-3 animate-spin" />
                Analyzing AST...
              </span>
            )}
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4">
            {isValid ? (
              <div className="rounded-md border border-green-800/50 bg-green-900/20 px-4 py-4 font-mono text-sm text-green-400">
                [✓] AST COMPILED & SECURE
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-md border border-red-800/50 bg-red-950/40 px-4 py-4 font-mono text-sm text-red-400">
                  [!] COMPILATION FAILED
                </div>
                <ul className="space-y-2">
                  {errors.map((error) => (
                    <li key={error} className="font-mono text-xs leading-5 text-red-400">
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-4">
              <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-text-muted">
                TARGETED INFRASTRUCTURE
              </h3>

              {extractedTags.length === 0 ? (
                <p className="rounded-md border border-dashed border-v2-border bg-v2-background px-4 py-4 font-mono text-xs text-text-muted">
                  No @type:identifier tags detected yet.
                </p>
              ) : (
                <div className="grid gap-2">
                  {extractedTags.map((tag) => (
                    <div
                      key={`${tag.type}:${tag.identifier}`}
                      className="flex items-center gap-2 rounded-md border border-v2-border bg-surface px-2 py-1 font-mono text-xs"
                    >
                      <span className={`uppercase tracking-wide ${tagTypeColor(tag.type)}`}>
                        {tag.type}
                      </span>
                      <span className="text-text-muted">:</span>
                      <span className="text-text-main">{tag.identifier}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
