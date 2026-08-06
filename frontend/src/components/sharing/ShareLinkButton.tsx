import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, Twitter, Linkedin, MessageCircle, Mail, Copy, Check, Link2 } from "lucide-react";
import { toast } from "sonner";

interface ShareLinkButtonProps {
  title: string;
  text?: string;
  url?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg";
  label?: string;
  className?: string;
}

/**
 * Lightweight share-as-link control used on the Decision Feed,
 * Analytics views and other public surfaces. No backend; uses
 * native Web Share when available and falls back to a clean menu
 * (X / LinkedIn / WhatsApp / Email / Copy).
 */
export function ShareLinkButton({
  title,
  text,
  url,
  variant = "outline",
  size = "sm",
  label = "Share",
  className,
}: ShareLinkButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const message = text || `${title} — generated on SpaceForge`;
  const enc = encodeURIComponent;

  const links = {
    twitter: `https://twitter.com/intent/tweet?text=${enc(message)}&url=${enc(shareUrl)}&hashtags=SpaceForge,Analytics`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(shareUrl)}`,
    whatsapp: `https://wa.me/?text=${enc(`${message} ${shareUrl}`)}`,
    email: `mailto:?subject=${enc(title)}&body=${enc(`${message}\n\n${shareUrl}`)}`,
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy — long-press the link instead");
    }
  };

  const native = async () => {
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title, text: message, url: shareUrl });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`gap-1.5 rounded-full ${className || ""}`}
          onClick={async (e) => {
            // On mobile, prefer the system sheet. We still open the menu
            // for users who dismiss it.
            const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches;
            if (isMobile) {
              const ok = await native();
              if (ok) e.preventDefault();
            }
          }}
        >
          <Share2 className="w-3.5 h-3.5" />
          {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-xs flex items-center gap-1.5">
          <Link2 className="w-3 h-3" /> Share this link
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={links.twitter} target="_blank" rel="noopener noreferrer">
            <Twitter className="w-4 h-4 mr-2" /> Share on X
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.linkedin} target="_blank" rel="noopener noreferrer">
            <Linkedin className="w-4 h-4 mr-2" /> Share on LinkedIn
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="w-4 h-4 mr-2" /> Share on WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={links.email}>
            <Mail className="w-4 h-4 mr-2" /> Share via email
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={copy}>
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-primary" /> Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" /> Copy link
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ShareLinkButton;
