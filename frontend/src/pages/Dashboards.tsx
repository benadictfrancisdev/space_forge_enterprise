import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Save, FileDown, Image as ImageIcon, FileSpreadsheet, Share2, Plus, Database,
  BarChart3, LineChart, PieChart, Activity, Hash, Type, Calendar, Settings2,
  Sparkles, Copy, Trash2, FolderOpen, Loader2, Users, Eye,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { backend } from "@/platform";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import * as Papa from "papaparse";
import { toPng, toJpeg } from "html-to-image";
import jsPDF from "jspdf";


import DashboardCanvas from "@/components/data-agent/powerbi/builder/DashboardCanvas";
import FormatPanel from "@/components/data-agent/powerbi/builder/FormatPanel";
import FilterBar from "@/components/data-agent/powerbi/builder/FilterBar";
import ThemePicker from "@/components/data-agent/powerbi/builder/ThemePicker";
import TemplateGallery from "@/components/data-agent/powerbi/builder/TemplateGallery";
import SmartSuggestPanel from "@/components/data-agent/powerbi/builder/SmartSuggestPanel";
import CalculatedFieldEditor from "@/components/data-agent/powerbi/builder/CalculatedFieldEditor";
import {
  emptyDashboard, type BuilderTile, type ChartType, type DashboardDoc, type PageFilter,
} from "@/components/data-agent/powerbi/builder/types";

const CHART_BUTTONS: { type: ChartType; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { type: "kpi", icon: Hash, label: "KPI" },
  { type: "bar", icon: BarChart3, label: "Bar" },
  { type: "line", icon: LineChart, label: "Line" },
  { type: "area", icon: Activity, label: "Area" },
  { type: "pie", icon: PieChart, label: "Pie" },
  { type: "donut", icon: PieChart, label: "Donut" },
  { type: "scatter", icon: Activity, label: "Scatter" },
  { type: "heatmap", icon: BarChart3, label: "Heatmap" },
  { type: "treemap", icon: BarChart3, label: "Treemap" },
  { type: "funnel", icon: BarChart3, label: "Funnel" },
  { type: "gauge", icon: Activity, label: "Gauge" },
  { type: "combo", icon: BarChart3, label: "Combo" },
  { type: "table", icon: Type, label: "Table" },
  { type: "slicer", icon: Settings2, label: "Slicer" },
  { type: "dateSlicer", icon: Calendar, label: "Date" },
];

interface DatasetOption { id: string; name: string; columns: string[]; rows: Record<string, unknown>[] }

function defaultLayoutFor(type: ChartType): BuilderTile["layout"] {
  if (type === "kpi") return { x: 0, y: 0, w: 3, h: 2 };
  if (type === "slicer" || type === "dateSlicer") return { x: 0, y: 0, w: 3, h: 3 };
  if (type === "table") return { x: 0, y: 0, w: 6, h: 5 };
  return { x: 0, y: 0, w: 6, h: 4 };
}

const Dashboards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLDivElement>(null);

  const [doc, setDoc] = useState<DashboardDoc>(emptyDashboard());
  const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);
  const [activeDataset, setActiveDataset] = useState<DatasetOption | null>(null);
  const [savedDashboards, setSavedDashboards] = useState<{ id: string; name: string; updated_at: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [dashName, setDashName] = useState("Untitled Dashboard");
  const [showOpen, setShowOpen] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [collaboratorEmail, setCollaboratorEmail] = useState("");
  const [collaboratorRole, setCollaboratorRole] = useState<"viewer" | "editor">("viewer");

  // Load datasets
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data, error } = await backend
        .from("datasets")
        .select("id, name, columns, raw_data, cleaned_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) { toast.error("Couldn't load datasets"); return; }
      const opts: DatasetOption[] = (data || []).map((d: { id: string; name: string; columns: unknown; raw_data: unknown; cleaned_data: unknown }) => {
        const rows = (d.cleaned_data || d.raw_data || []) as Record<string, unknown>[];
        const safeRows = Array.isArray(rows) ? rows : [];
        const cols = Array.isArray(d.columns)
          ? (d.columns as string[])
          : (safeRows[0] ? Object.keys(safeRows[0]) : []);
        return { id: d.id, name: d.name, columns: cols, rows: safeRows };
      });
      setDatasets(opts);
      if (opts[0] && !activeDataset) {
        setActiveDataset(opts[0]);
        setDoc(d => ({ ...d, datasetId: opts[0].id }));
      }
    })();
  }, [user?.id]);

  // Load saved dashboards list
  const refreshDashboardList = useCallback(async () => {
    if (!user?.id) return;
    const { data } = await backend.from("dashboards")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false }) as { data: { id: string; name: string; updated_at: string }[] | null };
    setSavedDashboards(data || []);
  }, [user?.id]);

  useEffect(() => { refreshDashboardList(); }, [refreshDashboardList]);

  const columns = activeDataset?.columns || [];
  const rows = activeDataset?.rows || [];

  // Numeric column detection
  const numericColumns = useMemo(() => {
    if (!rows.length) return columns;
    return columns.filter(c => {
      const sample = rows.slice(0, 50).map(r => r[c]).filter(v => v != null);
      if (!sample.length) return false;
      return sample.filter(v => !Number.isNaN(Number(v))).length / sample.length > 0.7;
    });
  }, [rows, columns]);

  // Apply page filters to rows
  const filteredRows = useMemo(() => {
    let r = rows;
    for (const f of doc.filters) {
      if (f.type === "multi" && f.values?.length) {
        r = r.filter(row => f.values!.includes(String(row[f.field])));
      } else if (f.type === "range") {
        r = r.filter(row => {
          const v = Number(row[f.field]);
          return (!f.min || v >= f.min) && (!f.max || v <= f.max);
        });
      } else if (f.type === "date" && f.startDate) {
        const start = Date.parse(f.startDate);
        const end = f.endDate ? Date.parse(f.endDate) : Infinity;
        r = r.filter(row => {
          const t = Date.parse(String(row[f.field]));
          return t >= start && t <= end;
        });
      }
    }
    return r;
  }, [rows, doc.filters]);

  const selectedTile = doc.tiles.find(t => t.id === selectedTileId) || null;

  const addTile = (type: ChartType) => {
    const id = Math.random().toString(36).slice(2, 9);
    const tile: BuilderTile = {
      id, type,
      title: `New ${type}`,
      layout: { ...defaultLayoutFor(type), y: 9999 }, // bottom
    };
    setDoc(d => ({ ...d, tiles: [...d.tiles, tile] }));
    setSelectedTileId(id);
  };

  const addPrebuiltTile = (tile: BuilderTile) => {
    setDoc(d => ({ ...d, tiles: [...d.tiles, { ...tile, layout: { ...tile.layout, y: 9999 } }] }));
    setSelectedTileId(tile.id);
  };

  const updateTile = (id: string, patch: Partial<BuilderTile>) => {
    setDoc(d => ({ ...d, tiles: d.tiles.map(t => t.id === id ? { ...t, ...patch } : t) }));
  };

  const deleteTile = (id: string) => {
    setDoc(d => ({ ...d, tiles: d.tiles.filter(t => t.id !== id) }));
    if (selectedTileId === id) setSelectedTileId(null);
  };

  const duplicateTile = (id: string) => {
    const t = doc.tiles.find(x => x.id === id);
    if (!t) return;
    const newId = Math.random().toString(36).slice(2, 9);
    setDoc(d => ({ ...d, tiles: [...d.tiles, { ...t, id: newId, title: `${t.title} (copy)` }] }));
    setSelectedTileId(newId);
  };

  const handleLayoutChange = useCallback((tiles: BuilderTile[]) => {
    setDoc(d => ({ ...d, tiles }));
  }, []);

  // Save dashboard
  const saveDashboard = async () => {
    if (!user?.id) { toast.error("Sign in to save"); return; }
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        name: dashName,
        description: doc.description,
        dataset_id: activeDataset?.id || null,
        tiles: doc.tiles as unknown as Record<string, unknown>[],
        layout: {} as Record<string, unknown>,
        filters: doc.filters as unknown as Record<string, unknown>[],
        theme: doc.theme as unknown as Record<string, unknown>,
        calculated_fields: doc.calculatedFields as unknown as Record<string, unknown>[],
      };
      const client = backend as unknown as { from: (t: string) => { update: (p: unknown) => { eq: (k: string, v: string) => Promise<{ error: Error | null }> }; insert: (p: unknown) => { select: (s: string) => { single: () => Promise<{ data: { id: string }; error: Error | null }> } } } };
      if (doc.id) {
        const { error } = await client.from("dashboards").update(payload).eq("id", doc.id);
        if (error) throw error;
      } else {
        const { data, error } = await client.from("dashboards").insert(payload).select("id").single();
        if (error) throw error;
        setDoc(d => ({ ...d, id: data.id }));
      }
      await refreshDashboardList();
      toast.success("Dashboard saved");
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const duplicateDashboard = async () => {
    setDoc(d => ({ ...d, id: undefined, name: `${dashName} (copy)` }));
    setDashName(`${dashName} (copy)`);
    toast.success("Duplicated â€” click Save to persist");
  };

  const loadDashboard = async (id: string) => {
    const { data, error } = await backend.from("dashboards").select("*").eq("id", id).single();
    if (error) { toast.error("Load failed"); return; }
    const d = data as unknown as { id: string; name: string; description: string; dataset_id: string; tiles: BuilderTile[]; filters: PageFilter[]; theme: DashboardDoc["theme"]; calculated_fields: DashboardDoc["calculatedFields"] };
    setDoc({
      id: d.id, name: d.name, description: d.description,
      datasetId: d.dataset_id,
      tiles: d.tiles || [],
      filters: d.filters || [],
      theme: d.theme || emptyDashboard().theme,
      calculatedFields: d.calculated_fields || [],
    });
    setDashName(d.name);
    if (d.dataset_id) {
      const ds = datasets.find(x => x.id === d.dataset_id);
      if (ds) setActiveDataset(ds);
    }
    setShowOpen(false);
    toast.success(`Opened "${d.name}"`);
  };

  // Export
  const exportPNG = async () => {
    if (!canvasRef.current) return;
    const dataUrl = await toPng(canvasRef.current, { cacheBust: true, backgroundColor: "#0a0e1a" });
    const link = document.createElement("a");
    link.download = `${dashName}.png`;
    link.href = dataUrl;
    link.click();
  };

  const exportPDF = async () => {
    if (!canvasRef.current) return;
    const node = canvasRef.current;
    const w = node.scrollWidth;
    const h = node.scrollHeight;
    const dataUrl = await toJpeg(node, { backgroundColor: "#0a0e1a", quality: 0.95, pixelRatio: 2 });
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [w, h] });
    pdf.addImage(dataUrl, "JPEG", 0, 0, w, h);
    pdf.save(`${dashName}.pdf`);
  };

  const exportCSV = () => {
    if (!filteredRows.length) { toast.error("No data"); return; }
    const csv = Papa.unparse(filteredRows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${dashName}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  // Share via existing edge function
  const createShareLink = async () => {
    if (!doc.id) { toast.error("Save dashboard first"); return; }
    try {
      const { data, error } = await backend.functions.invoke("share-dashboard", {
        body: {
          title: dashName,
          datasetName: activeDataset?.name,
          snapshot: doc,
        },
      });
      if (error) throw error;
      const token = (data as { token?: string; share_token?: string })?.token
        || (data as { share_token?: string })?.share_token;
      if (token) {
        const url = `${window.location.origin}/shared/${token}`;
        setShareLink(url);
        navigator.clipboard.writeText(url).catch(() => {});
        toast.success("Link copied to clipboard");
      } else {
        toast.error("No share token returned");
      }
    } catch {
      // Fallback: insert directly
      const token = Math.random().toString(36).slice(2, 14);
      const { error } = await (backend.from("shared_dashboards") as unknown as { insert: (p: unknown) => Promise<{ error: Error | null }> }).insert({
        user_id: user!.id,
        title: dashName,
        share_token: token,
        snapshot: doc,
        dataset_name: activeDataset?.name,
      });
      if (error) { toast.error("Share failed"); return; }
      const url = `${window.location.origin}/shared/${token}`;
      setShareLink(url);
      navigator.clipboard.writeText(url).catch(() => {});
      toast.success("Link copied");
    }
  };

  const addCollaborator = async () => {
    if (!doc.id) { toast.error("Save dashboard first"); return; }
    if (!collaboratorEmail) return;
    // Look up user by email
    const { data: prof } = await backend.from("profiles").select("id").eq("email", collaboratorEmail).maybeSingle();
    if (!prof) { toast.error("No user with that email"); return; }
    const { error } = await backend.from("dashboard_collaborators").insert({
      dashboard_id: doc.id,
      user_id: prof.id,
      role: collaboratorRole,
    });
    if (error) { toast.error("Couldn't add: " + error.message); return; }
    toast.success(`Added ${collaboratorEmail} as ${collaboratorRole}`);
    setCollaboratorEmail("");
  };

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <SEO title="Dashboard Builder Â· SpaceForge" description="Build interactive Power BIâ€“style dashboards with drag-and-drop charts, filters, and AI suggestions." />

      {/* Top toolbar */}
      <header className="border-b bg-card/40 backdrop-blur sticky top-0 z-20">
        <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="gap-1">
            <FolderOpen className="h-3.5 w-3.5" /> Home
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Input
            value={dashName}
            onChange={e => { setDashName(e.target.value); setDoc(d => ({ ...d, name: e.target.value })); }}
            className="h-8 w-56 text-sm font-medium"
          />
          <Select
            value={activeDataset?.id || ""}
            onValueChange={id => { const ds = datasets.find(d => d.id === id); if (ds) { setActiveDataset(ds); setDoc(d => ({ ...d, datasetId: id })); } }}
          >
            <SelectTrigger className="h-8 w-44 text-sm">
              <Database className="h-3 w-3 mr-1" />
              <SelectValue placeholder="Pick dataset" />
            </SelectTrigger>
            <SelectContent>
              {datasets.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              {!datasets.length && <SelectItem value="none" disabled>No datasets â€” upload one in Data Agent</SelectItem>}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-1.5 flex-wrap">
            <TemplateGallery columns={columns} onApply={tiles => setDoc(d => ({ ...d, tiles }))} />
            <ThemePicker theme={doc.theme} onChange={theme => setDoc(d => ({ ...d, theme }))} />
            <Dialog open={showOpen} onOpenChange={setShowOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5"><FolderOpen className="h-3.5 w-3.5" /> Open</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>My Dashboards</DialogTitle></DialogHeader>
                <ScrollArea className="max-h-[50vh]">
                  <div className="space-y-1">
                    {savedDashboards.length === 0 && <div className="text-sm text-muted-foreground p-3">No saved dashboards yet.</div>}
                    {savedDashboards.map(d => (
                      <button key={d.id} onClick={() => loadDashboard(d.id)} className="w-full text-left flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div>
                          <div className="text-sm font-medium">{d.name}</div>
                          <div className="text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleString()}</div>
                        </div>
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </DialogContent>
            </Dialog>
            <Button size="sm" variant="outline" onClick={duplicateDashboard} className="gap-1.5"><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
            <Button size="sm" onClick={saveDashboard} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
            </Button>
            <Button size="sm" variant="outline" onClick={exportPNG} className="gap-1.5"><ImageIcon className="h-3.5 w-3.5" /> PNG</Button>
            <Button size="sm" variant="outline" onClick={exportPDF} className="gap-1.5"><FileDown className="h-3.5 w-3.5" /> PDF</Button>
            <Button size="sm" variant="outline" onClick={exportCSV} className="gap-1.5"><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</Button>
            <Dialog open={showShare} onOpenChange={setShowShare}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5"><Share2 className="h-3.5 w-3.5" /> Share</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Share dashboard</DialogTitle></DialogHeader>
                <Tabs defaultValue="link">
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="link">Link</TabsTrigger>
                    <TabsTrigger value="people">People</TabsTrigger>
                  </TabsList>
                  <TabsContent value="link" className="space-y-3 mt-3">
                    <Button onClick={createShareLink} className="w-full">Generate share link</Button>
                    {shareLink && <Input readOnly value={shareLink} onClick={e => e.currentTarget.select()} />}
                  </TabsContent>
                  <TabsContent value="people" className="space-y-3 mt-3">
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input value={collaboratorEmail} onChange={e => setCollaboratorEmail(e.target.value)} placeholder="user@example.com" />
                    </div>
                    <div>
                      <Label className="text-xs">Role</Label>
                      <Select value={collaboratorRole} onValueChange={v => setCollaboratorRole(v as "viewer" | "editor")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={addCollaborator} className="w-full gap-1.5"><Users className="h-3.5 w-3.5" /> Invite</Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <FilterBar filters={doc.filters} onRemove={id => setDoc(d => ({ ...d, filters: d.filters.filter(f => f.id !== id) }))} />

      {/* Body: 3-column on desktop, stacked on mobile */}
      <div className="flex-1 min-h-0 flex">
        {/* Left rail (desktop) */}
        <aside className="hidden md:flex w-64 border-r flex-col bg-card/30">
          <Tabs defaultValue="visuals" className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-3 m-2">
              <TabsTrigger value="visuals" className="text-xs">Charts</TabsTrigger>
              <TabsTrigger value="fields" className="text-xs">Fields</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs">AI</TabsTrigger>
            </TabsList>
            <ScrollArea className="flex-1">
              <TabsContent value="visuals" className="p-2 mt-0">
                <div className="grid grid-cols-3 gap-1.5">
                  {CHART_BUTTONS.map(b => (
                    <button key={b.type} onClick={() => addTile(b.type)}
                      className="aspect-square flex flex-col items-center justify-center gap-1 rounded border hover:border-primary hover:bg-primary/5 transition text-[10px]">
                      <b.icon className="h-4 w-4" />
                      <span>{b.label}</span>
                    </button>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="fields" className="p-2 mt-0 space-y-3">
                <div>
                  <Label className="text-xs">Columns ({columns.length})</Label>
                  <div className="space-y-0.5 mt-1">
                    {columns.map(c => (
                      <div key={c} className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded ${numericColumns.includes(c) ? "text-primary" : "text-muted-foreground"}`}>
                        {numericColumns.includes(c) ? <Hash className="h-3 w-3" /> : <Type className="h-3 w-3" />}
                        <span className="truncate">{c}</span>
                      </div>
                    ))}
                    {!columns.length && <div className="text-[11px] text-muted-foreground px-2">Pick a dataset</div>}
                  </div>
                </div>
                <Separator />
                <CalculatedFieldEditor
                  fields={doc.calculatedFields}
                  onChange={fields => setDoc(d => ({ ...d, calculatedFields: fields }))}
                />
              </TabsContent>
              <TabsContent value="ai" className="p-2 mt-0">
                <SmartSuggestPanel rows={filteredRows} columns={columns} onAdd={addPrebuiltTile} />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </aside>

        {/* Mobile left drawer */}
        <Sheet>
          <SheetTrigger asChild>
            <Button size="sm" variant="outline" className="md:hidden m-2 gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add chart
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[85vw] max-w-sm p-0">
            <Tabs defaultValue="visuals" className="h-full flex flex-col">
              <TabsList className="grid grid-cols-3 m-2">
                <TabsTrigger value="visuals">Charts</TabsTrigger>
                <TabsTrigger value="fields">Fields</TabsTrigger>
                <TabsTrigger value="ai">AI</TabsTrigger>
              </TabsList>
              <ScrollArea className="flex-1">
                <TabsContent value="visuals" className="p-3">
                  <div className="grid grid-cols-3 gap-2">
                    {CHART_BUTTONS.map(b => (
                      <button key={b.type} onClick={() => addTile(b.type)}
                        className="aspect-square flex flex-col items-center justify-center gap-1 rounded border hover:border-primary text-[10px]">
                        <b.icon className="h-4 w-4" /><span>{b.label}</span>
                      </button>
                    ))}
                  </div>
                </TabsContent>
                <TabsContent value="fields" className="p-3">
                  <CalculatedFieldEditor fields={doc.calculatedFields} onChange={fields => setDoc(d => ({ ...d, calculatedFields: fields }))} />
                </TabsContent>
                <TabsContent value="ai" className="p-3">
                  <SmartSuggestPanel rows={filteredRows} columns={columns} onAdd={addPrebuiltTile} />
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </SheetContent>
        </Sheet>

        {/* Canvas */}
        <main className="flex-1 min-w-0 overflow-auto">
          <div ref={canvasRef} className="min-h-full p-2 sm:p-4">
            <DashboardCanvas
              tiles={doc.tiles}
              rows={filteredRows}
              theme={doc.theme}
              calculatedFields={doc.calculatedFields}
              selectedId={selectedTileId || undefined}
              onSelect={setSelectedTileId}
              onLayoutChange={handleLayoutChange}
              onDelete={deleteTile}
            />
          </div>
        </main>

        {/* Right format panel (desktop) */}
        {selectedTile && (
          <aside className="hidden lg:flex w-80 border-l bg-card/30">
            <FormatPanel
              tile={selectedTile}
              columns={columns}
              numericColumns={numericColumns}
              calculatedFields={doc.calculatedFields}
              onChange={patch => updateTile(selectedTile.id, patch)}
              onDelete={() => deleteTile(selectedTile.id)}
              onDuplicate={() => duplicateTile(selectedTile.id)}
            />
          </aside>
        )}

        {/* Mobile format sheet */}
        {selectedTile && (
          <Sheet open={!!selectedTileId} onOpenChange={o => !o && setSelectedTileId(null)}>
            <SheetContent side="bottom" className="lg:hidden h-[80vh] p-0">
              <FormatPanel
                tile={selectedTile}
                columns={columns}
                numericColumns={numericColumns}
                calculatedFields={doc.calculatedFields}
                onChange={patch => updateTile(selectedTile.id, patch)}
                onDelete={() => deleteTile(selectedTile.id)}
                onDuplicate={() => duplicateTile(selectedTile.id)}
              />
            </SheetContent>
          </Sheet>
        )}
      </div>
    </div>
  );
};

export default Dashboards;
