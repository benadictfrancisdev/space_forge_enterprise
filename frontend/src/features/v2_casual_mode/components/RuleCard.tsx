import { ChevronDown } from "lucide-react";
import { useState } from "react";

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import type { CasualRule } from "@/features/v2_casual_mode/types";

type RuleCardProps = {
  rule: CasualRule;
  onToggleActive: (id: string, active: boolean) => void;
};

function tagTypeColor(type: string): string {
  switch (type) {
    case "metric":
      return "text-v2-primary border-v2-primary/30";
    case "module":
      return "text-purple-400 border-purple-800/50";
    case "connector":
      return "text-orange-400 border-orange-800/50";
    default:
      return "text-text-muted border-v2-border";
  }
}

export function RuleCard({ rule, onToggleActive }: RuleCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <article className="mt-4 flex w-full flex-col gap-3 rounded-md border border-v2-border bg-surface p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-mono text-base font-semibold text-text-main">{rule.title}</h3>
          <p className="text-sm leading-6 text-text-muted">{rule.summary}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">
            {rule.active ? "Active" : "Paused"}
          </span>
          <Switch
            checked={rule.active}
            onCheckedChange={(checked) => onToggleActive(rule.id, checked)}
            className="data-[state=checked]:bg-v2-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {rule.tags.map((tag) => (
          <span
            key={`${tag.type}:${tag.identifier}`}
            className={`rounded-md border bg-v2-background px-2 py-1 font-mono text-xs ${tagTypeColor(tag.type)}`}
          >
            @{tag.type}:{tag.identifier}
          </span>
        ))}
      </div>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-v2-primary transition-colors hover:text-v2-primary/80">
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
          View Logic
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4 rounded-md border border-v2-border bg-v2-background p-4">
          <pre className="overflow-x-auto font-mono text-xs leading-6 text-text-main whitespace-pre-wrap">
            {rule.ruleMd}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}
