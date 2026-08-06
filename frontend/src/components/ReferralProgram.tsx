import { memo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Gift, Copy, CheckCircle, Share2, Twitter, Linkedin, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const ReferralProgram = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Generate a simple referral link using user id or a fallback
  const referralCode = user?.id?.slice(0, 8) || "SPACEFORGE";
  const referralLink = `https://spaceforge.in/auth?ref=${referralCode}`;

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast({ title: "Link copied! 📋", description: "Share it to earn free credits." });
    setTimeout(() => setCopied(false), 2000);
  }, [referralLink, toast]);

  const shareText = encodeURIComponent("I just found SpaceForge AI — upload any CSV and get instant business decisions in 10 seconds. Try it free 👇");
  const shareUrl = encodeURIComponent(referralLink);

  return (
    <section className="py-16 relative">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div
            className="rounded-2xl border border-primary/20 p-8 md:p-10 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, hsl(210 60% 12%) 0%, hsl(260 40% 14%) 100%)",
            }}
          >
            {/* Decorative glow */}
            <div
              className="absolute top-0 right-0 w-64 h-64 opacity-20 pointer-events-none"
              style={{ background: "radial-gradient(circle, hsl(210 100% 60%) 0%, transparent 70%)" }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Refer & Earn Free Credits</h3>
                  <p className="text-xs text-muted-foreground">Get 25 credits for every friend who signs up</p>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {[
                  { step: "1", title: "Share your link", desc: "Send to colleagues & friends" },
                  { step: "2", title: "They sign up free", desc: "No credit card needed" },
                  { step: "3", title: "Both earn credits", desc: "25 credits each, instantly" },
                ].map((s) => (
                  <div key={s.step} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {s.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{s.title}</p>
                      <p className="text-xs text-muted-foreground">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Referral link */}
              <div className="flex flex-col sm:flex-row gap-2 mb-5">
                <Input
                  readOnly
                  value={referralLink}
                  className="flex-1 rounded-full bg-background/40 border-border/50 text-sm font-mono"
                />
                <Button
                  onClick={handleCopy}
                  className="rounded-full px-6 gap-2 bg-primary text-primary-foreground"
                >
                  {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Copied!" : "Copy Link"}
                </Button>
              </div>

              {/* Social share buttons */}
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-semibold">Share via:</span>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-background/30 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-[#1DA1F2] hover:border-[#1DA1F2]/40 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-background/30 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-[#0A66C2] hover:border-[#0A66C2]/40 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
                <a
                  href={`https://api.whatsapp.com/send?text=${shareText}%20${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-9 h-9 rounded-lg bg-background/30 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-[#25D366] hover:border-[#25D366]/40 transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({ title: "SpaceForge AI", text: "Upload data, get instant decisions", url: referralLink });
                    } else {
                      handleCopy();
                    }
                  }}
                  className="w-9 h-9 rounded-lg bg-background/30 border border-border/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default memo(ReferralProgram);
