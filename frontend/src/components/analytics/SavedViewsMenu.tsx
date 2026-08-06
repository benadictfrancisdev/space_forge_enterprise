import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FilterState } from "./FilterBar";

interface SavedView {
  id: string;
  name: string;
  module: string;
  filter: FilterState;
  datasetName: string | null;
  createdAt: number;
}

const KEY = "spaceforge-analytics-saved-views";

const load = (): SavedView[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
};

const persist = (v: SavedView[]) => localStorage.setItem(KEY, JSON.stringify(v));

interface Props {
  currentModule: string;
  currentFilter: FilterState;
  datasetName: string | null;
  onApply: (v: SavedView) => void;
}

const SavedViewsMenu = ({ currentModule, currentFilter, datasetName, onApply }: Props) => {
  const [views, setViews] = useState<SavedView[]>([]);
  useEffect(() => setViews(load()), []);

  const saveCurrent = () => {
    const name = prompt("Name this view");
    if (!name) return;
    const next: SavedView = {
      id: `${Date.now()}`,
      name,
      module: currentModule,
      filter: currentFilter,
      datasetName,
      createdAt: Date.now(),
    };
    const all = [...load(), next];
    persist(all);
    setViews(all);
    toast.success(`Saved view "${name}"`);
  };

  const remove = (id: string) => {
    const all = load().filter((v) => v.id !== id);
    persist(all);
    setViews(all);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 text-xs">
          <Bookmark className="w-3.5 h-3.5 mr-1.5" />
          Views
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={saveCurrent}>
          <Plus className="w-3.5 h-3.5 mr-2" />
          Save current view
        </DropdownMenuItem>
        {views.length > 0 && <DropdownMenuSeparator />}
        {views.length > 0 && <DropdownMenuLabel className="text-xs">Saved</DropdownMenuLabel>}
        {views.map((v) => (
          <DropdownMenuItem
            key={v.id}
            className="flex items-center justify-between"
            onSelect={(e) => {
              e.preventDefault();
              onApply(v);
            }}
          >
            <div className="flex flex-col min-w-0">
              <span className="text-xs truncate">{v.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {v.module} · {v.filter.preset}
              </span>
            </div>
            <Trash2
              className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                remove(v.id);
              }}
            />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default SavedViewsMenu;
export type { SavedView };
