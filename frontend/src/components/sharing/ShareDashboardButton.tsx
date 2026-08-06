import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Share2, Copy, Check, Loader2, Lock, Globe, Link as LinkIcon } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface ShareDashboardButtonProps {
  title?: string;
  datasetName?: string;
  /** Snapshot of the dashboard to render in the public viewer */
  snapshot: Record<string, unknown> | object;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

const ShareDashboardButton = ({
  title: defaultTitle = "Shared Dashboard",
  datasetName,
  snapshot,
  variant = "outline",
  size = "sm",
  className,
}: ShareDashboardButtonProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState("");
  const [usePassword, setUsePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [expiry, setExpiry] = useState<string>("never");
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!user) {
      toast.error("Sign in to share dashboards");
      return;
    }
    if (usePassword && password.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      const expires_in_days = expiry === "never" ? null : Number(expiry);
      const { data, error } = await invokeEdgeFunction<{
        success: boolean;
        data?: { share_token: string };
        error?: string;
      }>("share-dashboard", {
        action: "create",
        title,
        description: description || null,
        dataset_name: datasetName || null,
        snapshot,
        password: usePassword ? password : null,
        expires_in_days,
      });

      if (error) throw error;
      if (!data?.success || !data.data?.share_token) {
        throw new Error(data?.error || "Failed to create share");
      }

      const url = `${window.location.origin}/shared/${data.data.share_token}`;
      setShareUrl(url);
      toast.success("Shareable link created");
    } catch (err) {
      console.error("[ShareDashboard] create failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to create share");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const reset = () => {
    setShareUrl(null);
    setCopied(false);
    setUsePassword(false);
    setPassword("");
    setDescription("");
    setExpiry("never");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <Share2 className="w-4 h-4 mr-1.5" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Share dashboard
          </DialogTitle>
          <DialogDescription>
            One-click public link. Optionally protect with a password or set an expiry.
          </DialogDescription>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="share-title" className="text-xs">Title</Label>
              <Input id="share-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="share-desc" className="text-xs">Description (optional)</Label>
              <Input id="share-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={240} placeholder="What this share contains…" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Password protect</p>
                  <p className="text-[11px] text-muted-foreground">Require a password to view</p>
                </div>
              </div>
              <Switch checked={usePassword} onCheckedChange={setUsePassword} />
            </div>

            {usePassword && (
              <div className="space-y-1.5">
                <Label htmlFor="share-pw" className="text-xs">Password</Label>
                <Input id="share-pw" type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 4 characters" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">Link expires</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="never">Never</SelectItem>
                  <SelectItem value="1">In 1 day</SelectItem>
                  <SelectItem value="7">In 7 days</SelectItem>
                  <SelectItem value="30">In 30 days</SelectItem>
                  <SelectItem value="90">In 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleCreate} disabled={loading} className="w-full">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating link…</> : <><LinkIcon className="w-4 h-4 mr-2" />Create shareable link</>}
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5">
              <div className="flex items-center gap-2 mb-2">
                {usePassword ? <Lock className="w-4 h-4 text-primary" /> : <Globe className="w-4 h-4 text-primary" />}
                <p className="text-xs font-medium text-foreground">
                  {usePassword ? "Password-protected link" : "Public link"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Input value={shareUrl} readOnly className="text-xs font-mono" />
                <Button size="icon" variant="outline" onClick={handleCopy}>
                  {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
              {usePassword && (
                <p className="text-[11px] text-muted-foreground mt-2">
                  Share this password separately: <span className="font-mono font-semibold">{password}</span>
                </p>
              )}
            </div>
            <Button variant="outline" className="w-full" onClick={() => { reset(); }}>
              Create another link
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareDashboardButton;
