import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { platformClient } from "@/platform/track13/platformClient";

export function EnterpriseGlobalSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<Record<string, unknown>>>([]);

  const search = async () => {
    if (!query.trim()) return;
    const hits = await platformClient.enterpriseSearch(query.trim());
    setResults(hits);
  };

  return (
    <div className="px-2 pb-4 space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          className="pl-8 h-9 text-xs"
          placeholder="Search platform…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
        />
      </div>
      {results.length > 0 && (
        <ul className="text-xs space-y-1 max-h-32 overflow-auto">
          {results.slice(0, 5).map((r) => (
            <li key={String(r.id)} className="text-muted-foreground truncate">
              {String(r.title)} · {String(r.resource_type)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
