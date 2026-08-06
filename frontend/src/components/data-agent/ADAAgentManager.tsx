import { useState, useEffect, useCallback } from "react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { useCredits } from "@/hooks/useCredits";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Bot, Play, Pause, Trash2, Plus, Clock, Zap, AlertTriangle, CheckCircle, Loader2, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface AgentJob {
  id: string;
  name: string;
  dataset_source: string;
  dataset_config: any;
  analysis_config: any;
  schedule_interval_hours: number;
  is_active: boolean;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string;
  last_error: string | null;
  retry_count: number;
  created_at: string;
}

interface AgentReport {
  id: string;
  job_id: string;
  insights: any[];
  anomalies: any[];
  forecasts: any[];
  ai_narrative: string | null;
  confidence_score: number;
  tokens_used: number;
  cost_inr: number;
  created_at: string;
}

const SCHEDULE_OPTIONS = [
  { value: "1", label: "Every hour" },
  { value: "6", label: "Every 6 hours" },
  { value: "12", label: "Every 12 hours" },
  { value: "24", label: "Daily" },
  { value: "168", label: "Weekly" },
];

const statusConfig: Record<string, { color: string; icon: any }> = {
  success: { color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle },
  failed: { color: "bg-destructive/10 text-destructive border-destructive/20", icon: AlertTriangle },
  paused: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Pause },
  pending: { color: "bg-muted text-muted-foreground border-border", icon: Clock },
  running: { color: "bg-primary/10 text-primary border-primary/20", icon: Loader2 },
};

interface DatasetOption {
  id: string;
  name: string;
}

const ADAAgentManager = () => {
  const { user } = useAuth();
  const { credits } = useCredits();
  const [jobs, setJobs] = useState<AgentJob[]>([]);
  const [reports, setReports] = useState<AgentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);
  const [datasets, setDatasets] = useState<DatasetOption[]>([]);

  // New job form
  const [newName, setNewName] = useState("");
  const [newDatasetId, setNewDatasetId] = useState("");
  const [newSchedule, setNewSchedule] = useState("24");
  const [showForm, setShowForm] = useState(false);

  const fetchJobs = useCallback(async () => {
    if (!user) return;
    const { data } = await backend
      .from("agent_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setJobs((data as any[]) || []);
  }, [user]);

  const fetchReports = useCallback(async () => {
    if (!user) return;
    const { data } = await backend
      .from("agent_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setReports((data as any[]) || []);
  }, [user]);

  const fetchDatasets = useCallback(async () => {
    if (!user) return;
    const { data } = await backend
      .from("datasets")
      .select("id, name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setDatasets((data as DatasetOption[]) || []);
  }, [user]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchJobs(), fetchReports(), fetchDatasets()]);
      setLoading(false);
    };
    load();
  }, [fetchJobs, fetchReports, fetchDatasets]);

  // Realtime subscription for new reports
  useEffect(() => {
    if (!user) return;
    const channel = backend
      .channel("agent-reports-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_reports" }, (payload) => {
        const newReport = payload.new as any;
        if (newReport.user_id === user.id) {
          setReports((prev) => [newReport as AgentReport, ...prev]);
          toast.success("New agent report ready!", { description: `Confidence: ${newReport.confidence_score}%` });
          fetchJobs(); // refresh job statuses
        }
      })
      .subscribe();

    return () => { backend.removeChannel(channel); };
  }, [user, fetchJobs]);

  const createJob = async () => {
    if (!user || !newName.trim() || !newDatasetId) {
      toast.error("Please fill in job name and select a dataset");
      return;
    }
    setCreating(true);
    const selectedDs = datasets.find(d => d.id === newDatasetId);
    const { error } = await backend.from("agent_jobs").insert({
      user_id: user.id,
      name: newName.trim(),
      dataset_source: "storage",
      dataset_config: { dataset_id: newDatasetId, dataset_name: selectedDs?.name },
      analysis_config: { insights: true, anomalies: true, forecasts: true },
      schedule_interval_hours: parseInt(newSchedule),
      next_run_at: new Date().toISOString(),
    } as any);

    if (error) {
      toast.error("Failed to create job", { description: error.message });
    } else {
      toast.success("Agent job created!");
      setNewName("");
      setNewDatasetId("");
      setShowForm(false);
      fetchJobs();
    }
    setCreating(false);
  };

  const toggleJob = async (job: AgentJob) => {
    await backend.from("agent_jobs").update({
      is_active: !job.is_active,
      ...((!job.is_active) ? { next_run_at: new Date().toISOString(), last_status: "pending", retry_count: 0 } : {}),
    } as any).eq("id", job.id);
    toast.success(job.is_active ? "Job paused" : "Job resumed");
    fetchJobs();
  };

  const deleteJob = async (jobId: string) => {
    await backend.from("agent_jobs").delete().eq("id", jobId);
    toast.success("Job deleted");
    fetchJobs();
  };

  const triggerNow = async (jobId: string) => {
    toast.info("Triggering agent run...");
    try {
      const { data, error } = await backend.functions.invoke("ada-agent-run", {
        body: { action: "run_single", jobId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");
      toast.success("Agent run completed!", { description: `Processed ${data?.processed || 0} job(s)` });
      fetchJobs();
      fetchReports();
    } catch (e: any) {
      toast.error("Agent run failed", { description: e.message });
    }
  };

  const estimateCredits = (datasetId: string) => {
    // Rough estimate: 2-10 credits per run
    return "2-10";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">Autonomous Data Agent</h2>
            <p className="text-xs text-muted-foreground">Schedule AI-powered analysis runs on your datasets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            <Zap className="w-3 h-3 mr-1" />
            {credits.balance} credits
          </Badge>
          <Button size="sm" variant={showForm ? "secondary" : "default"} onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" />
            New Job
          </Button>
        </div>
      </div>

      {/* Create Job Form */}
      {showForm && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Create Agent Job</CardTitle>
            <CardDescription className="text-xs">Configure an autonomous analysis job</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input placeholder="Job name (e.g. Daily Sales Analysis)" value={newName} onChange={(e) => setNewName(e.target.value)} className="text-sm" />
            <Select value={newDatasetId} onValueChange={setNewDatasetId}>
              <SelectTrigger className="text-sm">
                <SelectValue placeholder="Select dataset" />
              </SelectTrigger>
              <SelectContent>
                {datasets.map((ds) => (
                  <SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={newSchedule} onValueChange={setNewSchedule}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SCHEDULE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {newDatasetId && (
              <p className="text-xs text-muted-foreground">
                Estimated cost: ~{estimateCredits(newDatasetId)} credits per run
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" onClick={createJob} disabled={creating}>
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Plus className="w-4 h-4 mr-1" />}
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Jobs List */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-foreground">Your Agent Jobs</h3>
        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Bot className="w-10 h-10 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No agent jobs yet. Create one to get started.</p>
            </CardContent>
          </Card>
        ) : (
          jobs.map((job) => {
            const status = statusConfig[job.last_status] || statusConfig.pending;
            const StatusIcon = status.icon;
            return (
              <Card key={job.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <StatusIcon className={cn("w-4 h-4 flex-shrink-0", job.last_status === "running" && "animate-spin")} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{job.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Every {job.schedule_interval_hours}h</span>
                          {job.last_run_at && (
                            <span>â€¢ Last: {new Date(job.last_run_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-[10px]", status.color)}>
                        {job.last_status}
                      </Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => triggerNow(job.id)} title="Run now">
                        <Play className="w-3 h-3" />
                      </Button>
                      <Switch checked={job.is_active} onCheckedChange={() => toggleJob(job)} />
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteJob(job.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {job.last_error && (
                    <p className="text-xs text-destructive mt-2 truncate">{job.last_error}</p>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <Separator />

      {/* Reports */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Recent Reports</h3>
          <Button size="sm" variant="ghost" onClick={() => { fetchReports(); }}>
            <RefreshCw className="w-3 h-3 mr-1" />
            Refresh
          </Button>
        </div>
        {reports.length === 0 ? (
          <p className="text-xs text-muted-foreground">No reports yet. Run an agent job to generate reports.</p>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-2 pr-3">
              {reports.map((report) => (
                <Card key={report.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {report.confidence_score}% confidence
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground">{report.tokens_used} tokens â€¢ â‚¹{report.cost_inr}</span>
                        {expandedReport === report.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </div>
                    </div>

                    {expandedReport === report.id && (
                      <div className="mt-3 space-y-3 text-xs">
                        {report.ai_narrative && (
                          <div>
                            <p className="font-medium text-foreground mb-1">Executive Summary</p>
                            <p className="text-muted-foreground whitespace-pre-wrap">{report.ai_narrative}</p>
                          </div>
                        )}
                        {Array.isArray(report.insights) && report.insights.length > 0 && (
                          <div>
                            <p className="font-medium text-foreground mb-1">Key Findings ({report.insights.length})</p>
                            <ul className="space-y-1">
                              {report.insights.slice(0, 5).map((insight: any, i: number) => (
                                <li key={i} className="flex items-start gap-1.5">
                                  <Badge variant="outline" className={cn("text-[9px] mt-0.5 flex-shrink-0",
                                    insight.severity === "critical" ? "text-destructive border-destructive/30" :
                                    insight.severity === "high" ? "text-orange-500 border-orange-500/30" : "text-muted-foreground"
                                  )}>
                                    {insight.severity}
                                  </Badge>
                                  <span className="text-muted-foreground">{insight.finding}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {Array.isArray(report.anomalies) && report.anomalies.length > 0 && (
                          <div>
                            <p className="font-medium text-foreground mb-1">Anomalies ({report.anomalies.length})</p>
                            <ul className="space-y-1">
                              {report.anomalies.slice(0, 3).map((a: any, i: number) => (
                                <li key={i} className="text-muted-foreground">
                                  <span className="text-foreground">{a.column}:</span> {a.description}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default ADAAgentManager;
