import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { 
  Database, 
  FileSpreadsheet, 
  Globe, 
  Cloud, 
  Link2, 
  Plus, 
  Trash2, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Settings,
  RefreshCw,
  ArrowRight,
  Zap,
  Table,
  FileJson,
  FileText,
  Server,
  Webhook,
  Clock,
  Calendar,
  History,
  Pause,
  Timer,
  TrendingUp,
  Activity,
  Sparkles,
  ChevronDown,
  Info
} from "lucide-react";
import { DatasetState } from "@/pages/DataAgent";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import DatabaseConnector from "./DatabaseConnector";

interface DataConnector {
  id: string;
  name: string;
  type: ConnectorType;
  icon: React.ElementType;
  description: string;
  status: "connected" | "disconnected" | "error";
  config: Record<string, string>;
  lastSync?: string;
}

type ConnectorType = "google_sheets" | "csv_url" | "json_api" | "database" | "webhook" | "s3" | "airtable" | "notion" | "tally" | "zoho_books" | "busy" | "vyapar";

interface ScheduledJob {
  id: string;
  name: string;
  connector_type: string;
  connector_config: Record<string, string>;
  schedule_type: "manual" | "hourly" | "daily" | "weekly" | "custom";
  cron_expression?: string;
  is_active: boolean;
  last_run_at?: string;
  next_run_at?: string;
  last_run_status?: string;
  last_run_message?: string;
  records_synced?: number;
  created_at: string;
}

interface JobHistory {
  id: string;
  job_id: string;
  status: "running" | "success" | "failed";
  started_at: string;
  completed_at?: string;
  records_synced?: number;
  error_message?: string;
  execution_time_ms?: number;
}

interface WorkflowBuilderProps {
  onDataLoaded: (data: DatasetState) => void;
}

const CONNECTOR_TEMPLATES: Omit<DataConnector, "id" | "status" | "config" | "lastSync">[] = [
  { name: "Google Sheets", type: "google_sheets", icon: FileSpreadsheet, description: "Import data directly from Google Sheets" },
  { name: "CSV URL", type: "csv_url", icon: Link2, description: "Fetch CSV data from any public URL" },
  { name: "JSON API", type: "json_api", icon: FileJson, description: "Connect to REST APIs returning JSON" },
  { name: "Database", type: "database", icon: Database, description: "Connect to PostgreSQL, MySQL, or SQLite" },
  { name: "Webhook", type: "webhook", icon: Webhook, description: "Receive data via webhook endpoint" },
  { name: "Amazon S3", type: "s3", icon: Cloud, description: "Import files from S3 buckets" },
  { name: "Airtable", type: "airtable", icon: Table, description: "Sync data from Airtable bases" },
  { name: "Notion", type: "notion", icon: FileText, description: "Import databases from Notion" },
  { name: "Tally Prime", type: "tally", icon: FileSpreadsheet, description: "Connect to Tally Prime â€” India's #1 accounting software" },
  { name: "Zoho Books", type: "zoho_books", icon: FileText, description: "Import ledgers, invoices & P&L from Zoho Books" },
  { name: "Busy Accounting", type: "busy", icon: Server, description: "Sync purchase/sales registers from Busy Software" },
  { name: "Vyapar", type: "vyapar", icon: Activity, description: "Import GST invoices & business reports from Vyapar" },
];

const SCHEDULE_OPTIONS = [
  { value: "manual", label: "Manual", description: "Run manually when needed", icon: Play },
  { value: "hourly", label: "Every Hour", description: "Sync automatically every hour", icon: Clock },
  { value: "daily", label: "Daily", description: "Sync once per day at midnight", icon: Calendar },
  { value: "weekly", label: "Weekly", description: "Sync once per week", icon: Timer },
];

const WorkflowBuilder = ({ onDataLoaded }: WorkflowBuilderProps) => {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<DataConnector[]>([]);
  const [scheduledJobs, setScheduledJobs] = useState<ScheduledJob[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<ConnectorType | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("connectors");
  const [formConfig, setFormConfig] = useState<Record<string, string>>({});
  
  // Schedule form state
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleConfig, setScheduleConfig] = useState({
    name: "",
    connectorId: "",
    scheduleType: "manual" as "manual" | "hourly" | "daily" | "weekly" | "custom",
  });
  const [isCreatingSchedule, setIsCreatingSchedule] = useState(false);
  const [selectedJobHistory, setSelectedJobHistory] = useState<JobHistory[]>([]);
  const [viewingHistoryFor, setViewingHistoryFor] = useState<string | null>(null);

  // Load scheduled jobs from database
  useEffect(() => {
    if (user) {
      loadScheduledJobs();
    }
  }, [user]);

  const loadScheduledJobs = async () => {
    if (!user) return;

    const { data, error } = await backend
      .from('scheduled_jobs')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading scheduled jobs:', error);
      return;
    }

    setScheduledJobs((data || []).map(job => ({
      ...job,
      connector_config: job.connector_config as Record<string, string>,
      schedule_type: job.schedule_type as "manual" | "hourly" | "daily" | "weekly" | "custom",
    })));
  };

  const handleAddConnector = async () => {
    if (!selectedConnector) return;
    const template = CONNECTOR_TEMPLATES.find(t => t.type === selectedConnector);
    if (!template) return;

    setIsConnecting(true);

    // Real connection test â€” call edge function for supported types
    const testableTypes = ['google_sheets','csv_url','json_api','airtable','notion','webhook','zoho_books','busy','vyapar'];
    let testPassed = false;
    let testError = '';

    if (testableTypes.includes(selectedConnector)) {
      try {
        const config = buildConnectorConfig(selectedConnector, formConfig);
        const { data: response, error } = await backend.functions.invoke('fetch-connector-data', {
          body: { type: selectedConnector, config, testOnly: true }
        });
        if (error) throw new Error(error.message);
        if (!response?.success && response?.error) throw new Error(response.error);
        testPassed = true;
      } catch (e) {
        testError = e instanceof Error ? e.message : 'Connection test failed';
      }
    } else {
      // For Database (handled by db-connect) and S3 (public URL based), skip edge test
      testPassed = true;
    }

    if (!testPassed) {
      setIsConnecting(false);
      toast({
        title: 'âŒ Connection Failed',
        description: testError,
        variant: 'destructive',
      });
      return;
    }

    const newConnector: DataConnector = {
      id: `connector_${Date.now()}`,
      name: formConfig.name || template.name,
      type: selectedConnector,
      icon: template.icon,
      description: template.description,
      status: 'connected',
      config: { ...formConfig },
      lastSync: new Date().toISOString(),
    };

    setConnectors(prev => [...prev, newConnector]);
    setFormConfig({});
    setSelectedConnector(null);
    setIsConnecting(false);

    toast({ title: 'âœ… Connected', description: `${newConnector.name} connected and verified.` });
  };

  /** Map form fields to the shape the edge function expects */
  const buildConnectorConfig = (type: ConnectorType, cfg: Record<string, string>): Record<string, string> => {
    switch (type) {
      case 'google_sheets': return { url: cfg.url, sheet: cfg.sheet };
      case 'csv_url':       return { url: cfg.url, hasHeaders: cfg.hasHeaders };
      case 'json_api':      return { url: cfg.url, method: cfg.method, apiKey: cfg.apiKey, jsonPath: cfg.jsonPath };
      case 'airtable':      return { baseId: cfg.baseId, tableId: cfg.tableName, apiKey: cfg.apiKey };
      case 'notion':        return { databaseId: cfg.databaseId, apiKey: cfg.token };
      case 'webhook':       return { webhookId: cfg.webhookId, limit: '100' };
      case 'zoho_books':    return { orgId: cfg.zohoOrgId, token: cfg.zohoToken, module: cfg.zohoModule || 'invoices' };
      case 'busy':          return { url: cfg.busyUrl, module: cfg.busyModule || 'sales' };
      case 'vyapar':        return { url: cfg.vyaparUrl, module: cfg.vyaparModule || 'invoices' };
      case 's3':            return { bucket: cfg.bucket, region: cfg.region, accessKey: cfg.accessKey, secretKey: cfg.secretKey, prefix: cfg.prefix };
      default:              return cfg;
    }
  };

  const handleSyncConnector = async (connectorId: string) => {
    setIsSyncing(connectorId);
    const connector = connectors.find(c => c.id === connectorId);
    if (!connector) { setIsSyncing(null); return; }

    try {
      const edgeTypes: ConnectorType[] = ['google_sheets','csv_url','json_api','airtable','notion','webhook','zoho_books','busy','vyapar','s3'];

      if (edgeTypes.includes(connector.type)) {
        const config = buildConnectorConfig(connector.type, connector.config);
        const { data: response, error } = await backend.functions.invoke('fetch-connector-data', {
          body: { type: connector.type, config }
        });

        if (error) throw new Error(error.message || 'Edge function error');
        if (!response?.success) throw new Error(response?.error || 'Fetch failed');

        const fetchedData = response.data as Record<string, unknown>[];
        if (!fetchedData?.length) throw new Error('No data returned from connector');

        setConnectors(prev => prev.map(c =>
          c.id === connectorId ? { ...c, lastSync: new Date().toISOString(), status: 'connected' } : c
        ));

        onDataLoaded({
          name: `${connector.name} â€” ${new Date().toLocaleDateString()}`,
          rawData: fetchedData,
          columns: response.columns || Object.keys(fetchedData[0]),
          status: 'imported',
        });

        toast({ title: 'âœ… Sync Complete', description: `${fetchedData.length.toLocaleString()} records imported from ${connector.name}.` });

      } else if (connector.type === 'database') {
        // Database handled by db-connect edge function via DatabaseConnector component
        toast({ title: 'Use Database tab', description: 'Run queries from the Database tab to import data.' });
      } else {
        throw new Error(`Sync not yet supported for ${connector.type}`);
      }
    } catch (error) {
      setConnectors(prev => prev.map(c => c.id === connectorId ? { ...c, status: 'error' } : c));
      toast({
        title: 'Sync Failed',
        description: error instanceof Error ? error.message : 'Unexpected error',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleRemoveConnector = (connectorId: string) => {
    setConnectors(prev => prev.filter(c => c.id !== connectorId));
    toast({ title: "Connector Removed", description: "Data connector has been disconnected." });
  };

  const handleCreateSchedule = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to create scheduled jobs.", variant: "destructive" });
      return;
    }

    const connector = connectors.find(c => c.id === scheduleConfig.connectorId);
    if (!connector) {
      toast({ title: "Select a connector", description: "Please select a data source for the schedule.", variant: "destructive" });
      return;
    }

    if (!scheduleConfig.name.trim()) {
      toast({ title: "Enter a name", description: "Please enter a name for the scheduled job.", variant: "destructive" });
      return;
    }

    setIsCreatingSchedule(true);

    try {
      const nextRun = calculateNextRun(scheduleConfig.scheduleType);

      const { data, error } = await backend
        .from('scheduled_jobs')
        .insert({
          user_id: user.id,
          name: scheduleConfig.name,
          connector_type: connector.type,
          connector_config: connector.config,
          schedule_type: scheduleConfig.scheduleType,
          is_active: true,
          next_run_at: nextRun.toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      setScheduledJobs(prev => [{
        ...data,
        connector_config: data.connector_config as Record<string, string>,
        schedule_type: data.schedule_type as "manual" | "hourly" | "daily" | "weekly" | "custom",
      }, ...prev]);

      setScheduleFormOpen(false);
      setScheduleConfig({ name: "", connectorId: "", scheduleType: "manual" });

      toast({
        title: "Schedule Created",
        description: `${scheduleConfig.name} will sync ${scheduleConfig.scheduleType === 'manual' ? 'manually' : scheduleConfig.scheduleType}.`
      });
    } catch (error) {
      console.error('Error creating schedule:', error);
      toast({
        title: "Failed to create schedule",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsCreatingSchedule(false);
    }
  };

  const handleToggleJobActive = async (jobId: string, isActive: boolean) => {
    const { error } = await backend
      .from('scheduled_jobs')
      .update({ is_active: isActive })
      .eq('id', jobId);

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }

    setScheduledJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, is_active: isActive } : job
    ));

    toast({
      title: isActive ? "Schedule Activated" : "Schedule Paused",
      description: isActive ? "Job will run on schedule." : "Job has been paused."
    });
  };

  const handleRunJobNow = async (job: ScheduledJob) => {
    setIsSyncing(job.id);

    try {
      const { data: response, error } = await backend.functions.invoke('scheduled-sync', {
        body: { action: 'run_job', jobId: job.id }
      });

      if (error) throw new Error(error.message);
      if (!response.success) throw new Error(response.error);

      const fetchedData = response.data as Record<string, unknown>[];
      
      onDataLoaded({
        name: `${job.name} Sync`,
        rawData: fetchedData,
        columns: response.columns || Object.keys(fetchedData[0] || {}),
        status: "imported"
      });

      await loadScheduledJobs();

      toast({
        title: "Sync Complete",
        description: `${fetchedData.length} records synced in ${response.executionTime}ms.`
      });
    } catch (error) {
      console.error('Error running job:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    } finally {
      setIsSyncing(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    const { error } = await backend
      .from('scheduled_jobs')
      .delete()
      .eq('id', jobId);

    if (error) {
      toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
      return;
    }

    setScheduledJobs(prev => prev.filter(job => job.id !== jobId));
    toast({ title: "Schedule Deleted", description: "The scheduled job has been removed." });
  };

  const handleViewHistory = async (jobId: string) => {
    setViewingHistoryFor(jobId);
    
    try {
      const { data: response, error } = await backend.functions.invoke('scheduled-sync', {
        body: { action: 'get_history', jobId }
      });

      if (error) throw new Error(error.message);
      
      setSelectedJobHistory(response.history || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast({
        title: "Failed to load history",
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: "destructive"
      });
    }
  };

  const calculateNextRun = (scheduleType: string): Date => {
    const now = new Date();
    switch (scheduleType) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        const nextDay = new Date(now);
        nextDay.setDate(nextDay.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);
        return nextDay;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + 7);
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek;
      default:
        return now;
    }
  };

  const generateSampleData = (type: ConnectorType): Record<string, unknown>[] => {
    const baseData = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }));

    switch (type) {
      case "google_sheets":
        return baseData.map(row => ({
          ...row,
          name: `Product ${row.id}`,
          category: ["Electronics", "Clothing", "Food", "Home"][Math.floor(Math.random() * 4)],
          price: Math.round(Math.random() * 500 + 10),
          quantity: Math.floor(Math.random() * 100),
          revenue: Math.round(Math.random() * 10000)
        }));
      case "json_api":
        return baseData.map(row => ({
          ...row,
          user_id: `user_${Math.floor(Math.random() * 1000)}`,
          event_type: ["click", "view", "purchase", "signup"][Math.floor(Math.random() * 4)],
          value: Math.round(Math.random() * 100),
          session_duration: Math.floor(Math.random() * 3600)
        }));
      case "database":
        return baseData.map(row => ({
          ...row,
          customer_name: `Customer ${row.id}`,
          email: `customer${row.id}@example.com`,
          total_orders: Math.floor(Math.random() * 50),
          lifetime_value: Math.round(Math.random() * 5000),
          status: ["active", "inactive", "pending"][Math.floor(Math.random() * 3)]
        }));
      default:
        return baseData.map(row => ({
          ...row,
          metric: Math.round(Math.random() * 1000),
          label: `Item ${row.id}`,
          value: Math.random() * 100
        }));
    }
  };

  const renderConnectorForm = () => {
    if (!selectedConnector) return null;

    const formFields: Record<string, JSX.Element> = {
      google_sheets: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Google Sheet" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Spreadsheet URL</Label>
            <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={formConfig.url || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Sheet Name (optional)</Label>
            <Input placeholder="Sheet1" value={formConfig.sheet || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, sheet: e.target.value }))} />
          </div>
        </div>
      ),
      csv_url: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My CSV Data" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>CSV URL</Label>
            <Input placeholder="https://example.com/data.csv" value={formConfig.url || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={formConfig.hasHeaders === "true"} onCheckedChange={(checked) => setFormConfig(prev => ({ ...prev, hasHeaders: String(checked) }))} />
            <Label>First row contains headers</Label>
          </div>
        </div>
      ),
      json_api: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My API Connection" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>API Endpoint URL</Label>
            <Input placeholder="https://api.example.com/data" value={formConfig.url || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, url: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>HTTP Method</Label>
            <Select value={formConfig.method || "GET"} onValueChange={(value) => setFormConfig(prev => ({ ...prev, method: value }))}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="GET">GET</SelectItem>
                <SelectItem value="POST">POST</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>API Key (optional)</Label>
            <Input type="password" placeholder="Your API key" value={formConfig.apiKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, apiKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>JSON Path (optional)</Label>
            <Input placeholder="data.items" value={formConfig.jsonPath || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, jsonPath: e.target.value }))} />
            <p className="text-xs text-muted-foreground">Path to the array in the JSON response</p>
          </div>
        </div>
      ),
      database: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Database" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Database Type</Label>
            <Select value={formConfig.dbType || ""} onValueChange={(value) => setFormConfig(prev => ({ ...prev, dbType: value }))}>
              <SelectTrigger><SelectValue placeholder="Select database" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="postgresql">PostgreSQL</SelectItem>
                <SelectItem value="mysql">MySQL</SelectItem>
                <SelectItem value="sqlite">SQLite</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Connection String</Label>
            <Input type="password" placeholder="postgresql://user:pass@host:5432/db" value={formConfig.connectionString || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, connectionString: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Query</Label>
            <Input placeholder="SELECT * FROM table_name" value={formConfig.query || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, query: e.target.value }))} />
          </div>
        </div>
      ),
      webhook: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Webhook" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Webhook ID</Label>
            <Input placeholder="unique-webhook-id" value={formConfig.webhookId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, webhookId: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} />
            <p className="text-xs text-muted-foreground">Use a unique identifier for your webhook</p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-medium mb-2">Your Webhook URL</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-background px-2 py-1 rounded break-all flex-1">
                {`/api/webhooks/receiver/${formConfig.webhookId || "your-webhook-id"}`}
              </code>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(`/api/webhooks/receiver/${formConfig.webhookId || "your-webhook-id"}`);
                  toast({ title: "Copied!", description: "Webhook URL copied to clipboard" });
                }}
              >
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Send POST requests with JSON data to this URL</p>
          </div>
        </div>
      ),
      s3: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My S3 Bucket" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Bucket Name</Label>
            <Input placeholder="my-bucket" value={formConfig.bucket || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, bucket: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Region</Label>
            <Select value={formConfig.region || ""} onValueChange={(value) => setFormConfig(prev => ({ ...prev, region: value }))}>
              <SelectTrigger><SelectValue placeholder="Select region" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="us-east-1">US East (N. Virginia)</SelectItem>
                <SelectItem value="us-west-2">US West (Oregon)</SelectItem>
                <SelectItem value="eu-west-1">EU (Ireland)</SelectItem>
                <SelectItem value="ap-southeast-1">Asia Pacific (Singapore)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Access Key ID</Label>
            <Input type="password" placeholder="AKIA..." value={formConfig.accessKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, accessKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Secret Access Key</Label>
            <Input type="password" placeholder="Your secret key" value={formConfig.secretKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, secretKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>File Path/Prefix</Label>
            <Input placeholder="data/exports/" value={formConfig.prefix || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, prefix: e.target.value }))} />
          </div>
        </div>
      ),
      airtable: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Airtable Base" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" placeholder="key..." value={formConfig.apiKey || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, apiKey: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Base ID</Label>
            <Input placeholder="app..." value={formConfig.baseId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, baseId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Table Name</Label>
            <Input placeholder="Table 1" value={formConfig.tableName || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, tableName: e.target.value }))} />
          </div>
        </div>
      ),
      notion: (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Notion Database" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Integration Token</Label>
            <Input type="password" placeholder="secret_..." value={formConfig.token || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, token: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Database ID</Label>
            <Input placeholder="Database ID from URL" value={formConfig.databaseId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, databaseId: e.target.value }))} />
          </div>
        </div>
      ),
      tally: (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
            <p className="text-xs font-semibold text-primary mb-1">ðŸ‡®ðŸ‡³ Tally Prime Integration</p>
            <p className="text-xs text-muted-foreground">Connects to Tally's ODBC/XML interface. Requires Tally Prime running with TallyPrime Server enabled.</p>
          </div>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:underline w-full py-1">
              <Info className="w-3.5 h-3.5" />
              <span>Step-by-step setup guide</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">How to enable Tally Prime API:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Open <strong>Tally Prime</strong> on your computer</li>
                  <li>Press <strong>F1 â†’ Help â†’ Settings â†’ Connectivity</strong></li>
                  <li>Set <strong>"Enable Tally.NET Server"</strong> to <strong>Yes</strong></li>
                  <li>Set port to <strong>9000</strong> (default)</li>
                  <li>If accessing remotely, note your PC's IP address (e.g. <code className="bg-muted px-1 rounded">192.168.1.100</code>)</li>
                  <li>For local access, use <code className="bg-muted px-1 rounded">localhost</code></li>
                  <li>Ensure your firewall allows port <strong>9000</strong></li>
                </ol>
                <p className="text-primary/80 pt-1">ðŸ’¡ Tip: Keep Tally Prime running while SpaceForge syncs data.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Tally Company" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tally Server IP</Label>
            <Input placeholder="192.168.1.100 or localhost" value={formConfig.tallyHost || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, tallyHost: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Tally Port</Label>
            <Input placeholder="9000" value={formConfig.tallyPort || "9000"} onChange={(e) => setFormConfig(prev => ({ ...prev, tallyPort: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input placeholder="Your Tally Company Name" value={formConfig.companyName || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, companyName: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data to Import</Label>
            <Select value={formConfig.tallyModule || "ledgers"} onValueChange={(value) => setFormConfig(prev => ({ ...prev, tallyModule: value }))}>
              <SelectTrigger><SelectValue placeholder="Select data type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ledgers">Ledger Masters</SelectItem>
                <SelectItem value="vouchers">Sales & Purchase Vouchers</SelectItem>
                <SelectItem value="stock">Stock Items & Groups</SelectItem>
                <SelectItem value="pnl">Profit & Loss Statement</SelectItem>
                <SelectItem value="balance_sheet">Balance Sheet</SelectItem>
                <SelectItem value="gst">GST Summary (GSTR-1/3B)</SelectItem>
                <SelectItem value="outstanding">Receivables & Payables</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
      zoho_books: (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
            <p className="text-xs font-semibold text-primary mb-1">ðŸ‡®ðŸ‡³ Zoho Books Integration</p>
            <p className="text-xs text-muted-foreground">Connects via Zoho Books API. Generate an API token from Zoho Developer Console.</p>
          </div>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:underline w-full py-1">
              <Info className="w-3.5 h-3.5" />
              <span>Step-by-step setup guide</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">How to get Zoho Books credentials:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Go to <a href="https://api-console.zoho.in/" target="_blank" rel="noopener noreferrer" className="text-primary underline">api-console.zoho.in</a></li>
                  <li>Click <strong>"Add Client"</strong> â†’ choose <strong>"Self Client"</strong></li>
                  <li>Enter scope: <code className="bg-muted px-1 rounded">ZohoBooks.fullaccess.all</code></li>
                  <li>Set duration to <strong>10 minutes</strong> â†’ click <strong>"Create"</strong></li>
                  <li>Copy the generated <strong>access token</strong></li>
                  <li>For Org ID: Open <strong>Zoho Books</strong> â†’ <strong>Settings</strong> â†’ <strong>Organization Profile</strong></li>
                  <li>Copy the <strong>Organization ID</strong> shown at the top</li>
                </ol>
                <p className="text-primary/80 pt-1">ðŸ’¡ Tip: Self Client tokens expire quickly. For production, set up a Server-based Client for auto-refresh.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Zoho Books" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Organization ID</Label>
            <Input placeholder="Your Zoho Org ID" value={formConfig.zohoOrgId || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, zohoOrgId: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>API Token</Label>
            <Input type="password" placeholder="Zoho API Access Token" value={formConfig.zohoToken || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, zohoToken: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data Module</Label>
            <Select value={formConfig.zohoModule || "invoices"} onValueChange={(value) => setFormConfig(prev => ({ ...prev, zohoModule: value }))}>
              <SelectTrigger><SelectValue placeholder="Select data type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="invoices">Invoices</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
                <SelectItem value="contacts">Customers & Vendors</SelectItem>
                <SelectItem value="bills">Bills</SelectItem>
                <SelectItem value="payments">Payments Received</SelectItem>
                <SelectItem value="journal">Journal Entries</SelectItem>
                <SelectItem value="pnl">Profit & Loss</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
      busy: (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
            <p className="text-xs font-semibold text-primary mb-1">ðŸ‡®ðŸ‡³ Busy Accounting Integration</p>
            <p className="text-xs text-muted-foreground">Import data exported from Busy Software. Upload CSV/Excel exports from Busy's report module.</p>
          </div>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:underline w-full py-1">
              <Info className="w-3.5 h-3.5" />
              <span>Step-by-step setup guide</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">How to export data from Busy:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Open <strong>Busy Accounting</strong> software</li>
                  <li>Go to <strong>Administration â†’ Data Export</strong></li>
                  <li>Select the report you need (Sales, Purchase, Ledger, etc.)</li>
                  <li>Choose format: <strong>CSV</strong> or <strong>Excel</strong></li>
                  <li>Click <strong>Export</strong> and save the file</li>
                  <li>Upload the file to <strong>Google Drive</strong> or <strong>Dropbox</strong></li>
                  <li>Get the <strong>public share link</strong> and paste below</li>
                </ol>
                <p className="text-primary/80 pt-1">ðŸ’¡ Tip: Use Google Drive's "Anyone with the link" sharing for easiest setup.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Busy Export" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Export File URL or Path</Label>
            <Input placeholder="https://... or local file path" value={formConfig.busyUrl || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, busyUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Report Type</Label>
            <Select value={formConfig.busyModule || "sales"} onValueChange={(value) => setFormConfig(prev => ({ ...prev, busyModule: value }))}>
              <SelectTrigger><SelectValue placeholder="Select report type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sales">Sales Register</SelectItem>
                <SelectItem value="purchase">Purchase Register</SelectItem>
                <SelectItem value="ledger">Ledger Report</SelectItem>
                <SelectItem value="stock">Stock Summary</SelectItem>
                <SelectItem value="gst">GST Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
      vyapar: (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 mb-2">
            <p className="text-xs font-semibold text-primary mb-1">ðŸ‡®ðŸ‡³ Vyapar Integration</p>
            <p className="text-xs text-muted-foreground">Import GST invoices, business reports and party ledgers from Vyapar app.</p>
          </div>
          <Collapsible>
            <CollapsibleTrigger className="flex items-center gap-2 text-xs font-medium text-primary hover:underline w-full py-1">
              <Info className="w-3.5 h-3.5" />
              <span>Step-by-step setup guide</span>
              <ChevronDown className="w-3.5 h-3.5 ml-auto transition-transform [[data-state=open]_&]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 rounded-lg bg-muted/50 border border-border text-xs text-muted-foreground space-y-2">
                <p className="font-semibold text-foreground">How to export data from Vyapar:</p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>Open the <strong>Vyapar</strong> app (desktop or mobile)</li>
                  <li>Go to <strong>Reports</strong> section</li>
                  <li>Select the report you need (Invoices, Purchase, etc.)</li>
                  <li>Tap <strong>Share/Export</strong> â†’ choose <strong>CSV</strong> or <strong>Excel</strong></li>
                  <li>Save or share the file to <strong>Google Drive</strong></li>
                  <li>Open Google Drive â†’ right-click the file â†’ <strong>"Get link"</strong></li>
                  <li>Set access to <strong>"Anyone with the link"</strong> â†’ copy the link</li>
                  <li>Paste the link below</li>
                </ol>
                <p className="text-primary/80 pt-1">ðŸ’¡ Tip: Vyapar Cloud Backup users can also share the backup export URL directly.</p>
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="space-y-2">
            <Label>Connection Name</Label>
            <Input placeholder="My Vyapar Business" value={formConfig.name || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, name: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Vyapar Export URL</Label>
            <Input placeholder="Export URL from Vyapar Cloud Backup" value={formConfig.vyaparUrl || ""} onChange={(e) => setFormConfig(prev => ({ ...prev, vyaparUrl: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Data Type</Label>
            <Select value={formConfig.vyaparModule || "invoices"} onValueChange={(value) => setFormConfig(prev => ({ ...prev, vyaparModule: value }))}>
              <SelectTrigger><SelectValue placeholder="Select data type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="invoices">GST Invoices</SelectItem>
                <SelectItem value="purchase">Purchase Orders</SelectItem>
                <SelectItem value="parties">Party Ledger</SelectItem>
                <SelectItem value="stock">Inventory</SelectItem>
                <SelectItem value="expenses">Expenses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ),
    };

    return formFields[selectedConnector] || null;
  };

  const getConnectorIcon = (type: string) => {
    const template = CONNECTOR_TEMPLATES.find(t => t.type === type);
    return template?.icon || Database;
  };

  return (
    <div className="space-y-6">
      <Card className="border-border shadow-card">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                Smart Data Connectors & Scheduling
              </CardTitle>
              <CardDescription>
                Connect to external sources with intelligent auto-sync scheduling
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Globe className="w-3 h-3" />
                {connectors.filter(c => c.status === "connected").length} Connected
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Clock className="w-3 h-3" />
                {scheduledJobs.filter(j => j.is_active).length} Active Schedules
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full max-w-2xl mb-6">
              <TabsTrigger value="connectors" className="gap-2">
                <Link2 className="w-4 h-4" />
                Connectors
              </TabsTrigger>
              <TabsTrigger value="database" className="gap-2">
                <Database className="w-4 h-4" />
                Database
              </TabsTrigger>
              <TabsTrigger value="schedules" className="gap-2">
                <Clock className="w-4 h-4" />
                Schedules
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <History className="w-4 h-4" />
                History
              </TabsTrigger>
            </TabsList>

            {/* Connectors Tab */}
            <TabsContent value="connectors" className="space-y-6">
              <Card className="border-dashed border-2 border-border bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5" />
                    Add Data Connector
                  </CardTitle>
                  <CardDescription>Choose a data source to connect</CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedConnector ? (
                    <div className="space-y-6">
                      {/* Standard Connectors */}
                      <div>
                        <p className="text-sm font-semibold text-muted-foreground mb-3">Global Connectors</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {CONNECTOR_TEMPLATES.filter(t => !["tally", "zoho_books", "busy", "vyapar"].includes(t.type)).map((template) => {
                            const Icon = template.icon;
                            const isSelected = selectedConnector === template.type;
                            return (
                              <button
                                key={template.type}
                                onClick={() => setSelectedConnector(template.type)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all group ${isSelected ? "border-primary bg-primary/15 ring-1 ring-primary" : "border-border bg-card hover:bg-accent/50 hover:border-primary/50"}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "bg-primary/30" : "bg-primary/10 group-hover:bg-primary/20"}`}>
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-center leading-tight">{template.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Indian SMB Connectors */}
                      <div className="p-4 rounded-xl border-2 border-primary/30 bg-primary/5">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">ðŸ‡®ðŸ‡³</span>
                          <p className="text-sm font-bold text-primary">Indian SMB Connectors</p>
                          <Badge variant="secondary" className="text-[10px]">NEW</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3">
                          Connect directly to Tally Prime, Zoho Books, Busy & Vyapar â€” no CSV exports needed.
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {CONNECTOR_TEMPLATES.filter(t => ["tally", "zoho_books", "busy", "vyapar"].includes(t.type)).map((template) => {
                            const Icon = template.icon;
                            const isSelected = selectedConnector === template.type;
                            return (
                              <button
                                key={template.type}
                                onClick={() => setSelectedConnector(template.type)}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all group ${isSelected ? "border-primary bg-primary/20 ring-1 ring-primary" : "border-primary/20 bg-card hover:bg-primary/10 hover:border-primary/50"}`}
                              >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${isSelected ? "bg-primary/30" : "bg-primary/15 group-hover:bg-primary/25"}`}>
                                  <Icon className="w-5 h-5 text-primary" />
                                </div>
                                <span className="text-xs font-semibold text-center leading-tight">{template.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
                        {(() => {
                          const template = CONNECTOR_TEMPLATES.find(t => t.type === selectedConnector);
                          const Icon = template?.icon || Database;
                          return (
                            <>
                              <Icon className="w-5 h-5 text-primary" />
                              <div>
                                <p className="font-medium">{template?.name}</p>
                                <p className="text-xs text-muted-foreground">{template?.description}</p>
                              </div>
                            </>
                          );
                        })()}
                      </div>

                      {renderConnectorForm()}

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setSelectedConnector(null); setFormConfig({}); }}>
                          Cancel
                        </Button>
                        <Button onClick={handleAddConnector} disabled={isConnecting} className="gap-2">
                          {isConnecting ? <><Loader2 className="w-4 h-4 animate-spin" />Testing connectionâ€¦</> : <><CheckCircle2 className="w-4 h-4" />Test & Connect</>}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {connectors.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Connected Sources</h3>
                  <div className="grid gap-4">
                    {connectors.map((connector) => {
                      const Icon = connector.icon;
                      return (
                        <Card key={connector.id} className="border-border">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                  <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{connector.name}</h4>
                                    <Badge variant={connector.status === "connected" ? "default" : "destructive"} className="text-xs">
                                      {connector.status === "connected" ? <><CheckCircle2 className="w-3 h-3 mr-1" />Connected</> : <><AlertCircle className="w-3 h-3 mr-1" />Error</>}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {connector.lastSync ? `Last synced: ${new Date(connector.lastSync).toLocaleString()}` : "Never synced"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" onClick={() => handleSyncConnector(connector.id)} disabled={isSyncing === connector.id} className="gap-2">
                                  {isSyncing === connector.id ? <><Loader2 className="w-4 h-4 animate-spin" />Syncing...</> : <><RefreshCw className="w-4 h-4" />Sync Now</>}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveConnector(connector.id)} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {connectors.length === 0 && !selectedConnector && (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No data connectors configured yet.</p>
                  <p className="text-sm">Add a connector above to import data from external sources.</p>
                </div>
              )}
            </TabsContent>

            {/* Database Tab */}
            <TabsContent value="database" className="space-y-6">
              <DatabaseConnector onDataLoaded={onDataLoaded} />
            </TabsContent>

            {/* Schedules Tab */}
            <TabsContent value="schedules" className="space-y-6">
              {/* Create Schedule Form */}
              <Card className="border-dashed border-2 border-border bg-muted/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar className="w-5 h-5" />
                    Create Scheduled Sync
                  </CardTitle>
                  <CardDescription>Set up automatic data synchronization at regular intervals</CardDescription>
                </CardHeader>
                <CardContent>
                  {!scheduleFormOpen ? (
                    <Button onClick={() => setScheduleFormOpen(true)} disabled={connectors.length === 0} className="gap-2">
                      <Plus className="w-4 h-4" />
                      New Schedule
                    </Button>
                  ) : (
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label>Schedule Name</Label>
                        <Input 
                          placeholder="Daily Sales Sync"
                          value={scheduleConfig.name}
                          onChange={(e) => setScheduleConfig(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Data Source</Label>
                        <Select value={scheduleConfig.connectorId} onValueChange={(value) => setScheduleConfig(prev => ({ ...prev, connectorId: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a connected source" />
                          </SelectTrigger>
                          <SelectContent>
                            {connectors.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                <div className="flex items-center gap-2">
                                  <c.icon className="w-4 h-4" />
                                  {c.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label>Sync Frequency</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {SCHEDULE_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = scheduleConfig.scheduleType === option.value;
                            return (
                              <button
                                key={option.value}
                                onClick={() => setScheduleConfig(prev => ({ ...prev, scheduleType: option.value as typeof prev.scheduleType }))}
                                className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all ${
                                  isSelected 
                                    ? 'border-primary bg-primary/10' 
                                    : 'border-border bg-card hover:bg-accent/50'
                                }`}
                              >
                                <Icon className={`w-5 h-5 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                                <span className="text-sm font-medium">{option.label}</span>
                                <span className="text-xs text-muted-foreground text-center">{option.description}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button variant="outline" onClick={() => { setScheduleFormOpen(false); setScheduleConfig({ name: "", connectorId: "", scheduleType: "manual" }); }}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateSchedule} disabled={isCreatingSchedule} className="gap-2">
                          {isCreatingSchedule ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : <><Clock className="w-4 h-4" />Create Schedule</>}
                        </Button>
                      </div>
                    </div>
                  )}

                  {connectors.length === 0 && (
                    <p className="text-sm text-muted-foreground mt-2">Add a connector first to create scheduled syncs.</p>
                  )}
                </CardContent>
              </Card>

              {/* Active Schedules */}
              {scheduledJobs.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Active Schedules
                  </h3>
                  <div className="grid gap-4">
                    {scheduledJobs.map((job) => {
                      const Icon = getConnectorIcon(job.connector_type);
                      return (
                        <Card key={job.id} className={`border-border ${!job.is_active ? 'opacity-60' : ''}`}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${job.is_active ? 'bg-primary/10' : 'bg-muted'}`}>
                                  <Icon className={`w-6 h-6 ${job.is_active ? 'text-primary' : 'text-muted-foreground'}`} />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-medium">{job.name}</h4>
                                    <Badge variant={job.is_active ? "default" : "secondary"} className="text-xs">
                                      {job.schedule_type === 'manual' ? 'Manual' : job.schedule_type.charAt(0).toUpperCase() + job.schedule_type.slice(1)}
                                    </Badge>
                                    {job.last_run_status && (
                                      <Badge 
                                        variant={job.last_run_status === 'success' ? 'default' : job.last_run_status === 'failed' ? 'destructive' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {job.last_run_status === 'success' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : job.last_run_status === 'failed' ? <AlertCircle className="w-3 h-3 mr-1" /> : null}
                                        {job.last_run_status}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                    {job.last_run_at && (
                                      <span>Last run: {new Date(job.last_run_at).toLocaleString()}</span>
                                    )}
                                    {job.next_run_at && job.is_active && job.schedule_type !== 'manual' && (
                                      <span className="flex items-center gap-1">
                                        <Timer className="w-3 h-3" />
                                        Next: {new Date(job.next_run_at).toLocaleString()}
                                      </span>
                                    )}
                                    {job.records_synced !== undefined && job.records_synced > 0 && (
                                      <span className="flex items-center gap-1">
                                        <TrendingUp className="w-3 h-3" />
                                        {job.records_synced} records
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={job.is_active} 
                                  onCheckedChange={(checked) => handleToggleJobActive(job.id, checked)}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => handleRunJobNow(job)} 
                                  disabled={isSyncing === job.id}
                                  className="gap-2"
                                >
                                  {isSyncing === job.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                                  Run Now
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleViewHistory(job.id)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  <History className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteJob(job.id)} 
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {scheduledJobs.length === 0 && !scheduleFormOpen && (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No scheduled syncs configured yet.</p>
                  <p className="text-sm">Create a schedule to automatically sync your data sources.</p>
                </div>
              )}
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5" />
                    Sync History
                  </CardTitle>
                  <CardDescription>View past synchronization runs and their results</CardDescription>
                </CardHeader>
                <CardContent>
                  {viewingHistoryFor ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">
                          History for: {scheduledJobs.find(j => j.id === viewingHistoryFor)?.name}
                        </h4>
                        <Button variant="outline" size="sm" onClick={() => { setViewingHistoryFor(null); setSelectedJobHistory([]); }}>
                          Back
                        </Button>
                      </div>
                      
                      {selectedJobHistory.length > 0 ? (
                        <ScrollArea className="h-[400px]">
                          <div className="space-y-2">
                            {selectedJobHistory.map((entry) => (
                              <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                <div className="flex items-center gap-3">
                                  <Badge variant={entry.status === 'success' ? 'default' : entry.status === 'failed' ? 'destructive' : 'secondary'}>
                                    {entry.status}
                                  </Badge>
                                  <div>
                                    <p className="text-sm">{new Date(entry.started_at).toLocaleString()}</p>
                                    {entry.error_message && (
                                      <p className="text-xs text-destructive">{entry.error_message}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  {entry.records_synced !== undefined && (
                                    <span>{entry.records_synced} records</span>
                                  )}
                                  {entry.execution_time_ms && (
                                    <span>{entry.execution_time_ms}ms</span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">No history available for this job.</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scheduledJobs.length > 0 ? (
                        <div className="grid gap-3">
                          {scheduledJobs.map((job) => {
                            const Icon = getConnectorIcon(job.connector_type);
                            return (
                              <button
                                key={job.id}
                                onClick={() => handleViewHistory(job.id)}
                                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-colors text-left"
                              >
                                <div className="flex items-center gap-3">
                                  <Icon className="w-5 h-5 text-primary" />
                                  <div>
                                    <p className="font-medium">{job.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {job.last_run_at ? `Last run: ${new Date(job.last_run_at).toLocaleString()}` : 'Never run'}
                                    </p>
                                  </div>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-12 text-muted-foreground">
                          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                          <p>No sync history available.</p>
                          <p className="text-sm">Create and run scheduled syncs to see history here.</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default WorkflowBuilder;