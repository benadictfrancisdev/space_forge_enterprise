import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Heart, Copy, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import upiQrCode from "@/assets/upi-qr-code.jpeg";

interface DonateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DonateModal = ({ open, onOpenChange }: DonateModalProps) => {
  const [copied, setCopied] = useState(false);
  
  const upiId = "francisbenadict81@okicici";
  
  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    toast.success("UPI ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-card via-card to-pink-500/5 border-pink-500/20">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <div className="p-2 rounded-full bg-gradient-to-r from-pink-500 to-rose-500">
              <Heart className="h-5 w-5 text-white" />
            </div>
            Support Our Project
          </DialogTitle>
          <DialogDescription className="text-base">
            Love using SpaceForge? Your support helps us build amazing features and keep the service running!
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-5 py-4">
          {/* Alpha Badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-primary/20 to-cyan-500/20 border border-primary/30">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Alpha Testing Version</span>
          </div>

          {/* UPI QR Code */}
          <div className="relative p-3 bg-white rounded-2xl shadow-xl shadow-pink-500/10">
            <img 
              src={upiQrCode} 
              alt="UPI QR Code - Scan to donate" 
              className="w-56 h-56 object-contain rounded-lg"
              loading="lazy"
            />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center shadow-lg">
              <Heart className="h-5 w-5 text-white animate-pulse" />
            </div>
          </div>
          
          <div className="text-center space-y-3 w-full">
            <p className="text-sm font-medium text-muted-foreground">Scan QR or use UPI ID</p>
            <div className="flex items-center gap-2 bg-muted/50 px-4 py-3 rounded-xl border border-border/50 mx-auto max-w-xs">
              <code className="text-sm font-mono flex-1 text-foreground">{upiId}</code>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 shrink-0 hover:bg-pink-500/10"
                onClick={copyUpiId}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
            Every contribution, big or small, helps us improve SpaceForge and bring more powerful analytics features to you. Thank you! 💜
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DonateModal;
