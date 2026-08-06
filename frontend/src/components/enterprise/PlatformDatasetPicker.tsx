import { Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Dataset } from "@/platform/djangoAdapter";

type Props = {
  datasets: Dataset[];
  value: string;
  onChange: (id: string) => void;
  loading?: boolean;
  className?: string;
};

export function PlatformDatasetPicker({ datasets, value, onChange, loading, className }: Props) {
  return (
    <Select value={value} onValueChange={onChange} disabled={loading}>
      <SelectTrigger className={className ?? "w-64"}>
        {loading ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Loading…
          </span>
        ) : (
          <SelectValue placeholder="Select dataset" />
        )}
      </SelectTrigger>
      <SelectContent>
        {datasets.map((d) => (
          <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
