import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Download, Share2, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { resolveShareFooterIdentity, resolveShareDomain } from "@/components/sharing/shareBranding";

interface InsightCardExportProps {
  title: string;
  insight: string;
  metric?: string;
  metricLabel?: string;
  source?: string;
  /** Icon-only compact mode for dense list rows */
  compact?: boolean;
  className?: string;
}

/**
 * Renders a branded, shareable PNG card for a single insight.
 * Hidden off-screen, rasterized on demand via html-to-image, then
 * downloaded or pushed to the native share sheet (mobile).
 * Drives in-product virality: every AI insight is one click away from a social post.
 */
export function InsightCardExport({
  title,
  insight,
  metric,
  metricLabel,
  source = "spaceforge.in",
  compact = false,
  className,
}: InsightCardExportProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const footerIdentity = resolveShareFooterIdentity(user, source);
  const footerDomain = resolveShareDomain(source);

  const rasterize = async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    const dataUrl = await toPng(cardRef.current, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: "#ffffff",
    });
    const res = await fetch(dataUrl);
    return res.blob();
  };

  const download = async () => {
    setBusy(true);
    try {
      const blob = await rasterize();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spaceforge-insight-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Insight card downloaded");
    } catch (e) {
      toast.error("Could not export image");
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await rasterize();
      if (!blob) return;
      const file = new File([blob], "spaceforge-insight.png", { type: "image/png" });
      const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title,
          text: `${insight} — via SpaceForge`,
        });
      } else {
        await download();
      }
    } catch (e) {
      // user cancelled or unsupported — fall back silently
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {compact ? (
        <Button
          size="icon"
          variant="ghost"
          className={`h-7 w-7 ${className || ""}`}
          onClick={share}
          disabled={busy}
          title="Share as image"
          aria-label="Share as image"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
        </Button>
      ) : (
        <div className={`flex items-center gap-2 ${className || ""}`}>
          <Button size="sm" variant="outline" onClick={share} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Share2 className="w-4 h-4 mr-1.5" />}
            Share as image
          </Button>
          <Button size="sm" variant="ghost" onClick={download} disabled={busy} aria-label="Download PNG">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Off-screen render target — 1200x630 (OG-card aspect) */}
      <div className="fixed -left-[9999px] top-0 pointer-events-none" aria-hidden>
        <div
          ref={cardRef}
          style={{
            width: 1200,
            height: 630,
            background:
              "linear-gradient(135deg, #fafbfc 0%, #f4f5fb 55%, #ece9ff 100%)",
            color: "#0a2540",
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
            padding: "64px 72px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* glow accent */}
          <div
            style={{
              position: "absolute",
              top: -160,
              right: -160,
              width: 480,
              height: 480,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(99,91,255,0.28), transparent 70%)",
              filter: "blur(20px)",
            }}
          />

          {/* header */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, zIndex: 1 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg, #635bff, #8b85ff)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 8px 24px rgba(99,91,255,0.35)",
              }}
            >
              <Sparkles color="white" size={22} />
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.3 }}>
              SpaceForge
            </div>
            <div
              style={{
                marginLeft: "auto",
                fontSize: 14,
                fontWeight: 600,
                color: "#635bff",
                background: "rgba(99,91,255,0.1)",
                padding: "6px 14px",
                borderRadius: 999,
              }}
            >
              AI Insight
            </div>
          </div>

          {/* body */}
          <div style={{ zIndex: 1, maxWidth: 980 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 600,
                color: "#635bff",
                marginBottom: 18,
                letterSpacing: -0.2,
              }}
            >
              {title}
            </div>
            {metric && (
              <div style={{ marginBottom: 24 }}>
                <div
                  style={{
                    fontSize: 84,
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: -2,
                    background: "linear-gradient(135deg, #0a2540, #635bff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {metric}
                </div>
                {metricLabel && (
                  <div style={{ fontSize: 20, color: "#425466", marginTop: 6 }}>
                    {metricLabel}
                  </div>
                )}
              </div>
            )}
            <div
              style={{
                fontSize: metric ? 30 : 44,
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: -0.6,
                color: "#0a2540",
              }}
            >
              {insight}
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              zIndex: 1,
              fontSize: 16,
              color: "#425466",
              borderTop: "1px solid rgba(10,37,64,0.08)",
              paddingTop: 22,
            }}
          >
            <div>
              Generated in 60 seconds from a spreadsheet ·{" "}
              <span style={{ color: "#635bff", fontWeight: 600 }}>{footerDomain}</span>
            </div>
            <div style={{ fontWeight: 600, color: "#0a2540" }}>
              {footerIdentity}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InsightCardExport;
