import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
import type { PageFilter } from "./types";

interface Props {
  filters: PageFilter[];
  onRemove: (id: string) => void;
}

const FilterBar = ({ filters, onRemove }: Props) => {
  if (!filters.length) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap px-3 py-2 border-b bg-muted/20">
      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
      {filters.map(f => (
        <Badge key={f.id} variant="secondary" className="gap-1 pr-1">
          <span className="text-xs">{f.field}</span>
          <span className="text-[10px] text-muted-foreground">
            {f.type === "multi" && f.values && `: ${f.values.slice(0, 2).join(", ")}${f.values.length > 2 ? ` +${f.values.length - 2}` : ""}`}
            {f.type === "range" && `: ${f.min ?? "-"}–${f.max ?? "-"}`}
            {f.type === "date" && `: ${f.startDate || "-"}…${f.endDate || "-"}`}
          </span>
          <Button size="icon" variant="ghost" className="h-4 w-4 ml-0.5" onClick={() => onRemove(f.id)}>
            <X className="h-3 w-3" />
          </Button>
        </Badge>
      ))}
    </div>
  );
};

export default FilterBar;
