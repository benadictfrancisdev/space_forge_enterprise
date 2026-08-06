import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Twitter, Linkedin, MessageCircle, Copy, Check, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface ViralShareActionsProps {
  title: string;
  headline?: string;
  url?: string;
  viewCount?: number;
}

/**
 * Social-share row + watermark CTA shown on every public /shared dashboard.
 * Drives the viral loop: viewers can re-share in 1 click and convert to signups.
 */
export function ViralShareActions({ title, headline, url, viewCount }: ViralShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState(url || "");

  useEffect(() => {
    if (!url && typeof window !== "undefined") setShareUrl(window.location.href);
  }, [url]);

  const text = headline
    ? `${headline} — see the full dashboard:`
    : `Check out this AI-generated business dashboard "${title}" on SpaceForge:`;

  const enc = encodeURIComponent;
  const links = {
    twitter: `https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(shareUrl)}&hashtags=SpaceForge,AI,Analytics`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${enc(`${text} ${shareUrl}`)}`,
  };

  const copy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast.success("Link copied");
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <Card className="linear-card border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background">
      <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-tight">Share this dashboard</p>
            <p className="text-[11px] text-muted-foreground">
              {typeof viewCount === "number" && viewCount > 0
                ? `${viewCount.toLocaleString()} view${viewCount === 1 ? "" : "s"} so far`
                : "Help others find these insights"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button asChild size="sm" variant="outline">
            <a href={links.twitter} target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter">
              <Twitter className="w-4 h-4" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={links.linkedin} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
              <Linkedin className="w-4 h-4" />
            </a>
          </Button>
          <Button asChild size="sm" variant="outline">
            <a href={links.whatsapp} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
              <MessageCircle className="w-4 h-4" />
            </a>
          </Button>
          <Button size="sm" variant="outline" onClick={copy} aria-label="Copy link">
            {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Conversion banner shown at the top + bottom of /shared dashboards.
 * Routes non-authed viewers into the product via the sample-data path.
 */
export function ViralConversionCTA({ variant = "top" }: { variant?: "top" | "bottom" }) {
  return (
    <Card className="linear-card border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent">
      <CardContent className={variant === "top" ? "p-4 sm:p-5" : "p-5 sm:p-6"}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm sm:text-base font-semibold leading-tight">
              {variant === "top"
                ? "Want a dashboard like this for your own data?"
                : "Turn your spreadsheet into an executive dashboard in 60 seconds"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload a CSV or try with sample data · Free forever plan · No credit card
            </p>
          </div>
          <Button asChild className="shrink-0" size={variant === "bottom" ? "lg" : "default"}>
            <Link to="/data-agent">
              {variant === "top" ? "Try free" : "Get my free dashboard"}
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ViralShareActions;
