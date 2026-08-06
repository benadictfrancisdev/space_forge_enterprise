import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette } from "lucide-react";
import { DEFAULT_PALETTE, type DashboardTheme } from "./types";

const PRESETS: { name: string; colors: string[] }[] = [
  { name: "SpaceForge", colors: DEFAULT_PALETTE },
  { name: "Vibrant", colors: ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#8b5cf6"] },
  { name: "Earthy", colors: ["#a16207", "#65a30d", "#0891b2", "#7c2d12", "#ca8a04", "#15803d"] },
  { name: "Mono", colors: ["#0f172a", "#334155", "#64748b", "#94a3b8", "#cbd5e1", "#e2e8f0"] },
  { name: "Pastel", colors: ["#fda4af", "#fde68a", "#a7f3d0", "#bae6fd", "#c4b5fd", "#fbcfe8"] },
];

interface Props {
  theme: DashboardTheme;
  onChange: (theme: DashboardTheme) => void;
}

const ThemePicker = ({ theme, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Palette className="h-3.5 w-3.5" /> Theme
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-3">
          <div>
            <Label className="text-xs">Mode</Label>
            <Select value={theme.mode} onValueChange={v => onChange({ ...theme, mode: v as "light" | "dark" | "auto" })}>
              <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Color palette</Label>
            <div className="grid grid-cols-1 gap-1.5 mt-1">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => onChange({ ...theme, palette: p.colors })}
                  className="flex items-center gap-2 p-1.5 rounded border hover:bg-muted/50 transition text-left"
                >
                  <div className="flex gap-0.5">
                    {p.colors.slice(0, 5).map((c, i) => (
                      <div key={i} className="w-3 h-3 rounded-sm" style={{ background: c }} />
                    ))}
                  </div>
                  <span className="text-xs">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-xs">Custom accent</Label>
            <Input
              type="color"
              value={theme.accent || "#6366f1"}
              onChange={e => onChange({ ...theme, accent: e.target.value })}
              className="h-8"
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ThemePicker;
