import { useState } from "react";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, Download, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { resolveShareFooterIdentity } from "@/components/sharing/shareBranding";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UniversalShareButtonProps {
  /** CSS selector for the element to capture. Defaults to [data-share-root] or main */
  targetSelector?: string;
  /** Label shown in PNG header */
  label?: string;
  /** Floating mode: positioned top-right (out of SpaceBot's way) */
  floating?: boolean;
  className?: string;
}

const INK = "#0a0a0a";
const BG = "#ffffff";

/**
 * Universal "Share as image" button.
 * Pinned top-right so it never overlaps the SpaceBot widget (bottom-right).
 * Works on any page automatically.
 */
export function UniversalShareButton({
  targetSelector,
  label,
  floating = true,
  className,
}: UniversalShareButtonProps) {
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();

  const resolveTarget = (): HTMLElement | null => {
    if (targetSelector) {
      const el = document.querySelector<HTMLElement>(targetSelector);
      if (el) return el;
    }
    return (
      document.querySelector<HTMLElement>("[data-share-root]") ||
      document.querySelector<HTMLElement>("main") ||
      document.body
    );
  };

  const resolveLabel = (): string => {
    if (label) return label;
    const h1 = document.querySelector<HTMLElement>("main h1, [data-share-root] h1");
    return h1?.innerText?.trim() || "SpaceForge Insight";
  };

  const capture = async (): Promise<Blob | null> => {
    const target = resolveTarget();
    if (!target) {
      toast.error("Nothing to capture");
      return null;
    }
    const isDark = document.documentElement.classList.contains("dark");
    const bgColor = isDark ? "#0a0a0a" : BG;

    const dataUrl = await toPng(target, {
      cacheBust: true,
      pixelRatio: 2,
      backgroundColor: bgColor,
      filter: (node) => {
        if (!(node instanceof HTMLElement)) return true;
        return !node.hasAttribute("data-share-skip");
      },
    });

    const baseImg = await loadImage(dataUrl);
    const HEADER = 112;
    const FOOTER = 88;
    const PAD = 40;
    const OUTER = 24;

    const canvas = document.createElement("canvas");
    canvas.width = baseImg.width + PAD * 2 + OUTER * 2;
    canvas.height = baseImg.height + HEADER + FOOTER + PAD + OUTER * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const ink = isDark ? "#ffffff" : INK;
    const paper = isDark ? "#000000" : BG;
    const subtle = isDark ? "rgba(255,255,255,0.55)" : "rgba(10,10,10,0.55)";
    const hairline = isDark ? "rgba(255,255,255,0.12)" : "rgba(10,10,10,0.10)";

    // Outer frame (inverse of paper) — gives a poster-like matte border
    ctx.fillStyle = ink;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Inner paper card
    const cardX = OUTER, cardY = OUTER;
    const cardW = canvas.width - OUTER * 2;
    const cardH = canvas.height - OUTER * 2;
    ctx.fillStyle = paper;
    roundedRectPath(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();

    // Faint diagonal monogram watermark
    ctx.save();
    ctx.translate(cardX + cardW - 140, cardY + 80);
    ctx.rotate(-Math.PI / 12);
    ctx.fillStyle = isDark ? "rgba(255,255,255,0.05)" : "rgba(10,10,10,0.04)";
    ctx.font = "900 220px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText("SF", 0, 0);
    ctx.restore();

    // Header: monogram + wordmark + eyebrow
    const hx = cardX + PAD;
    const hy = cardY + PAD;

    // monogram square
    const monoSize = 52;
    ctx.fillStyle = ink;
    roundedRectPath(ctx, hx, hy, monoSize, monoSize, 12);
    ctx.fill();
    ctx.fillStyle = paper;
    ctx.font = "800 24px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("S", hx + monoSize / 2, hy + monoSize / 2 + 1);
    ctx.textAlign = "left";

    // wordmark
    ctx.fillStyle = ink;
    ctx.font = "700 26px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("SpaceForge", hx + monoSize + 14, hy + 24);

    // eyebrow / tag
    ctx.fillStyle = subtle;
    ctx.font = "600 11px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    const eyebrow = "AI BUSINESS REPORTING · SHARED INSIGHT";
    ctx.fillText(eyebrow, hx + monoSize + 14, hy + 44);

    // right-aligned date pill
    const dateStr = new Date().toLocaleDateString(undefined, {
      year: "numeric", month: "short", day: "numeric",
    });
    ctx.font = "600 12px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    const pillW = ctx.measureText(dateStr).width + 24;
    const pillH = 28;
    const pillX = cardX + cardW - PAD - pillW;
    const pillY = hy + (monoSize - pillH) / 2;
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 1;
    roundedRectPath(ctx, pillX, pillY, pillW, pillH, 999);
    ctx.stroke();
    ctx.fillStyle = ink;
    ctx.textBaseline = "middle";
    ctx.fillText(dateStr, pillX + 12, pillY + pillH / 2 + 1);

    // Title (page label) under header
    const titleY = hy + monoSize + 24;
    ctx.fillStyle = ink;
    ctx.font = "700 22px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(resolveLabel().slice(0, 90), hx, titleY);

    // hairline divider
    ctx.strokeStyle = hairline;
    ctx.beginPath();
    ctx.moveTo(hx, titleY + 14);
    ctx.lineTo(cardX + cardW - PAD, titleY + 14);
    ctx.stroke();

    // Image area — rounded, with subtle border
    const imgY = cardY + HEADER + 16;
    const imgX = cardX + PAD;
    ctx.save();
    roundedRectPath(ctx, imgX, imgY, baseImg.width, baseImg.height, 14);
    ctx.clip();
    ctx.drawImage(baseImg, imgX, imgY);
    ctx.restore();
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 1;
    roundedRectPath(ctx, imgX, imgY, baseImg.width, baseImg.height, 14);
    ctx.stroke();

    // Footer
    const footerTop = imgY + baseImg.height + 28;
    ctx.strokeStyle = hairline;
    ctx.beginPath();
    ctx.moveTo(hx, footerTop);
    ctx.lineTo(cardX + cardW - PAD, footerTop);
    ctx.stroke();

    const fy = footerTop + 30;
    ctx.fillStyle = subtle;
    ctx.font = "500 13px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.fillText("Generated in 60s from a spreadsheet", hx, fy);

    ctx.fillStyle = ink;
    ctx.font = "700 14px -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(resolveShareFooterIdentity(user), cardX + cardW - PAD, fy);

    // tiny corner registration marks (poster detail)
    const mark = 10;
    ctx.strokeStyle = hairline;
    ctx.lineWidth = 1;
    [[cardX + 14, cardY + 14, 1, 1], [cardX + cardW - 14, cardY + 14, -1, 1],
     [cardX + 14, cardY + cardH - 14, 1, -1], [cardX + cardW - 14, cardY + cardH - 14, -1, -1]]
      .forEach(([x, y, dx, dy]) => {
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x + mark * dx, y);
        ctx.moveTo(x, y); ctx.lineTo(x, y + mark * dy);
        ctx.stroke();
      });

    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  };

  const handleDownload = async () => {
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `spaceforge-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Image downloaded");
    } catch (e) {
      console.error(e);
      toast.error("Could not export image");
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    setBusy(true);
    try {
      const blob = await capture();
      if (!blob) return;
      const file = new File([blob], "spaceforge.png", { type: "image/png" });
      const navAny = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
      if (navAny.canShare && navAny.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: resolveLabel(),
          text: `${resolveLabel()} — via SpaceForge`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `spaceforge-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast.success("Image downloaded");
      }
    } catch (e) {
      // user cancelled
    } finally {
      setBusy(false);
    }
  };

  const containerClass = floating
    ? "fixed top-20 right-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-background/95 backdrop-blur px-1.5 py-1 shadow-lg"
    : "inline-flex items-center gap-1.5";

  return (
    <div data-share-skip className={`${containerClass} ${className || ""}`}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            disabled={busy}
            className="h-8 px-3 rounded-full"
            variant="default"
          >
            {busy ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ImageIcon className="w-4 h-4" />
            )}
            <span className="ml-1.5 text-xs font-semibold">Share</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" data-share-skip>
          <DropdownMenuItem onClick={handleShare} disabled={busy}>
            <Share2 className="w-4 h-4 mr-2" /> Share as image
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDownload} disabled={busy}>
            <Download className="w-4 h-4 mr-2" /> Download PNG
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export default UniversalShareButton;
