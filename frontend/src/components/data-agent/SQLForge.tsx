import { lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Database, Layout, Users, Play, Loader2 } from "lucide-react";

// Lazy load sub-components
const SchemaGenerator = lazy(() => import("./sql/SchemaGenerator"));
const BehavioralTemplates = lazy(() => import("./sql/BehavioralTemplates"));
const QueryRunner = lazy(() => import("./sql/QueryRunner"));

interface SQLForgeProps {
  data: Record<string, unknown>[];
  columns: string[];
  columnTypes: Record<string, "numeric" | "categorical" | "date">;
  datasetName: string;
}

const TabSkeleton = () => (
  <div className="flex items-center justify-center py-20">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading...</span>
    </div>
  </div>
);

const SQLForge = ({ data, columns, columnTypes, datasetName }: SQLForgeProps) => {
  if (!data || data.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Database className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Data Loaded</h3>
          <p className="text-sm text-muted-foreground">
            Upload a dataset first to use SQL Forge tools
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-border bg-gradient-to-r from-primary/5 to-primary/10">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Database className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl">SQL Forge</CardTitle>
                <CardDescription className="text-sm">
                  Generate schemas, behavioral analytics queries, and run simulations
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                {data.length.toLocaleString()} rows
              </Badge>
              <Badge variant="outline" className="text-xs">
                {columns.length} columns
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="schema" className="w-full">
        <TabsList className="grid grid-cols-3 w-full max-w-lg">
          <TabsTrigger value="schema" className="flex items-center gap-2 text-xs sm:text-sm">
            <Layout className="w-4 h-4" />
            <span className="hidden sm:inline">Schema</span>
            <span className="sm:hidden">DDL</span>
          </TabsTrigger>
          <TabsTrigger value="templates" className="flex items-center gap-2 text-xs sm:text-sm">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Templates</span>
            <span className="sm:hidden">Tpl</span>
          </TabsTrigger>
          <TabsTrigger value="runner" className="flex items-center gap-2 text-xs sm:text-sm">
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Runner</span>
            <span className="sm:hidden">Run</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="schema" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <SchemaGenerator
                data={data}
                columns={columns}
                columnTypes={columnTypes}
                datasetName={datasetName}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="templates" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <BehavioralTemplates
                data={data}
                columns={columns}
                columnTypes={columnTypes}
                datasetName={datasetName}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="runner" className="m-0">
            <Suspense fallback={<TabSkeleton />}>
              <QueryRunner
                data={data}
                columns={columns}
                columnTypes={columnTypes}
                datasetName={datasetName}
              />
            </Suspense>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
};

export default SQLForge;
