import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ClipboardCheck, Plus, Loader2, CheckCircle2, Clock, X } from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface DecisionLogProps {
  datasetName: string;
  tileId?: string;
  tileTitle?: string;
}

interface Decision {
  id: string;
  decision: string;
  reasoning: string;
  expected_outcome: string;
  status: string;
  tile_title: string | null;
  created_at: string;
}

const DecisionLog = ({ datasetName, tileId, tileTitle }: DecisionLogProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({ decision: "", reasoning: "", expected_outcome: "" });
  const [showForm, setShowForm] = useState(false);

  const loadDecisions = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await backend
        .from('decision_log')
        .select('*')
        .eq('user_id', user.id)
        .eq('dataset_name', datasetName)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setDecisions((data || []) as Decision[]);
    } catch {
      // Silently fail
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) loadDecisions();
  }, [isOpen]);

  const handleSave = async () => {
    if (!user || !form.decision.trim()) return;
    setIsSaving(true);
    try {
      const { error } = await backend
        .from('decision_log')
        .insert({
          user_id: user.id,
          dataset_name: datasetName,
          tile_id: tileId,
          tile_title: tileTitle,
          decision: form.decision,
          reasoning: form.reasoning,
          expected_outcome: form.expected_outcome,
        });

      if (error) throw error;
      toast.success("Decision logged");
      setForm({ decision: "", reasoning: "", expected_outcome: "" });
      setShowForm(false);
      loadDecisions();
    } catch (err) {
      toast.error("Failed to save decision");
    } finally {
      setIsSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-600",
    resolved: "bg-emerald-500/10 text-emerald-600",
    failed: "bg-red-500/10 text-red-600",
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0">
          <ClipboardCheck className="h-4 w-4" />
          <span className="hidden sm:inline">Decisions</span>
          {decisions.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1">{decisions.length}</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Decision Log
          </DialogTitle>
        </DialogHeader>

        {!showForm && (
          <Button size="sm" className="gap-1.5 w-full" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Log a Decision
          </Button>
        )}

        {showForm && (
          <div className="space-y-2 p-3 rounded-lg border border-border/50 bg-muted/30">
            <Input
              placeholder="What decision are you making?"
              value={form.decision}
              onChange={(e) => setForm(f => ({ ...f, decision: e.target.value }))}
              className="h-8 text-sm"
            />
            <Textarea
              placeholder="Why? (reasoning)"
              value={form.reasoning}
              onChange={(e) => setForm(f => ({ ...f, reasoning: e.target.value }))}
              className="text-sm min-h-[60px]"
            />
            <Input
              placeholder="Expected outcome"
              value={form.expected_outcome}
              onChange={(e) => setForm(f => ({ ...f, expected_outcome: e.target.value }))}
              className="h-8 text-sm"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={isSaving || !form.decision.trim()} className="flex-1">
                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[350px]">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : decisions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No decisions logged yet.</p>
          ) : (
            <div className="space-y-2">
              {decisions.map((d) => (
                <div key={d.id} className="p-2.5 rounded-lg border border-border/50 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{d.decision}</p>
                    <Badge className={`text-[10px] shrink-0 ${statusColors[d.status] || statusColors.pending}`}>
                      {d.status === "pending" ? <Clock className="h-2.5 w-2.5 mr-0.5" /> : <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />}
                      {d.status}
                    </Badge>
                  </div>
                  {d.reasoning && <p className="text-xs text-muted-foreground">{d.reasoning}</p>}
                  {d.expected_outcome && <p className="text-xs text-primary/70">Expected: {d.expected_outcome}</p>}
                  {d.tile_title && <Badge variant="outline" className="text-[10px]">{d.tile_title}</Badge>}
                  <p className="text-[10px] text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DecisionLog;
