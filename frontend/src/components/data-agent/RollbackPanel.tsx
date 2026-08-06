import { memo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Undo2,
  Redo2,
  Camera,
  Trash2,
  History,
  RotateCcw,
  Clock,
  Database,
  LayoutDashboard,
  FileSpreadsheet,
  AlertCircle,
  Download,
} from "lucide-react";
import type { Snapshot, RollbackAction } from "@/hooks/useRollback";

interface RollbackPanelProps {
  history: RollbackAction[];
  redoStack: RollbackAction[];
  snapshots: Snapshot[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCreateSnapshot: () => void;
  onRestoreSnapshot: (id: string) => void;
  onDeleteSnapshot: (id: string) => void;
  onClearHistory: () => void;
}

const categoryIcon = (cat: string) => {
  switch (cat) {
    case "data": return <FileSpreadsheet className="h-3.5 w-3.5" />;
    case "dashboard": return <LayoutDashboard className="h-3.5 w-3.5" />;
    case "dataset": return <Database className="h-3.5 w-3.5" />;
    default: return <History className="h-3.5 w-3.5" />;
  }
};

const categoryColor = (cat: string) => {
  switch (cat) {
    case "data": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    case "dashboard": return "bg-purple-500/10 text-purple-500 border-purple-500/20";
    case "dataset": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const formatTime = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return date.toLocaleDateString();
};

const RollbackPanel = ({
  history,
  redoStack,
  snapshots,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onClearHistory,
}: RollbackPanelProps) => {
  return (
    <div className="space-y-6">
      {/* Header with quick actions */}
      <Card className="bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border-primary/30">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <RotateCcw className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Rollback & Recovery</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Undo changes, save snapshots, restore previous states
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onUndo} disabled={!canUndo} className="gap-1.5">
                <Undo2 className="h-4 w-4" /> Undo
              </Button>
              <Button variant="outline" size="sm" onClick={onRedo} disabled={!canRedo} className="gap-1.5">
                <Redo2 className="h-4 w-4" /> Redo
              </Button>
              <Button variant="default" size="sm" onClick={onCreateSnapshot} className="gap-1.5">
                <Camera className="h-4 w-4" /> Snapshot
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Actions</span>
            </div>
            <p className="text-2xl font-bold mt-1">{history.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Redo2 className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Redoable</span>
            </div>
            <p className="text-2xl font-bold mt-1">{redoStack.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Snapshots</span>
            </div>
            <p className="text-2xl font-bold mt-1">{snapshots.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="history">
        <TabsList className="w-full justify-start bg-card/80 p-1">
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" /> History
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="gap-1.5">
            <Camera className="h-4 w-4" /> Snapshots
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {history.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No actions yet</p>
                  <p className="text-sm mt-1">Changes you make will appear here for undo/redo</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-end mb-3">
                    <Button variant="ghost" size="sm" onClick={onClearHistory} className="gap-1.5 text-destructive hover:text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Clear All
                    </Button>
                  </div>
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-2">
                      {[...history].reverse().map((action, i) => (
                        <div key={action.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Badge variant="outline" className={`shrink-0 gap-1 ${categoryColor(action.category)}`}>
                              {categoryIcon(action.category)}
                              {action.category}
                            </Badge>
                            <span className="text-sm truncate">{action.label}</span>
                          </div>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {formatTime(action.timestamp)}
                          </span>
                          {i === 0 && (
                            <Button variant="ghost" size="sm" onClick={onUndo} className="shrink-0 h-7 px-2 text-xs">
                              <Undo2 className="h-3 w-3 mr-1" /> Undo
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              {snapshots.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Camera className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No snapshots saved</p>
                  <p className="text-sm mt-1">Click "Snapshot" to save current state for later recovery</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {[...snapshots].reverse().map((snap) => (
                      <div key={snap.id} className="p-4 rounded-lg border border-border bg-card/50 hover:bg-card transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className={`gap-1 ${categoryColor(snap.category)}`}>
                                {categoryIcon(snap.category)}
                                {snap.category}
                              </Badge>
                              <span className="font-medium text-sm truncate">{snap.label}</span>
                            </div>
                            {snap.description && (
                              <p className="text-xs text-muted-foreground mt-1">{snap.description}</p>
                            )}
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {snap.timestamp.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onRestoreSnapshot(snap.id)}
                              className="h-7 px-2 gap-1 text-xs"
                            >
                              <Download className="h-3 w-3" /> Restore
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteSnapshot(snap.id)}
                              className="h-7 px-2 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default memo(RollbackPanel);
