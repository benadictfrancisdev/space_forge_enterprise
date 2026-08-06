import { useState, useEffect } from "react";
import { backend, isApiConfigured } from "@/platform";
import { handleDjangoDbConnectInvoke } from "@/platform/djangoDbConnect";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Database,
  Server,
  Lock,
  CheckCircle2,
  XCircle,
  Loader2,
  Plus,
  Trash2,
  Play,
  Sparkles,
  Table,
  Eye,
  EyeOff,
  Copy,
  Save,
  RefreshCw,
} from "lucide-react";

interface DatabaseConnection {
  id: string;
  name: string;
  db_type: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_enabled: boolean;
  is_active: boolean;
  connection_status: string;
  last_connected_at: string | null;
  created_at: string;
}

interface ConnectionForm {
  name: string;
  db_type: 'postgresql' | 'mysql' | 'sqlite' | 'mongodb';
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_enabled: boolean;
}

const DEFAULT_PORTS: Record<string, number> = {
  postgresql: 5432,
  mysql: 3306,
  sqlite: 0,
  mongodb: 27017,
};

const DB_TYPES = [
  { value: 'postgresql', label: 'PostgreSQL', icon: 'ðŸ˜' },
  { value: 'mysql', label: 'MySQL', icon: 'ðŸ¬' },
  { value: 'sqlite', label: 'SQLite', icon: 'ðŸ“¦' },
  { value: 'mongodb', label: 'MongoDB', icon: 'ðŸƒ' },
];

interface DatabaseConnectorProps {
  onDataLoaded?: (data: { name: string; rawData: Record<string, unknown>[]; columns: string[]; status: string }) => void;
}

const DatabaseConnector = ({ onDataLoaded }: DatabaseConnectorProps) => {
  const { user } = useAuth();
  const [connections, setConnections] = useState<DatabaseConnection[]>([]);
  const [selectedConnection, setSelectedConnection] = useState<DatabaseConnection | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("connections");
  
  // Form state
  const [form, setForm] = useState<ConnectionForm>({
    name: '',
    db_type: 'postgresql',
    host: '',
    port: 5432,
    database_name: '',
    username: '',
    password: '',
    ssl_enabled: true,
  });

  // Query state
  const [naturalQuery, setNaturalQuery] = useState('');
  const [generatedSQL, setGeneratedSQL] = useState('');
  const [sqlExplanation, setSqlExplanation] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[] | null>(null);

  // Tables state
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<{ columns: { name: string; type: string }[] } | null>(null);

  // Load saved connections
  useEffect(() => {
    if (user) {
      loadConnections();
    }
  }, [user]);

  const loadConnections = async () => {
    if (isApiConfigured()) {
      const result = await handleDjangoDbConnectInvoke({ action: "list" });
      if (!result.success) {
        console.error("Failed to load connections:", result.error);
        return;
      }
      setConnections((result.data as DatabaseConnection[]) || []);
      return;
    }

    const { data, error } = await backend
      .from("database_connections")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load connections:", error);
      return;
    }

    setConnections(data || []);
  };

  const handleDbTypeChange = (value: string) => {
    setForm(prev => ({
      ...prev,
      db_type: value as ConnectionForm['db_type'],
      port: DEFAULT_PORTS[value] || 5432,
    }));
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await backend.functions.invoke('db-connect', {
        body: { action: 'test', connection: form, userId: user?.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");

      if (data.success) {
        toast.success(data.message);
        if (data.tables) {
          setTables(data.tables);
        }
      } else {
        toast.error(data.message || 'Connection test failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveConnection = async () => {
    if (!form.name || !form.host || !form.database_name || !form.password) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (form.db_type !== 'sqlite' && form.db_type !== 'mongodb' && !form.username) {
      toast.error('Username is required for this database type');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await backend.functions.invoke('db-connect', {
        body: { action: 'save', connection: form, userId: user?.id }
      });

      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");

      if (data.success) {
        toast.success('Connection saved successfully');
        loadConnections();
        setForm({
          name: '',
          db_type: 'postgresql',
          host: '',
          port: 5432,
          database_name: '',
          username: '',
          password: '',
          ssl_enabled: true,
        });
        setActiveTab('connections');
      } else {
        toast.error(data.error || 'Failed to save connection');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      const { error } = await backend.functions.invoke('db-connect', {
        body: { action: 'delete', connectionId: id, userId: user?.id }
      });

      if (error) throw error;

      toast.success('Connection deleted');
      loadConnections();
      if (selectedConnection?.id === id) {
        setSelectedConnection(null);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete connection');
    }
  };

  const handleSelectConnection = async (conn: DatabaseConnection) => {
    setSelectedConnection(conn);
    setActiveTab('query');
    
    // Load tables for this connection
    try {
      const { data } = await backend.functions.invoke('db-connect', {
        body: { action: 'list-tables', connectionId: conn.id, userId: user?.id }
      });
      
      if (data?.tables) {
        setTables(data.tables);
      }
    } catch (error) {
      console.error('Failed to load tables:', error);
    }
  };

  const handleGenerateSQL = async () => {
    if (!naturalQuery.trim()) {
      toast.error('Please enter a query');
      return;
    }

    if (!selectedConnection) {
      toast.error('Please select a database connection first');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await backend.functions.invoke('db-connect', {
        body: {
          action: 'nl-query',
          connectionId: selectedConnection.id,
          naturalLanguageQuery: naturalQuery,
          tableContext: tables,
          userId: user?.id,
        }
      });

      if (error) throw error;

      if (data.success) {
        setGeneratedSQL(data.sql);
        setSqlExplanation(data.explanation);
        toast.success('SQL generated successfully');
      } else {
        toast.error(data.error || 'Failed to generate SQL');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate SQL');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecuteQuery = async () => {
    if (!generatedSQL.trim()) {
      toast.error('No SQL to execute');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await backend.functions.invoke('db-connect', {
        body: {
          action: 'query',
          connectionId: selectedConnection?.id,
          sql: generatedSQL,
          userId: user?.id,
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(typeof data.error === "string" ? data.error : "AI service error");

      if (data.success) {
        setQueryResults(data.results || []);
        toast.success(`Query executed. ${data.rowCount || 0} rows returned.`);
        
        // If results exist, offer to load into data agent
        if (data.results?.length > 0 && onDataLoaded) {
          onDataLoaded({
            name: `Query Result - ${new Date().toLocaleString()}`,
            rawData: data.results,
            columns: Object.keys(data.results[0] || {}),
            status: 'uploaded',
          });
        }
      } else {
        toast.error(data.error || 'Query execution failed');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Query execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6">
      <Card className="premium-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Database Connections</CardTitle>
              <CardDescription>Connect to external databases and query with natural language</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="connections" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                Connections
              </TabsTrigger>
              <TabsTrigger value="new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Connection
              </TabsTrigger>
              <TabsTrigger value="query" className="flex items-center gap-2" disabled={!selectedConnection}>
                <Sparkles className="h-4 w-4" />
                Query
              </TabsTrigger>
            </TabsList>

            {/* Saved Connections Tab */}
            <TabsContent value="connections" className="space-y-4">
              {connections.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No database connections yet</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => setActiveTab('new')}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Connection
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4">
                  {connections.map((conn) => (
                    <Card 
                      key={conn.id} 
                      className={`cursor-pointer transition-all hover:border-primary/50 ${
                        selectedConnection?.id === conn.id ? 'border-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleSelectConnection(conn)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">
                              {DB_TYPES.find(t => t.value === conn.db_type)?.icon || 'ðŸ“Š'}
                            </div>
                            <div>
                              <h4 className="font-medium">{conn.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {conn.host}:{conn.port} / {conn.database_name}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={conn.connection_status === 'active' ? 'default' : 'secondary'}>
                              {conn.connection_status}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConnection(conn.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* New Connection Tab */}
            <TabsContent value="new" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Connection Name *</Label>
                  <Input
                    placeholder="My Production DB"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Database Type *</Label>
                  <Select value={form.db_type} onValueChange={handleDbTypeChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      {DB_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <span>{type.icon}</span>
                            <span>{type.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.db_type === 'sqlite' && (
                  <div className="md:col-span-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                    SQLite connections use Turso/LibSQL. Enter your Turso database URL as Host and auth token as Password.
                  </div>
                )}
                {form.db_type === 'mongodb' && (
                  <div className="md:col-span-2 p-3 bg-green-50 dark:bg-green-950/30 rounded-lg text-sm text-green-700 dark:text-green-300">
                    MongoDB connects via Atlas Data API. Enter your Data API endpoint as Host and API key as Password.
                  </div>
                )}

                <div className="space-y-2">
                  <Label>{form.db_type === 'sqlite' ? 'Turso Database URL *' : form.db_type === 'mongodb' ? 'Atlas Data API Endpoint *' : 'Host *'}</Label>
                  <Input
                    placeholder={form.db_type === 'sqlite' ? 'mydb-myorg.turso.io' : form.db_type === 'mongodb' ? 'data.mongodb-api.com' : 'localhost or db.example.com'}
                    value={form.host}
                    onChange={(e) => setForm(prev => ({ ...prev, host: e.target.value }))}
                  />
                </div>

                {form.db_type !== 'sqlite' && (
                <div className="space-y-2">
                  <Label>Port {form.db_type === 'mongodb' ? '' : '*'}</Label>
                  <Input
                    type="number"
                    value={form.port}
                    onChange={(e) => setForm(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                )}

                <div className="space-y-2">
                  <Label>{form.db_type === 'mongodb' ? 'Database / Data Source *' : 'Database Name *'}</Label>
                  <Input
                    placeholder={form.db_type === 'mongodb' ? 'Cluster0' : 'mydb'}
                    value={form.database_name}
                    onChange={(e) => setForm(prev => ({ ...prev, database_name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{form.db_type === 'sqlite' ? 'Username (optional)' : 'Username *'}</Label>
                  <Input
                    placeholder={form.db_type === 'postgresql' ? 'postgres' : form.db_type === 'mysql' ? 'root' : form.db_type === 'sqlite' ? 'optional' : 'api-user'}
                    value={form.username}
                    onChange={(e) => setForm(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>{form.db_type === 'sqlite' ? 'Auth Token *' : form.db_type === 'mongodb' ? 'API Key *' : 'Password *'}</Label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢"
                      value={form.password}
                      onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Switch
                    id="ssl"
                    checked={form.ssl_enabled}
                    onCheckedChange={(checked) => setForm(prev => ({ ...prev, ssl_enabled: checked }))}
                  />
                  <Label htmlFor="ssl" className="flex items-center gap-2 cursor-pointer">
                    <Lock className="h-4 w-4" />
                    Enable SSL
                  </Label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                >
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Test Connection
                </Button>
                <Button onClick={handleSaveConnection} disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Connection
                </Button>
              </div>
            </TabsContent>

            {/* Query Tab */}
            <TabsContent value="query" className="space-y-6">
              {selectedConnection && (
                <>
                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {DB_TYPES.find(t => t.value === selectedConnection.db_type)?.icon}
                      </span>
                      <div>
                        <p className="font-medium">{selectedConnection.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {selectedConnection.host}:{selectedConnection.port}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedConnection(null)}>
                      Change
                    </Button>
                  </div>

                  {/* Available Tables */}
                  {tables.length > 0 && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Table className="h-4 w-4" />
                        Available Tables
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {tables.map((table) => (
                          <Badge 
                            key={table} 
                            variant="outline"
                            className="cursor-pointer hover:bg-primary/10"
                            onClick={() => setSelectedTable(table)}
                          >
                            {table}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Natural Language Query */}
                  <div className="space-y-3">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Ask a question about your data
                    </Label>
                    <Textarea
                      placeholder="e.g., Show me the top 10 customers by total revenue"
                      value={naturalQuery}
                      onChange={(e) => setNaturalQuery(e.target.value)}
                      className="min-h-[80px]"
                    />
                    <Button onClick={handleGenerateSQL} disabled={isGenerating}>
                      {isGenerating ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      {selectedConnection?.db_type === 'mongodb' ? 'Generate Query' : 'Generate SQL'}
                    </Button>
                  </div>

                  {/* Generated SQL */}
                  {generatedSQL && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>{selectedConnection?.db_type === 'mongodb' ? 'Generated Query' : 'Generated SQL'}</Label>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(generatedSQL)}
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <div className="relative">
                        <pre className="p-4 bg-muted/50 rounded-lg overflow-x-auto text-sm font-mono">
                          {generatedSQL}
                        </pre>
                      </div>
                      {sqlExplanation && (
                        <p className="text-sm text-muted-foreground italic">
                          {sqlExplanation}
                        </p>
                      )}
                      <div className="flex gap-3">
                        <Button onClick={handleExecuteQuery} disabled={isLoading}>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4 mr-2" />
                          )}
                          Execute Query
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setGeneratedSQL('');
                            setSqlExplanation('');
                            setNaturalQuery('');
                          }}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Clear
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Query Results Preview */}
                  {queryResults && queryResults.length > 0 && (
                    <div className="space-y-3">
                      <Label>Results ({queryResults.length} rows)</Label>
                      <ScrollArea className="h-[300px] border rounded-lg">
                        <div className="p-4">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b">
                                {Object.keys(queryResults[0]).map((key) => (
                                  <th key={key} className="text-left p-2 font-medium">
                                    {key}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {queryResults.slice(0, 100).map((row, i) => (
                                <tr key={i} className="border-b border-border/50">
                                  {Object.values(row).map((val, j) => (
                                    <td key={j} className="p-2">
                                      {String(val)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default DatabaseConnector;
