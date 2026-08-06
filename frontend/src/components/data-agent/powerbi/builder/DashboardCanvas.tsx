import { useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout/legacy";
type Layout = { i: string; x: number; y: number; w: number; h: number };
import "react-grid-layout/css/styles.css";

import { Card } from "@/components/ui/card";
import { GripVertical, X } from "lucide-react";
import TileRenderer from "./TileRenderer";
import type { BuilderTile, DashboardTheme } from "./types";
import type { CalculatedField } from "@/lib/formulaEngine";
import { cn } from "@/lib/utils";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface Props {
  tiles: BuilderTile[];
  rows: Record<string, unknown>[];
  theme: DashboardTheme;
  calculatedFields: CalculatedField[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onLayoutChange: (tiles: BuilderTile[]) => void;
  onSlicerChange?: (tileId: string, value: unknown) => void;
  onDelete?: (id: string) => void;
}

const DashboardCanvas = ({
  tiles, rows, theme, calculatedFields, selectedId, onSelect, onLayoutChange, onSlicerChange, onDelete,
}: Props) => {
  const layouts = useMemo(() => {
    const lg = tiles.map(t => ({ i: t.id, x: t.layout.x, y: t.layout.y, w: t.layout.w, h: t.layout.h, minW: 2, minH: 2 }));
    return { lg, md: lg, sm: tiles.map((t, i) => ({ i: t.id, x: 0, y: i * 4, w: 6, h: t.layout.h, minW: 2, minH: 2 })), xs: tiles.map((t, i) => ({ i: t.id, x: 0, y: i * 4, w: 4, h: t.layout.h, minW: 2, minH: 2 })) };
  }, [tiles]);

  const handleChange = (current: Layout[]) => {
    const map = new Map(current.map(l => [l.i, l]));
    onLayoutChange(tiles.map(t => {
      const l = map.get(t.id);
      return l ? { ...t, layout: { x: l.x, y: l.y, w: l.w, h: l.h } } : t;
    }));
  };

  if (!tiles.length) {
    return (
      <div className="h-full flex items-center justify-center text-center px-6">
        <div className="max-w-sm">
          <div className="text-lg font-semibold mb-2">Empty canvas</div>
          <p className="text-sm text-muted-foreground">
            Add a chart from the left panel, pick a smart suggestion, or apply a template to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 0 }}
      cols={{ lg: 12, md: 12, sm: 6, xs: 4 }}
      rowHeight={60}
      margin={[12, 12]}
      onLayoutChange={handleChange}
      draggableHandle=".tile-drag-handle"
      compactType="vertical"
    >
      {tiles.map(t => (
        <div key={t.id}>
          <Card
            onClick={() => onSelect(t.id)}
            className={cn(
              "h-full w-full flex flex-col overflow-hidden group transition-all",
              selectedId === t.id ? "ring-2 ring-primary" : "hover:ring-1 hover:ring-border"
            )}
          >
            <div className="tile-drag-handle flex items-center justify-between px-2 py-1 border-b cursor-move bg-muted/30">
              <div className="flex items-center gap-1.5 min-w-0">
                <GripVertical className="h-3 w-3 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium truncate">{t.title || "Untitled"}</span>
              </div>
              {onDelete && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(t.id); }}
                  className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <TileRenderer
                tile={t}
                rows={rows}
                theme={theme}
                calculatedFields={calculatedFields}
                onSlicerChange={onSlicerChange}
              />
            </div>
          </Card>
        </div>
      ))}
    </ResponsiveGridLayout>
  );
};

export default DashboardCanvas;
