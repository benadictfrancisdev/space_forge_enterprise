import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LayoutTemplate } from "lucide-react";
import { DASHBOARD_TEMPLATES, type DashboardTemplate } from "@/data/dashboardTemplates";
import type { BuilderTile } from "./types";
import { toast } from "sonner";
import { useState } from "react";

interface Props {
  columns: string[];
  onApply: (tiles: BuilderTile[]) => void;
}

function fuzzyMatch(needle: string, columns: string[]): string | undefined {
  const n = needle.toLowerCase();
  return columns.find(c => c.toLowerCase() === n)
    || columns.find(c => c.toLowerCase().includes(n))
    || columns.find(c => n.includes(c.toLowerCase()));
}

function adaptTemplate(tpl: DashboardTemplate, columns: string[]): BuilderTile[] {
  return tpl.tiles.map(t => ({
    ...t,
    id: Math.random().toString(36).slice(2, 9),
    xField: t.xField ? fuzzyMatch(t.xField, columns) || columns[0] : t.xField,
    yField: t.yField ? fuzzyMatch(t.yField, columns) || columns.find(c => c !== t.xField) : t.yField,
    valueField: t.valueField ? fuzzyMatch(t.valueField, columns) || columns[0] : t.valueField,
  }));
}

const TemplateGallery = ({ columns, onApply }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <LayoutTemplate className="h-3.5 w-3.5" /> Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>Pre-built Templates</DialogTitle></DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-auto">
          {DASHBOARD_TEMPLATES.map(t => (
            <Card key={t.id} className="p-3 cursor-pointer hover:ring-2 hover:ring-primary/40 transition"
              onClick={() => {
                if (!columns.length) { toast.error("Load a dataset first"); return; }
                onApply(adaptTemplate(t, columns));
                toast.success(`Applied "${t.name}"`);
                setOpen(false);
              }}>
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">{t.name}</div>
                <Badge variant="outline" className="text-[10px]">{t.category}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{t.description}</p>
              <div className="text-[10px] text-muted-foreground mt-2">{t.tiles.length} tiles</div>
            </Card>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateGallery;
