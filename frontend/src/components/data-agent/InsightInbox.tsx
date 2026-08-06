import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, MessageCircle, Mail, Send, Clock, Zap, CheckCircle2, AlertTriangle, TrendingUp, Sparkles } from "lucide-react";
import { backend } from "@/platform";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface InsightInboxProps {
  datasetName?: string;
}

interface InsightPreview {
  type: "anomaly" | "kpi_drift" | "opportunity" | "risk";
  title: string;
  summary: string;
  urgency: "high" | "medium" | "low";
}

const SAMPLE_INSIGHTS: InsightPreview[] = [
  { type: "anomaly", title: "Revenue spike detected", summary: "Revenue jumped 34% above the 30-day average on March 9. Primary driver: Category 'Electronics' (+â‚¹2.4L).", urgency: "high" },
  { type: "kpi_drift", title: "Customer retention declining", summary: "30-day retention rate dropped from 68% to 59% over the past 2 weeks. Cohort 'New Users' most affected.", urgency: "high" },
  { type: "opportunity", title: "Untapped segment found", summary: "Users from Tier-2 cities show 2.1x higher avg order value but represent only 8% of marketing spend.", urgency: "medium" },
];

const ICON_MAP = {
  anomaly: <AlertTriangle className="w-4 h-4" />,
  kpi_drift: <TrendingUp className="w-4 h-4" />,
  opportunity: <Sparkles className="w-4 h-4" />,
  risk: <AlertTriangle className="w-4 h-4" />,
};

const URGENCY_COLORS = {
  high: "text-destructive bg-destructive/10",
  medium: "text-yellow-600 bg-yellow-500/10",
  low: "text-muted-foreground bg-muted",
};

const InsightInbox = ({ datasetName }: InsightInboxProps) => {
  const { user } = useAuth();
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [email, setEmail] = useState("");
  const [deliveryChannel, setDeliveryChannel] = useState<"whatsapp" | "email" | "both">("whatsapp");
  const [scheduleTime, setScheduleTime] = useState("08:00");
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const handleSavePreferences = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (deliveryChannel !== "email" && !whatsappNumber) {
      toast.error("Please enter your WhatsApp number");
      return;
    }
    if (deliveryChannel !== "whatsapp" && !email) {
      toast.error("Please enter your email");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await backend.from("user_session_state").upsert({
        user_id: user.id,
        state_key: "insight_inbox_config",
        state_value: {
          whatsappNumber,
          email,
          deliveryChannel,
          scheduleTime,
          isEnabled,
          datasetName,
        } as any,
      }, { onConflict: "user_id,state_key" });

      if (error) throw error;
      toast.success("Insight Inbox preferences saved!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestInsight = async () => {
    if (!user) {
      toast.error("Please sign in first");
      return;
    }
    if (deliveryChannel !== "email" && !whatsappNumber) {
      toast.error("Please enter your WhatsApp number first");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await backend.functions.invoke('send-whatsapp-insight', {
        body: {
          action: 'send_test',
          whatsappNumber: deliveryChannel !== "email" ? whatsappNumber : undefined,
          email: deliveryChannel !== "whatsapp" ? email : undefined,
          datasetName: datasetName || 'Sample Dataset',
          insights: SAMPLE_INSIGHTS.map(i => ({
            title: i.title,
            summary: i.summary,
            urgency: i.urgency,
          })),
        }
      });

      if (error) throw new Error(error.message);

      if (data?.whatsapp?.requires_setup) {
        toast.error("WhatsApp not configured yet. Please connect Twilio to enable WhatsApp delivery.", { duration: 5000 });
      } else if (data?.whatsapp?.success) {
        toast.success("âœ… Test insight sent to your WhatsApp!");
      } else if (data?.whatsapp?.error) {
        toast.error(`WhatsApp: ${data.whatsapp.error}`);
      } else {
        toast.success("Test insight processed! Check your " + (deliveryChannel === "email" ? "email" : "WhatsApp"));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send test insight");
    } finally {
      setIsSending(false);
    }
  };

  // Load saved config
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await backend
        .from("user_session_state")
        .select("state_value")
        .eq("user_id", user.id)
        .eq("state_key", "insight_inbox_config")
        .maybeSingle();
      if (data?.state_value) {
        const config = data.state_value as any;
        setWhatsappNumber(config.whatsappNumber || "");
        setEmail(config.email || "");
        setDeliveryChannel(config.deliveryChannel || "whatsapp");
        setScheduleTime(config.scheduleTime || "08:00");
        setIsEnabled(config.isEnabled || false);
      }
    })();
  }, [user]);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            Insight Inbox
            <Badge variant="secondary" className="text-[10px]">Proactive AI</Badge>
          </CardTitle>
          <CardDescription>
            Get your top 3 daily insights delivered via WhatsApp or email â€” before you even open SpaceForge.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delivery Channel */}
          <div className="space-y-2">
            <Label>Delivery Channel</Label>
            <Select value={deliveryChannel} onValueChange={(v: any) => setDeliveryChannel(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">ðŸ“± WhatsApp Only</SelectItem>
                <SelectItem value="email">ðŸ“§ Email Only</SelectItem>
                <SelectItem value="both">ðŸ“±+ðŸ“§ Both</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* WhatsApp */}
          {deliveryChannel !== "email" && (
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                placeholder="+91 98765 43210"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Include country code. Reply to messages to ask follow-up questions.</p>
            </div>
          )}

          {/* Email */}
          {deliveryChannel !== "whatsapp" && (
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {/* Schedule Time */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Daily Delivery Time (IST)
            </Label>
            <Input
              type="time"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
            />
          </div>

          {/* Enable Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div>
              <p className="text-sm font-medium">Enable Daily Insights</p>
              <p className="text-xs text-muted-foreground">Receive top 3 insights every day at {scheduleTime} IST</p>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleSavePreferences} disabled={isSaving} className="flex-1">
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
            <Button variant="outline" onClick={handleSendTestInsight} disabled={isSending}>
              <Send className="w-4 h-4 mr-1" />
              {isSending ? "Sending..." : "Test"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-500" />
            Insight Preview â€” What you'll receive
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* WhatsApp-style message preview */}
            <div className="bg-[hsl(var(--muted)/0.5)] rounded-xl p-4 space-y-3 border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold">SpaceForge AI</p>
                  <p className="text-[10px] text-muted-foreground">Daily Insight Digest â€¢ 8:00 AM</p>
                </div>
              </div>

              <p className="text-xs font-medium">ðŸ”” Good morning! Here are your top 3 insights for today:</p>

              {SAMPLE_INSIGHTS.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-background/60">
                  <div className={`mt-0.5 p-1 rounded ${URGENCY_COLORS[insight.urgency]}`}>
                    {ICON_MAP[insight.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold">{i + 1}. {insight.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{insight.summary}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">{insight.urgency}</Badge>
                </div>
              ))}

              <p className="text-[11px] text-muted-foreground italic">
                Reply "tell me more about #1" to start a conversation â†’
              </p>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <CheckCircle2 className="w-3 h-3 text-green-500" />
                <span>Delivered via {deliveryChannel === "both" ? "WhatsApp & Email" : deliveryChannel}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InsightInbox;
