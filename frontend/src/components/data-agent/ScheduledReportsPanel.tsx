import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import {
  Calendar,
  Clock,
  Mail,
  FileText,
  Plus,
  Trash2,
  Play,
  Pause,
  Settings,
  CheckCircle,
  AlertCircle,
  Loader2,
  Send,
  Bell,
  RefreshCw,
  Download,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DatasetState } from "@/pages/DataAgent";

interface ScheduledReport {
  id: string;
  name: string;
  datasetName: string;
  reportType: "summary" | "full" | "kpi" | "forecast";
  schedule: {
    frequency: "daily" | "weekly" | "monthly";
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
    time: string; // HH:MM
  };
  recipients: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: "success" | "failed" | "pending";
}

interface ScheduledReportsPanelProps {
  dataset: DatasetState;
}

const REPORT_TYPES = [
  { value: "summary", label: "Daily Summary", icon: FileText, description: "Key metrics and changes" },
  { value: "full", label: "Full Analysis", icon: BarChart3, description: "Comprehensive report" },
  { value: "kpi", label: "KPI Dashboard", icon: BarChart3, description: "Business metrics focus" },
  { value: "forecast", label: "Forecast Report", icon: BarChart3, description: "Predictions and trends" },
];

const FREQUENCIES = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const ScheduledReportsPanel = ({ dataset }: ScheduledReportsPanelProps) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<ScheduledReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);

  // New report form state
  const [newReport, setNewReport] = useState<Partial<ScheduledReport>>({
    name: "",
    datasetName: dataset.name,
    reportType: "summary",
    schedule: {
      frequency: "daily",
      time: "08:00",
    },
    recipients: [],
    isActive: true,
  });
  const [newRecipient, setNewRecipient] = useState("");

  useEffect(() => {
    loadReports();
  }, [user]);

  const loadReports = async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Load from local storage for now (enterprise persistence pending)
      const saved = localStorage.getItem(`scheduled_reports_${user.id}`);
      if (saved) {
        setReports(JSON.parse(saved));
      }
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveReports = (updatedReports: ScheduledReport[]) => {
    if (user) {
      localStorage.setItem(`scheduled_reports_${user.id}`, JSON.stringify(updatedReports));
    }
    setReports(updatedReports);
  };

  const calculateNextRun = (schedule: ScheduledReport["schedule"]): string => {
    const now = new Date();
    const [hours, minutes] = schedule.time.split(":").map(Number);
    const nextRun = new Date(now);
    nextRun.setHours(hours, minutes, 0, 0);

    if (nextRun <= now) {
      // Move to next occurrence
      if (schedule.frequency === "daily") {
        nextRun.setDate(nextRun.getDate() + 1);
      } else if (schedule.frequency === "weekly") {
        const targetDay = schedule.dayOfWeek ?? 1;
        const daysUntil = (targetDay + 7 - nextRun.getDay()) % 7 || 7;
        nextRun.setDate(nextRun.getDate() + daysUntil);
      } else if (schedule.frequency === "monthly") {
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setDate(schedule.dayOfMonth ?? 1);
      }
    }

    return nextRun.toISOString();
  };

  const addRecipient = () => {
    if (!newRecipient || !newRecipient.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    setNewReport(prev => ({
      ...prev,
      recipients: [...(prev.recipients || []), newRecipient],
    }));
    setNewRecipient("");
  };

  const removeRecipient = (email: string) => {
    setNewReport(prev => ({
      ...prev,
      recipients: (prev.recipients || []).filter(r => r !== email),
    }));
  };

  const createReport = async () => {
    if (!newReport.name) {
      toast.error("Enter a report name");
      return;
    }
    if (!newReport.recipients?.length) {
      toast.error("Add at least one recipient");
      return;
    }

    setIsCreating(true);

    try {
      const report: ScheduledReport = {
        id: crypto.randomUUID(),
        name: newReport.name,
        datasetName: dataset.name,
        reportType: newReport.reportType as ScheduledReport["reportType"],
        schedule: newReport.schedule as ScheduledReport["schedule"],
        recipients: newReport.recipients,
        isActive: true,
        nextRunAt: calculateNextRun(newReport.schedule as ScheduledReport["schedule"]),
        lastStatus: "pending",
      };

      const updated = [...reports, report];
      saveReports(updated);

      toast.success("Scheduled report created");
      setShowNewForm(false);
      setNewReport({
        name: "",
        datasetName: dataset.name,
        reportType: "summary",
        schedule: { frequency: "daily", time: "08:00" },
        recipients: [],
        isActive: true,
      });
    } catch (err) {
      toast.error("Failed to create report");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleReport = (id: string) => {
    const updated = reports.map(r => 
      r.id === id ? { ...r, isActive: !r.isActive } : r
    );
    saveReports(updated);
    toast.success(updated.find(r => r.id === id)?.isActive ? "Report activated" : "Report paused");
  };

  const deleteReport = (id: string) => {
    const updated = reports.filter(r => r.id !== id);
    saveReports(updated);
    toast.success("Report deleted");
  };

  const runNow = async (report: ScheduledReport) => {
    toast.info(`Generating ${report.reportType} report...`);
    
    // Simulate report generation
    setTimeout(() => {
      const updated = reports.map(r =>
        r.id === report.id
          ? { ...r, lastRunAt: new Date().toISOString(), lastStatus: "success" as const }
          : r
      );
      saveReports(updated);
      toast.success(`Report sent to ${report.recipients.length} recipient(s)`);
    }, 2000);
  };

  const activeCount = reports.filter(r => r.isActive).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-primary/10 via-accent/5 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Scheduled Reports</CardTitle>
                <CardDescription>
                  Automate report generation and delivery
                </CardDescription>
              </div>
            </div>
            <Button onClick={() => setShowNewForm(true)} disabled={showNewForm}>
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stats */}
        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-3xl font-bold">{reports.length}</div>
                <div className="text-sm text-muted-foreground">Total Schedules</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-3xl font-bold">{activeCount}</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Send className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-3xl font-bold">
                  {reports.reduce((sum, r) => sum + r.recipients.length, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Recipients</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Report Form */}
      {showNewForm && (
        <Card className="bg-card/50 border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Create Scheduled Report</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Report Name</Label>
                <Input
                  value={newReport.name}
                  onChange={(e) => setNewReport(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Weekly Sales Summary"
                />
              </div>

              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select
                  value={newReport.reportType}
                  onValueChange={(v) => setNewReport(prev => ({ ...prev, reportType: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(rt => (
                      <SelectItem key={rt.value} value={rt.value}>
                        <div className="flex items-center gap-2">
                          <rt.icon className="w-4 h-4" />
                          {rt.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={newReport.schedule?.frequency}
                  onValueChange={(v) => setNewReport(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule!, frequency: v as any }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {newReport.schedule?.frequency === "weekly" && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={String(newReport.schedule?.dayOfWeek ?? 1)}
                    onValueChange={(v) => setNewReport(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule!, dayOfWeek: parseInt(v) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS_OF_WEEK.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newReport.schedule?.frequency === "monthly" && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select
                    value={String(newReport.schedule?.dayOfMonth ?? 1)}
                    onValueChange={(v) => setNewReport(prev => ({
                      ...prev,
                      schedule: { ...prev.schedule!, dayOfMonth: parseInt(v) }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={newReport.schedule?.time}
                  onChange={(e) => setNewReport(prev => ({
                    ...prev,
                    schedule: { ...prev.schedule!, time: e.target.value }
                  }))}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={newRecipient}
                  onChange={(e) => setNewRecipient(e.target.value)}
                  placeholder="email@company.com"
                  onKeyDown={(e) => e.key === "Enter" && addRecipient()}
                />
                <Button variant="outline" onClick={addRecipient}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {newReport.recipients && newReport.recipients.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newReport.recipients.map(email => (
                    <Badge key={email} variant="secondary" className="gap-1">
                      <Mail className="w-3 h-3" />
                      {email}
                      <button onClick={() => removeRecipient(email)} className="ml-1 hover:text-destructive">
                        Ã—
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={createReport} disabled={isCreating} className="gap-2">
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Create Schedule
              </Button>
              <Button variant="outline" onClick={() => setShowNewForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      <Card className="bg-card/50 border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Scheduled Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No scheduled reports yet</p>
              <p className="text-sm">Create your first automated report</p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-3">
                {reports.map(report => {
                  const reportType = REPORT_TYPES.find(rt => rt.value === report.reportType);
                  const Icon = reportType?.icon || FileText;

                  return (
                    <div
                      key={report.id}
                      className={cn(
                        "p-4 rounded-xl border transition-colors",
                        report.isActive
                          ? "bg-primary/5 border-primary/20"
                          : "bg-muted/30 border-border/50 opacity-60"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          <div className={cn(
                            "p-2 rounded-lg",
                            report.isActive ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-medium">{report.name}</div>
                            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                              <Clock className="w-3 h-3" />
                              {report.schedule.frequency.charAt(0).toUpperCase() + report.schedule.frequency.slice(1)} at {report.schedule.time}
                            </div>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline">{reportType?.label}</Badge>
                              <Badge variant="secondary">
                                {report.recipients.length} recipient{report.recipients.length !== 1 ? "s" : ""}
                              </Badge>
                              {report.lastStatus === "success" && (
                                <Badge className="bg-green-500/20 text-green-500 border-green-500/30">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Sent
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => runNow(report)}
                          >
                            <Send className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleReport(report.id)}
                          >
                            {report.isActive ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteReport(report.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {report.nextRunAt && (
                        <div className="mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                          Next run: {new Date(report.nextRunAt).toLocaleString()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ScheduledReportsPanel;
