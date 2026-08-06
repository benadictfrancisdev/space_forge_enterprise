import { useState } from "react";
import { Shield, ShieldCheck, Eye, EyeOff, Lock, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { getPrivacyMode, setPrivacyMode, getPrivacyStatus } from "@/services/api";
import { cn } from "@/lib/utils";

interface PrivacyShieldProps {
  compact?: boolean;
}

const PrivacyShield = ({ compact = false }: PrivacyShieldProps) => {
  const [expanded, setExpanded] = useState(false);
  const [privacyEnabled, setPrivacyEnabled] = useState(getPrivacyMode());

  const handleToggle = (enabled: boolean) => {
    setPrivacyMode(enabled);
    setPrivacyEnabled(enabled);
  };

  const status = getPrivacyStatus();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/20 cursor-default">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span className="text-[10px] font-medium text-emerald-500">Privacy ON</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[260px] text-xs">
            <p className="font-medium mb-1">🛡️ Data Privacy Shield Active</p>
            <p className="text-muted-foreground">Your raw data never leaves your browser. Only anonymized statistical summaries are processed by AI.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card className={cn(
      "border transition-all",
      privacyEnabled
        ? "border-emerald-500/20 bg-emerald-500/5"
        : "border-destructive/20 bg-destructive/5"
    )}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {privacyEnabled
              ? <ShieldCheck className="w-4 h-4 text-emerald-500" />
              : <Shield className="w-4 h-4 text-destructive" />
            }
            <div>
              <p className="text-xs font-medium text-foreground">
                Data Privacy Shield
              </p>
              <p className="text-[10px] text-muted-foreground">
                {privacyEnabled
                  ? "Raw data stays in your browser"
                  : "Privacy protection disabled"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setExpanded(!expanded)}
            >
              <Info className="w-3 h-3" />
            </Button>
            <Switch
              checked={privacyEnabled}
              onCheckedChange={handleToggle}
            />
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-2 text-[11px]">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", status.piiScannerActive ? "bg-emerald-500" : "bg-muted")} />
                <span className="text-muted-foreground">PII Scanner</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", status.tokenizerActive ? "bg-emerald-500" : "bg-muted")} />
                <span className="text-muted-foreground">Data Tokenizer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", status.summarizerActive ? "bg-emerald-500" : "bg-muted")} />
                <span className="text-muted-foreground">Stat Summarizer</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", !status.rawDataSentToAI ? "bg-emerald-500" : "bg-destructive")} />
                <span className="text-muted-foreground">Zero Raw Data to AI</span>
              </div>
            </div>

            <div className="pt-2 border-t border-border space-y-1.5">
              <p className="font-medium text-foreground flex items-center gap-1">
                <Lock className="w-3 h-3" /> How it works
              </p>
              <div className="space-y-1 text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <Eye className="w-3 h-3 flex-shrink-0" />
                  PII detected → emails, phones, IDs auto-masked
                </p>
                <p className="flex items-center gap-1.5">
                  <EyeOff className="w-3 h-3 flex-shrink-0" />
                  Sensitive values replaced with random tokens
                </p>
                <p className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 flex-shrink-0" />
                  Only statistics (min/max/mean) sent to AI
                </p>
                <p className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                  AI insights re-mapped locally in your browser
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PrivacyShield;
