import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "lucide-react";

export type DateRangePreset = "all" | "7d" | "30d" | "90d" | "qtd" | "ytd";

export interface FilterState {
  dateColumn: string | null;
  preset: DateRangePreset;
}

interface Props {
  dateColumns: string[];
  value: FilterState;
  onChange: (next: FilterState) => void;
  rightSlot?: React.ReactNode;
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "qtd", label: "QTD" },
  { key: "ytd", label: "YTD" },
];

const FilterBar = ({ dateColumns, value, onChange, rightSlot }: Props) => {
  const hasDate = dateColumns.length > 0;
  return (
    <div className="flex flex-wrap items-center gap-2 p-3 border border-border/60 rounded-lg bg-card">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Calendar className="w-4 h-4" />
        <span>Date column</span>
      </div>
      <Select
        value={value.dateColumn ?? "__none"}
        onValueChange={(v) =>
          onChange({ ...value, dateColumn: v === "__none" ? null : v })
        }
        disabled={!hasDate}
      >
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder={hasDate ? "Select date column" : "No date column"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">None</SelectItem>
          {dateColumns.map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex items-center gap-1">
        {PRESETS.map((p) => (
          <Button
            key={p.key}
            size="sm"
            variant={value.preset === p.key ? "default" : "outline"}
            className="h-7 px-2 text-xs"
            disabled={p.key !== "all" && !value.dateColumn}
            onClick={() => onChange({ ...value, preset: p.key })}
          >
            {p.label}
          </Button>
        ))}
      </div>
      {rightSlot && <div className="ml-auto">{rightSlot}</div>}
    </div>
  );
};

export const applyFilter = <T extends Record<string, unknown>>(
  rows: T[],
  filter: FilterState,
): T[] => {
  if (!filter.dateColumn || filter.preset === "all") return rows;
  const now = new Date();
  let from: Date;
  switch (filter.preset) {
    case "7d":
      from = new Date(now.getTime() - 7 * 86400000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 86400000);
      break;
    case "90d":
      from = new Date(now.getTime() - 90 * 86400000);
      break;
    case "qtd": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      from = new Date(now.getFullYear(), q, 1);
      break;
    }
    case "ytd":
      from = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return rows;
  }
  return rows.filter((r) => {
    const v = r[filter.dateColumn as keyof T];
    if (v == null) return false;
    const t = Date.parse(String(v));
    return !Number.isNaN(t) && t >= from.getTime();
  });
};

export const useDateColumns = (
  types: Record<string, "numeric" | "date" | "categorical">,
) => useMemo(() => Object.keys(types).filter((k) => types[k] === "date"), [types]);

export default FilterBar;
