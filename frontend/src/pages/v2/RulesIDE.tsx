import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import { Loader2, Play, Rocket, ShieldCheck, ShieldAlert, CircleAlert } from "lucide-react";
import { toast } from "sonner";
import { httpRequest } from "@/platform/httpClient";

type Entity = { type: string; name: string; label?: string };
type ValidateResult = {
  valid: boolean;
  condition: string;
  entities: Entity[];
  ast_nodes: string[];
  security_ok: boolean;
  errors: string[];
  security_violations: string[];
};

const SAMPLE = `# High Latency Guard

@module payments
@metric checkout.latency_ms

WHEN checkout.latency_ms > 500 THEN alert
`;

const TYPE_COLOR: Record<string, string> = {
  metric: "text-primary border-primary/40",
  module: "text-emerald-400 border-emerald-400/40",
  connector: "text-amber-400 border-amber-400/40",
  dataset: "text-violet-400 border-violet-400/40",
};

export default function RulesIDE() {
  const [source, setSource] = useState(SAMPLE);
  const [name, setName] = useState("High Latency Guard");
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const disposables = useRef<Monaco.IDisposable[]>([]);

  const defineTheme = useCallback((m: Monaco) => {
    m.editor.defineTheme("spaceforge-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [],
      colors: {
        "editor.background": "#1A1D24",
        "editorLineNumber.foreground": "#3A3F4B",
        "editor.lineHighlightBackground": "#20242D",
        "editorCursor.foreground": "#4F8BFF",
      },
    });
  }, []);

  const registerAtGraph = useCallback((m: Monaco) => {
    disposables.current.push(
      m.languages.registerCompletionItemProvider("markdown", {
        triggerCharacters: ["@"],
        provideCompletionItems: async (model, position) => {
          const line = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });
          const at = line.lastIndexOf("@");
          if (at < 0) return { suggestions: [] };
          const query = line.slice(at + 1);
          try {
            const env = await httpRequest<Entity[]>({
              method: "GET",
              path: "/api/v1/graph/entities/",
              query: { query },
              retries: 0,
            });
            const word = model.getWordUntilPosition(position);
            const range = new m.Range(position.lineNumber, at + 2, position.lineNumber, word.endColumn);
            return {
              suggestions: (env.data ?? []).map((e) => ({
                label: `@${e.name}`,
                kind: m.languages.CompletionItemKind.Value,
                detail: e.type,
                insertText: e.name,
                range,
              })),
            };
          } catch {
            return { suggestions: [] };
          }
        },
      })
    );
  }, []);

  useEffect(() => () => disposables.current.forEach((d) => d.dispose()), []);

  const validate = useCallback(async () => {
    setBusy(true);
    try {
      const env = await httpRequest<ValidateResult>({
        method: "POST",
        path: "/api/v1/rules/validate/",
        body: { source },
        retries: 0,
      });
      setResult(env.data ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validation failed");
    } finally {
      setBusy(false);
    }
  }, [source]);

  const deploy = useCallback(async () => {
    setBusy(true);
    try {
      const env = await httpRequest<{ rule_id: string; status: string }>({
        method: "POST",
        path: "/api/v1/rules/deploy/",
        body: { name, source },
        retries: 0,
      });
      toast.success(`Rule deployed — ${env.data?.rule_id?.slice(0, 8)} (${env.data?.status})`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Deploy failed (fix validation first)");
    } finally {
      setBusy(false);
    }
  }, [name, source]);

  const canDeploy = useMemo(() => result?.valid === true, [result]);

  return (
    <div className="h-full flex flex-col" data-testid="rules-ide">
      <div className="h-16 shrink-0 border-b border-border flex items-center gap-3 px-6">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid="rule-name-input"
          className="bg-secondary border border-border rounded-md px-3 py-1.5 text-sm font-mono w-72 focus:outline-none focus:border-primary"
        />
        <span className="text-xs font-mono text-muted-foreground">.rule.md</span>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={validate}
            disabled={busy}
            data-testid="rule-validate-button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border border-border hover:bg-secondary transition-colors"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />} Validate
          </button>
          <button
            onClick={deploy}
            disabled={busy || !canDeploy}
            data-testid="rule-deploy-button"
            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm bg-primary text-primary-foreground disabled:opacity-40 hover:opacity-90 transition-opacity"
          >
            <Rocket className="h-4 w-4" /> Deploy
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-2 min-h-0">
        {/* Editor */}
        <div className="border-r border-border min-h-0" data-testid="rules-editor-pane">
          <Editor
            height="100%"
            defaultLanguage="markdown"
            theme="spaceforge-dark"
            value={source}
            onChange={(v) => setSource(v ?? "")}
            beforeMount={(m) => {
              if (import.meta.env.DEV) {
                (window as unknown as { monaco?: Monaco }).monaco = m;
              }
              defineTheme(m);
              registerAtGraph(m);
            }}
            options={{
              fontFamily: "JetBrains Mono, monospace",
              fontSize: 13,
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              padding: { top: 16 },
            }}
          />
        </div>

        {/* Validation / Sandbox pane */}
        <div className="min-h-0 overflow-y-auto p-6 space-y-6" data-testid="rules-validation-pane">
          {!result ? (
            <div className="text-sm text-muted-foreground">
              Type <span className="font-mono text-foreground">@</span> to browse live entities, then{" "}
              <span className="font-mono text-foreground">Validate</span> to compile the AST.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3" data-testid="compile-status">
                {result.valid ? (
                  <span className="flex items-center gap-2 text-sm text-emerald-400">
                    <ShieldCheck className="h-4 w-4" /> Compiled — safe deterministic AST
                  </span>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-destructive">
                    <ShieldAlert className="h-4 w-4" /> Blocked — validation failed
                  </span>
                )}
              </div>

              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">Condition</div>
                <code className="block bg-card border border-border rounded-md px-3 py-2 text-xs font-mono">
                  {result.condition || "—"}
                </code>
              </div>

              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">
                  Entities ({result.entities.length})
                </div>
                <div className="flex flex-wrap gap-2" data-testid="entity-chips">
                  {result.entities.map((e) => (
                    <span
                      key={`${e.type}:${e.name}`}
                      className={`px-2.5 py-1 text-xs font-mono border rounded-md ${TYPE_COLOR[e.type] ?? "text-muted-foreground border-border"}`}
                    >
                      @{e.name}<span className="opacity-50 ml-1">{e.type}</span>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">AST Nodes</div>
                <div className="flex flex-wrap gap-1.5">
                  {result.ast_nodes.map((n) => (
                    <span key={n} className="px-2 py-0.5 text-[10px] font-mono border border-border rounded-md text-muted-foreground">
                      {n}
                    </span>
                  ))}
                </div>
              </div>

              {(result.security_violations.length > 0 || result.errors.length > 0) && (
                <div className="space-y-2" data-testid="rule-errors">
                  {[...result.security_violations, ...result.errors].map((msg, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                      <CircleAlert className="h-3.5 w-3.5 shrink-0" /> {msg}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
