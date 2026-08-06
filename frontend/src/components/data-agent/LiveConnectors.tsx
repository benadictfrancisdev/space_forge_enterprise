import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Database, Cloud, Webhook, FileSpreadsheet, Box, Globe,
  ShoppingBag, Plus, Trash2, RefreshCw, Play, Copy,
  CheckCircle2, XCircle, Loader2, Eye, EyeOff, History, Download,
  Calculator, BookOpen, Store, Briefcase,
} from "lucide-react";
import type { DatasetState } from "@/pages/DataAgent";

interface LiveConnector {
  id: string;
  name: string;
  source_type: string;
  config: Record<string, string>;
  schedule: string;
  next_run_at: string | null;
  last_run_at: string | null;
  last_status: string;
  last_error: string | null;
  last_row_count: number;
  is_active: boolean;
  webhook_token: string | null;
  dataset_id: string | null;
  created_at: string;
}

type FieldKind = "text" | "password" | "select" | "number" | "textarea";
interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  secret?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  optional?: boolean;
  helpText?: string;
}
interface SourceDef {
  id: string;
  label: string;
  icon: typeof Database;
  description: string;
  fields: FieldDef[];
}

const SOURCES: SourceDef[] = [
  // Track 11.3 — framework certification stub (no network I/O)
  {
    id: "platform.echo", label: "Platform Echo (dev)", icon: Box,
    description: "Certification stub for the Track 11 connector framework — create, test health, no external system",
    fields: [
      { key: "message", label: "Echo message", kind: "text", placeholder: "hello", optional: true },
      { key: "row_count", label: "Fake row count", kind: "number", placeholder: "5", optional: true },
    ],
  },
  {
    id: "csv", label: "CSV File", icon: FileSpreadsheet,
    description: "Sync from a CSV already uploaded to SpaceForge storage (paste storage object UUID)",
    fields: [
      { key: "storage_object_id", label: "Storage object ID", kind: "text", placeholder: "uuid from Upload / Storage" },
      { key: "has_header", label: "First row is header", kind: "select", options: [
        { value: "true", label: "Yes" }, { value: "false", label: "No" },
      ], optional: true },
      { key: "delimiter", label: "Delimiter", kind: "text", placeholder: ",", optional: true },
      { key: "encoding", label: "Encoding", kind: "text", placeholder: "utf-8", optional: true },
      { key: "table_name", label: "Logical table name", kind: "text", placeholder: "csv_data", optional: true },
    ],
  },
  {
    id: "excel", label: "Excel (.xlsx)", icon: FileSpreadsheet,
    description: "Sync a single sheet from an Excel workbook in SpaceForge storage",
    fields: [
      { key: "storage_object_id", label: "Storage object ID", kind: "text", placeholder: "uuid from Upload / Storage" },
      { key: "sheet_name", label: "Sheet name", kind: "text", placeholder: "(first sheet)", optional: true },
      { key: "has_header", label: "First row is header", kind: "select", options: [
        { value: "true", label: "Yes" }, { value: "false", label: "No" },
      ], optional: true },
      { key: "table_name", label: "Logical table name", kind: "text", placeholder: "(sheet name)", optional: true },
    ],
  },
  {
    id: "rest_api", label: "REST API", icon: Globe,
    description: "Pull JSON from any REST endpoint (Track 11B — Django-backed)",
    fields: [
      { key: "url", label: "API URL", kind: "text", placeholder: "https://api.example.com/v1/orders" },
      { key: "method", label: "Method", kind: "select", options: [{ value: "GET", label: "GET" }, { value: "POST", label: "POST" }] },
      { key: "apiKey", label: "Bearer token / API key", kind: "password", secret: true, optional: true },
      { key: "headers", label: "Extra headers (JSON)", kind: "textarea", optional: true, placeholder: '{"X-Custom": "value"}' },
      { key: "body", label: "Request body (POST)", kind: "textarea", optional: true },
      { key: "jsonPath", label: "Path to data array", kind: "text", optional: true, placeholder: "data.items" },
      { key: "table_name", label: "Logical table name", kind: "text", placeholder: "rest_data", optional: true },
    ],
  },
  {
    id: "postgresql", label: "PostgreSQL", icon: Database,
    description: "Connect to PostgreSQL and sync a table (Track 11B — Django-backed)",
    fields: [
      { key: "host", label: "Host", kind: "text", placeholder: "db.example.com" },
      { key: "port", label: "Port", kind: "number", placeholder: "5432" },
      { key: "database", label: "Database", kind: "text" },
      { key: "username", label: "Username", kind: "text" },
      { key: "password", label: "Password", kind: "password", secret: true },
      { key: "table", label: "Table", kind: "text", placeholder: "public.orders" },
      { key: "ssl", label: "SSL", kind: "select", options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }] },
    ],
  },
  {
    id: "mysql", label: "MySQL", icon: Database,
    description: "Connect to MySQL and sync a table (Track 11B — Django-backed)",
    fields: [
      { key: "host", label: "Host", kind: "text", placeholder: "db.example.com" },
      { key: "port", label: "Port", kind: "number", placeholder: "3306" },
      { key: "database", label: "Database", kind: "text" },
      { key: "username", label: "Username", kind: "text" },
      { key: "password", label: "Password", kind: "password", secret: true },
      { key: "table", label: "Table", kind: "text", placeholder: "shop.orders" },
    ],
  },
  {
    id: "sqlserver", label: "SQL Server", icon: Database,
    description: "Connect to Microsoft SQL Server and sync a table (Track 11B — Django-backed)",
    fields: [
      { key: "host", label: "Host", kind: "text", placeholder: "sql.example.com" },
      { key: "port", label: "Port", kind: "number", placeholder: "1433" },
      { key: "database", label: "Database", kind: "text" },
      { key: "username", label: "Username", kind: "text" },
      { key: "password", label: "Password", kind: "password", secret: true },
      { key: "table", label: "Table", kind: "text", placeholder: "dbo.orders" },
    ],
  },
  {
    id: "mongodb", label: "MongoDB", icon: Database,
    description: "Sync a MongoDB collection (Track 11B — Django-backed)",
    fields: [
      { key: "host", label: "Host", kind: "text", placeholder: "cluster.example.mongodb.net" },
      { key: "port", label: "Port", kind: "number", placeholder: "27017", optional: true },
      { key: "database", label: "Database", kind: "text" },
      { key: "collection", label: "Collection", kind: "text", placeholder: "orders" },
      { key: "username", label: "Username", kind: "text", optional: true },
      { key: "password", label: "Password", kind: "password", secret: true, optional: true },
      { key: "filter", label: "Query filter (JSON)", kind: "textarea", optional: true, placeholder: '{"status": "active"}' },
    ],
  },
  {
    id: "aws_s3", label: "AWS S3", icon: Cloud,
    description: "Read CSV / JSON / JSONL from S3 or MinIO (Track 11B — Django-backed)",
    fields: [
      { key: "accessKey", label: "Access Key ID", kind: "password", secret: true },
      { key: "secretKey", label: "Secret Access Key", kind: "password", secret: true },
      { key: "region", label: "Region", kind: "text", placeholder: "us-east-1" },
      { key: "endpoint_url", label: "Endpoint URL (MinIO)", kind: "text", placeholder: "http://localhost:9000", optional: true },
      { key: "bucket", label: "Bucket", kind: "text" },
      { key: "key", label: "Object key (path)", kind: "text", placeholder: "exports/data.csv" },
      { key: "fileType", label: "File type", kind: "select", options: [
        { value: "csv", label: "CSV" }, { value: "json", label: "JSON" }, { value: "jsonl", label: "JSON Lines" },
      ] },
      { key: "jsonPath", label: "JSON path (optional)", kind: "text", optional: true, placeholder: "data.items" },
    ],
  },
  {
    id: "airtable", label: "Airtable", icon: Box,
    description: "Sync records from an Airtable base (Track 11B — Django-backed)",
    fields: [
      { key: "baseId", label: "Base ID", kind: "text", placeholder: "appXXXXXXXXXXXXXX" },
      { key: "tableName", label: "Table name", kind: "text", placeholder: "Orders" },
      { key: "apiKey", label: "Personal Access Token", kind: "password", secret: true, placeholder: "patXXXXXXXXXXXXXX" },
    ],
  },
  {
    id: "shopify", label: "Shopify", icon: ShoppingBag,
    description: "Sync orders, products, customers or inventory (Track 11B — Django-backed)",
    fields: [
      { key: "shopDomain", label: "Shop domain", kind: "text", placeholder: "mystore.myshopify.com" },
      { key: "adminApiKey", label: "Admin API access token", kind: "password", secret: true },
      { key: "resource", label: "Sync", kind: "select", options: [
        { value: "orders", label: "Orders" }, { value: "products", label: "Products" },
        { value: "customers", label: "Customers" }, { value: "inventory_items", label: "Inventory" },
      ] },
    ],
  },
  // â”€â”€â”€ Indian accounting software (one-click feel) â”€â”€â”€
  {
    id: "tally", label: "Tally â€” One-click Sync", icon: Calculator,
    description: "Sync Sales, Purchase, Ledger & GST from Tally Prime / ERP 9 via the Tally XML Gateway",
    fields: [
      { key: "gatewayUrl", label: "Tally Gateway URL", kind: "text", placeholder: "http://localhost:9000",
        helpText: "In Tally: F1 â†’ Configure â†’ Connectivity â†’ enable ODBC/Gateway on a port (default 9000). For remote access expose via tunnel (ngrok/cloudflared)." },
      { key: "company", label: "Company name", kind: "text", placeholder: "ABC Traders Pvt Ltd", optional: true },
      { key: "report", label: "Data to fetch", kind: "select", options: [
        { value: "sales", label: "Sales Vouchers" },
        { value: "purchase", label: "Purchase Vouchers" },
        { value: "ledger", label: "Ledger Balances" },
        { value: "gst", label: "GST Summary" },
        { value: "stock", label: "Stock Items" },
      ] },
      { key: "fromDate", label: "From date", kind: "text", placeholder: "20240401", optional: true, helpText: "YYYYMMDD format" },
      { key: "toDate", label: "To date", kind: "text", placeholder: "20250331", optional: true },
    ],
  },
  {
    id: "zoho_books", label: "Zoho Books â€” Auto-import", icon: BookOpen,
    description: "Pull Invoices, Customers, Expenses & Items via Zoho Books REST API (OAuth 2.0 refresh token)",
    fields: [
      { key: "organizationId", label: "Organization ID", kind: "text", placeholder: "60012345678",
        helpText: "Zoho Books â†’ Settings â†’ Organization Profile â†’ Organization ID" },
      { key: "region", label: "Data center", kind: "select", options: [
        { value: "in", label: "India (.in)" }, { value: "com", label: "Global (.com)" },
        { value: "eu", label: "Europe (.eu)" }, { value: "com.au", label: "Australia (.com.au)" },
      ] },
      { key: "resource", label: "Sync", kind: "select", options: [
        { value: "invoices", label: "Invoices" }, { value: "customers", label: "Customers" },
        { value: "expenses", label: "Expenses" }, { value: "items", label: "Items" },
        { value: "bills", label: "Bills" }, { value: "estimates", label: "Estimates" },
      ] },
      { key: "clientId", label: "OAuth Client ID", kind: "password", secret: true,
        helpText: "Create a Self Client at api-console.zoho.com" },
      { key: "clientSecret", label: "OAuth Client Secret", kind: "password", secret: true },
      { key: "refreshToken", label: "Refresh Token", kind: "password", secret: true,
        helpText: "Generated once via the OAuth consent flow with scope ZohoBooks.fullaccess.READ" },
    ],
  },
  {
    id: "vyapar", label: "Vyapar â€” Direct Connect", icon: Store,
    description: "Auto-sync Vyapar exports from a Google Drive / public URL â€” no manual import",
    fields: [
      { key: "exportUrl", label: "Export file URL", kind: "text",
        placeholder: "https://drive.google.com/uc?id=FILE_ID&export=download",
        helpText: "In Vyapar â†’ Backup/Export to CSV â†’ upload to Google Drive (Anyone with link â†’ Viewer) and paste the direct-download URL here" },
      { key: "format", label: "File format", kind: "select", options: [
        { value: "csv", label: "CSV" }, { value: "xlsx", label: "Excel (XLSX)" },
        { value: "json", label: "JSON" },
      ] },
      { key: "dataType", label: "Data type", kind: "select", options: [
        { value: "sales", label: "Sales / Invoices" }, { value: "purchase", label: "Purchase Bills" },
        { value: "parties", label: "Parties (Customers + Vendors)" }, { value: "items", label: "Items / Stock" },
        { value: "expenses", label: "Expenses" },
      ] },
    ],
  },
  {
    id: "busy", label: "Busy â€” Seamless Sync", icon: Briefcase,
    description: "Connect to BUSY accounting via the BUSY Web API or a published CSV/JSON export",
    fields: [
      { key: "endpoint", label: "Busy endpoint URL", kind: "text",
        placeholder: "http://your-busy-server:8080/api/export",
        helpText: "Either the Busy Web API URL (Busy 21+ â†’ Administration â†’ Web Service) or a hosted CSV/JSON export of the data" },
      { key: "companyCode", label: "Company code", kind: "text", placeholder: "ABC2425", optional: true },
      { key: "format", label: "Response format", kind: "select", options: [
        { value: "json", label: "JSON" }, { value: "csv", label: "CSV" }, { value: "xml", label: "XML" },
      ] },
      { key: "dataType", label: "Data type", kind: "select", options: [
        { value: "sales", label: "Sales" }, { value: "purchase", label: "Purchase" },
        { value: "ledger", label: "Ledger / Accounts" }, { value: "stock", label: "Stock" },
        { value: "gst", label: "GST Summary" },
      ] },
      { key: "apiKey", label: "API key / token", kind: "password", secret: true, optional: true,
        helpText: "Leave blank for unauthenticated public exports" },
    ],
  },
  {
    id: "google_sheets", label: "Google Sheets", icon: FileSpreadsheet,
    description: "Public or shared spreadsheet (link must allow viewing)",
    fields: [
      { key: "url", label: "Spreadsheet URL", kind: "text", placeholder: "https://docs.google.com/spreadsheets/d/..." },
      { key: "sheet", label: "Sheet name", kind: "text", placeholder: "Sheet1", optional: true },
    ],
  },
  {
    id: "aws_rds", label: "AWS RDS", icon: Database,
    description: "Connect to a PostgreSQL-compatible RDS instance",
    fields: [
      { key: "host", label: "RDS endpoint", kind: "text", placeholder: "mydb.xxxx.rds.amazonaws.com" },
      { key: "port", label: "Port", kind: "number", placeholder: "5432" },
      { key: "database", label: "Database", kind: "text" },
      { key: "username", label: "Username", kind: "text" },
      { key: "password", label: "Password", kind: "password", secret: true },
      { key: "table", label: "Table", kind: "text" },
      { key: "ssl", label: "SSL", kind: "select", options: [{ value: "true", label: "Enabled" }, { value: "false", label: "Disabled" }] },
    ],
  },
  {
    id: "aws_redshift", label: "AWS Redshift", icon: Database,
    description: "Sync from a Redshift cluster table",
    fields: [
      { key: "host", label: "Cluster endpoint", kind: "text" },
      { key: "port", label: "Port", kind: "number", placeholder: "5439" },
      { key: "database", label: "Database", kind: "text" },
      { key: "username", label: "Username", kind: "text" },
      { key: "password", label: "Password", kind: "password", secret: true },
      { key: "schema", label: "Schema", kind: "text", placeholder: "public" },
      { key: "table", label: "Table", kind: "text" },
    ],
  },
  {
    id: "webhook", label: "Webhook", icon: Webhook,
    description: "Generate a unique URL â€” POST data to it from any external service",
    fields: [],
  },
];

const SCHEDULES = [
  { value: "manual", label: "Manual only" },
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

interface Props {
  onDataLoaded?: (data: DatasetState) => void;
}

const LiveConnectors = ({ onDataLoaded }: Props) => {
  const { user } = useAuth();
  const [connectors, setConnectors] = useState<LiveConnector[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState<{ source: SourceDef; existing?: LiveConnector } | null>(null);
  const [runsFor, setRunsFor] = useState<LiveConnector | null>(null);
  const [runs, setRuns] = useState<Array<{ id: string; status: string; row_count: number; duration_ms: number; error: string | null; created_at: string; triggered_by: string }>>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await invokeEdgeFunction<{ success: boolean; data: LiveConnector[]; error?: string }>("live-connectors", { action: "list", userId: user?.id });
    setLoading(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Failed to load connectors");
      return;
    }
    setConnectors(data.data || []);
  };

  useEffect(() => { if (user) load(); }, [user?.id]);

  const handleSyncNow = async (c: LiveConnector) => {
    toast.info(`Syncing ${c.name}â€¦`);
    const { data, error } = await invokeEdgeFunction<{ success: boolean; rowCount: number; error?: string; datasetId?: string }>(
      "live-connectors", { action: "sync", id: c.id, userId: user?.id, triggered_by: "manual" }
    );
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Sync failed");
    } else {
      toast.success(`Synced ${data.rowCount} rows`);
    }
    load();
  };

  const handleLoadIntoAgent = async (c: LiveConnector) => {
    if (!c.dataset_id) {
      toast.warning("Run Sync first to fetch data");
      return;
    }
    const { data, error } = await invokeEdgeFunction<{ success: boolean; data: { id: string; name: string; raw_data: Record<string, unknown>[]; columns: string[] }; error?: string }>(
      "live-connectors", { action: "load_dataset", id: c.id, userId: user?.id }
    );
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Failed to load");
      return;
    }
    onDataLoaded?.({
      id: data.data.id,
      name: data.data.name,
      rawData: data.data.raw_data || [],
      columns: data.data.columns || [],
      status: "uploaded",
    });
    toast.success("Loaded into Data Agent");
  };

  const handleDelete = async (c: LiveConnector) => {
    if (!confirm(`Delete connector "${c.name}"?`)) return;
    const { data, error } = await invokeEdgeFunction<{ success: boolean; error?: string }>(
      "live-connectors", { action: "delete", id: c.id, userId: user?.id }
    );
    if (error || !data?.success) toast.error(data?.error || "Delete failed");
    else { toast.success("Deleted"); load(); }
  };

  const showRuns = async (c: LiveConnector) => {
    setRunsFor(c);
    const { data } = await invokeEdgeFunction<{ success: boolean; data: typeof runs }>("live-connectors", { action: "runs", id: c.id, userId: user?.id });
    setRuns(data?.data || []);
  };

  const sourceMap = useMemo(() => Object.fromEntries(SOURCES.map((s) => [s.id, s])), []);

  return (
    <div className="space-y-4">
      <Card className="premium-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Cloud className="h-5 w-5 text-primary" />
                Live Data Connectors
              </CardTitle>
              <CardDescription>
                Connect live data sources â€” SpaceForge will pull fresh data and analyze it automatically
              </CardDescription>
            </div>
            <Button onClick={() => setPickerOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> New Connection
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
          ) : connectors.length === 0 ? (
            <div className="text-center py-12">
              <Cloud className="h-12 w-12 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground mb-4">No live connectors yet</p>
              <Button variant="outline" onClick={() => setPickerOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Connect a data source
              </Button>
            </div>
          ) : (
            <div className="grid gap-3">
              {connectors.map((c) => {
                const def = sourceMap[c.source_type];
                const Icon = def?.icon || Database;
                const statusBadge =
                  c.last_status === "success" ? <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Synced</Badge>
                  : c.last_status === "failed" ? <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Failed</Badge>
                  : c.last_status === "running" ? <Badge variant="secondary" className="gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Running</Badge>
                  : <Badge variant="outline">Idle</Badge>;
                return (
                  <Card key={c.id} className="border-border/50">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-md bg-primary/10 shrink-0">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium truncate">{c.name}</h4>
                              {statusBadge}
                              <Badge variant="outline" className="text-xs">{def?.label || c.source_type}</Badge>
                              <Badge variant="outline" className="text-xs">{SCHEDULES.find((s) => s.value === c.schedule)?.label}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {c.last_row_count > 0 && <>{c.last_row_count.toLocaleString()} rows Â· </>}
                              {c.last_run_at ? `Last run ${new Date(c.last_run_at).toLocaleString()}` : "Never run"}
                            </p>
                            {c.last_error && (
                              <p className="text-xs text-destructive mt-1 truncate" title={c.last_error}>{c.last_error}</p>
                            )}
                            {c.source_type === "webhook" && c.webhook_token && (
                              <WebhookUrl token={c.webhook_token} />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => handleSyncNow(c)} title="Sync now">
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleLoadIntoAgent(c)} title="Load into Data Agent" disabled={!c.dataset_id}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => showRuns(c)} title="History">
                            <History className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => def && setEditing({ source: def, existing: c })} title="Edit" disabled={!def}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(c)} title="Delete">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SourcePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onPick={(s) => { setPickerOpen(false); setEditing({ source: s }); }}
      />

      {editing && (
        <ConnectorFormDialog
          source={editing.source}
          existing={editing.existing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <Dialog open={!!runsFor} onOpenChange={(o) => !o && setRunsFor(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sync history â€” {runsFor?.name}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-96">
            {runs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No runs yet</p>
            ) : (
              <div className="space-y-2">
                {runs.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm border border-border/50 rounded-md p-2">
                    <div className="flex items-center gap-2">
                      {r.status === "success" ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <span>{new Date(r.created_at).toLocaleString()}</span>
                      <Badge variant="outline" className="text-xs">{r.triggered_by}</Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">
                      {r.status === "success" ? `${r.row_count} rows Â· ${r.duration_ms}ms` : (r.error || "Failed")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const WebhookUrl = ({ token }: { token: string }) => {
  const url = `/api/webhooks/receiver/${token}`;
  return (
    <div className="flex items-center gap-2 mt-2 p-2 bg-muted rounded-md text-xs font-mono">
      <code className="truncate flex-1">{url}</code>
      <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { navigator.clipboard.writeText(url); toast.success("Copied"); }}>
        <Copy className="h-3 w-3" />
      </Button>
    </div>
  );
};

const SourcePickerDialog = ({ open, onOpenChange, onPick }: {
  open: boolean; onOpenChange: (o: boolean) => void; onPick: (s: SourceDef) => void;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Choose a data source</DialogTitle>
        <DialogDescription>Connect any of these to start syncing live data into SpaceForge</DialogDescription>
      </DialogHeader>
      <div className="grid grid-cols-2 gap-2">
        {SOURCES.map((s) => {
          const Icon = s.icon;
          return (
            <button key={s.id} onClick={() => onPick(s)} className="text-left p-3 border border-border/50 hover:border-primary hover:bg-primary/5 rounded-lg transition-colors">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-md bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
                <div className="min-w-0">
                  <h4 className="font-medium text-sm">{s.label}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{s.description}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </DialogContent>
  </Dialog>
);

const ConnectorFormDialog = ({ source, existing, onClose, onSaved }: {
  source: SourceDef; existing?: LiveConnector; onClose: () => void; onSaved: () => void;
}) => {
  const { user } = useAuth();
  const [name, setName] = useState(existing?.name || `${source.label} connection`);
  const [schedule, setSchedule] = useState(existing?.schedule || "manual");
  const [config, setConfig] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of source.fields) if (!f.secret) init[f.key] = (existing?.config?.[f.key] as string) ?? "";
    return init;
  });
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({});
  const [testResult, setTestResult] = useState<{ ok: boolean; rowCount?: number; error?: string } | null>(null);

  const setVal = (f: FieldDef, v: string) => {
    if (f.secret) setSecrets((s) => ({ ...s, [f.key]: v }));
    else setConfig((c) => ({ ...c, [f.key]: v }));
  };

  const validate = (): string | null => {
    for (const f of source.fields) {
      if (f.optional) continue;
      if (f.secret) {
        if (!existing && !secrets[f.key]) return `${f.label} is required`;
      } else if (!config[f.key]) return `${f.label} is required`;
    }
    return null;
  };

  const handleTest = async () => {
    if (source.id === "webhook") {
      toast.info("Webhooks have no test â€” they receive data when external services POST to the URL");
      return;
    }
    const err = validate();
    if (err) { toast.error(err); return; }
    setTesting(true); setTestResult(null);
    const { data, error } = await invokeEdgeFunction<{ success: boolean; rowCount?: number; error?: string }>(
      "live-connectors", { action: "test", source_type: source.id, config, secrets, userId: user?.id }
    );
    setTesting(false);
    if (error || !data?.success) {
      setTestResult({ ok: false, error: data?.error || error?.message || "Test failed" });
    } else {
      setTestResult({ ok: true, rowCount: data.rowCount });
    }
  };

  const handleSave = async () => {
    const err = validate();
    if (err) { toast.error(err); return; }
    setSaving(true);
    const action = existing ? "update" : "create";
    const payload: Record<string, unknown> = existing
      ? { action, id: existing.id, name, config, schedule, ...(Object.keys(secrets).length ? { secrets } : {}), userId: user?.id }
      : { action, name, source_type: source.id, config, secrets, schedule, userId: user?.id };
    const { data, error } = await invokeEdgeFunction<{ success: boolean; error?: string }>("live-connectors", payload);
    setSaving(false);
    if (error || !data?.success) {
      toast.error(data?.error || error?.message || "Save failed");
      return;
    }
    toast.success(existing ? "Connector updated" : "Connector created");
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><source.icon className="h-5 w-5" /> {source.label}</DialogTitle>
          <DialogDescription>{source.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Connection name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          {source.fields.map((f) => {
            const val = f.secret ? (secrets[f.key] || "") : (config[f.key] || "");
            return (
              <div key={f.key} className="space-y-1.5">
                <Label>{f.label}{f.optional && <span className="text-muted-foreground"> (optional)</span>}</Label>
                {f.kind === "select" ? (
                  <Select value={val} onValueChange={(v) => setVal(f, v)}>
                    <SelectTrigger><SelectValue placeholder="Chooseâ€¦" /></SelectTrigger>
                    <SelectContent className="bg-popover">
                      {f.options?.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : f.kind === "textarea" ? (
                  <Textarea value={val} onChange={(e) => setVal(f, e.target.value)} placeholder={f.placeholder} rows={3} />
                ) : f.kind === "password" ? (
                  <div className="relative">
                    <Input
                      type={showSecret[f.key] ? "text" : "password"}
                      value={val}
                      onChange={(e) => setVal(f, e.target.value)}
                      placeholder={existing ? "â€¢â€¢â€¢â€¢ (leave blank to keep)" : f.placeholder}
                    />
                    <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-7 w-7 p-0"
                      onClick={() => setShowSecret((s) => ({ ...s, [f.key]: !s[f.key] }))}>
                      {showSecret[f.key] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    </Button>
                  </div>
                ) : (
                  <Input type={f.kind === "number" ? "number" : "text"} value={val}
                    onChange={(e) => setVal(f, e.target.value)} placeholder={f.placeholder} />
                )}
                {f.helpText && <p className="text-xs text-muted-foreground">{f.helpText}</p>}
              </div>
            );
          })}

          <div className="space-y-1.5">
            <Label>Sync schedule</Label>
            <Select value={schedule} onValueChange={setSchedule}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent className="bg-popover">
                {SCHEDULES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {testResult && (
            <div className={`p-2 rounded-md text-sm ${testResult.ok ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
              {testResult.ok ? `âœ“ Test successful â€” fetched ${testResult.rowCount} rows` : `âœ— ${testResult.error}`}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {source.id !== "webhook" && (
            <Button variant="secondary" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
              Test
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {existing ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LiveConnectors;
