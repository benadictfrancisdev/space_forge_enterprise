import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { History, RotateCcw, GitFork, Clock } from "lucide-react";
import { toast } from "sonner";
import type { DashboardTile } from "./DraggableTile";

export interface DashboardSnapshot {
  id: string;
  timestamp: Date;
  label: string;
  tiles: DashboardTile[];
  tileCount: number;
}

interface DashboardVersionHistoryProps {
  snapshots: DashboardSnapshot[];
  currentTiles: DashboardTile[];
  onRestore: (tiles: DashboardTile[]) => void;
  onFork: (label: string, tiles: DashboardTile[]) => void;
}

const DashboardVersionHistory = ({ snapshots, currentTiles, onRestore, onFork }: DashboardVersionHistoryProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [forkLabel, setForkLabel] = useState("");

  const handleRestore = (snapshot: DashboardSnapshot) => {
    onRestore(snapshot.tiles);
    setIsOpen(false);
    toast.success(`Restored "${snapshot.label}"`);
  };

  const handleFork = () => {
    if (!forkLabel.trim()) return;
    onFork(forkLabel.trim(), currentTiles);
    setForkLabel("");
    toast.success(`Forked as "${forkLabel}"`);
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 shrink-0 relative">
          <History className="h-4 w-4" />
          <span className="hidden sm:inline">History</span>
          {snapshots.length > 0 && (
            <Badge variant="secondary" className="text-[9px] h-4 px-1 absolute -top-1.5 -right-1.5">
              {snapshots.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Dashboard History
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-3">
          <Input
            placeholder="Fork name..."
            value={forkLabel}
            onChange={(e) => setForkLabel(e.target.value)}
            className="h-8 text-sm"
            onKeyDown={(e) => e.key === "Enter" && handleFork()}
          />
          <Button size="sm" onClick={handleFork} disabled={!forkLabel.trim()} className="gap-1 shrink-0">
            <GitFork className="h-3.5 w-3.5" />
            Fork
          </Button>
        </div>

        <ScrollArea className="max-h-[400px]">
          {snapshots.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No history yet. Generate or edit the dashboard to create snapshots.</p>
          ) : (
            <div className="space-y-2">
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="flex items-center gap-3 p-2 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                >
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{snap.label}</p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span>{formatTime(snap.timestamp)}</span>
                      <span>•</span>
                      <span>{snap.tileCount} tiles</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs gap-1"
                    onClick={() => handleRestore(snap)}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default DashboardVersionHistory;
