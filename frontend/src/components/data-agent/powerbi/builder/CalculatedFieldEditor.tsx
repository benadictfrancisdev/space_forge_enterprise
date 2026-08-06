import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, FunctionSquare } from "lucide-react";
import { validateFormula, type CalculatedField } from "@/lib/formulaEngine";
import { toast } from "sonner";

interface Props {
  fields: CalculatedField[];
  onChange: (fields: CalculatedField[]) => void;
}

const CalculatedFieldEditor = ({ fields, onChange }: Props) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [formula, setFormula] = useState("");

  const add = () => {
    const v = validateFormula(formula);
    if (!v.ok) { toast.error(`Invalid formula: ${v.error}`); return; }
    if (!name.trim()) { toast.error("Name required"); return; }
    onChange([...fields, { id: Math.random().toString(36).slice(2, 9), name: name.trim(), formula }]);
    setName(""); setFormula(""); setOpen(false);
    toast.success("Calculated field added");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs flex items-center gap-1"><FunctionSquare className="h-3 w-3" /> Calculated Fields</Label>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 px-2"><Plus className="h-3 w-3" /></Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New calculated field</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Profit Margin" />
              </div>
              <div>
                <Label className="text-xs">Formula</Label>
                <Input value={formula} onChange={e => setFormula(e.target.value)} placeholder="PCT(profit, revenue)" className="font-mono text-sm" />
                <div className="text-[10px] text-muted-foreground mt-1">
                  Functions: SUM, AVG, MIN, MAX, COUNT, PCT(a,b), GROWTH(col), IF(cond, a, b). Operators: + - * / &gt; &lt; ==
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={add}>Add field</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-1">
        {fields.length === 0 && <div className="text-[11px] text-muted-foreground">No formulas yet.</div>}
        {fields.map(f => (
          <div key={f.id} className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-muted/40 text-xs">
            <div className="min-w-0">
              <div className="font-medium truncate">{f.name}</div>
              <div className="font-mono text-[10px] text-muted-foreground truncate">{f.formula}</div>
            </div>
            <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => onChange(fields.filter(x => x.id !== f.id))}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CalculatedFieldEditor;
