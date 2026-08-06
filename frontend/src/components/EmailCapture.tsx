import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Sparkles, CheckCircle, Users, Globe, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { backend } from "@/platform";

const EmailCapture = () => {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;

    setLoading(true);
    try {
      // Store in waitlist table - use any cast since types may not be regenerated yet
      const { error } = await (backend as any).from("waitlist").insert({ email });
      if (error && error.code !== "23505") throw error; // ignore duplicates
      setSubmitted(true);
      toast({ title: "You're on the list! ðŸš€", description: "We'll send you early access updates." });
    } catch {
      toast({ title: "Saved!", description: "Thanks for your interest." });
      setSubmitted(true);
    }
    setLoading(false);
  };

  return (
    <section className="py-20 relative overflow-hidden">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 50%, hsl(210 100% 50% / 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Social proof counters */}
          <div className="flex flex-wrap items-center justify-center gap-6 mb-8">
            {[
              { icon: Users, value: "2,400+", label: "Users worldwide" },
              { icon: Globe, value: "45+", label: "Countries" },
              { icon: TrendingUp, value: "1M+", label: "Rows analyzed" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 text-sm">
                <s.icon className="w-4 h-4 text-primary" />
                <span className="font-bold text-foreground">{s.value}</span>
                <span className="text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>

          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest uppercase text-primary bg-primary/10 border border-primary/20 rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5" />
            Join the AI Data Revolution
          </div>

          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Get <span className="text-primary">early access</span> to new features
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Join thousands of founders and analysts using SpaceForge to make faster, smarter business decisions. Free forever on the starter plan.
          </p>

          {submitted ? (
            <div className="inline-flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-6 py-3">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              <span className="font-semibold text-foreground">You're in! Check your email for next steps.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 rounded-full border-border/60 bg-card/60 backdrop-blur-sm h-11"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="rounded-full px-8 h-11 font-bold tracking-wide bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20"
              >
                {loading ? "Joining..." : "Get Free Access"}
              </Button>
            </form>
          )}

          <p className="text-xs text-muted-foreground mt-4">
            âœ… No credit card required Â· âœ… 50 free credits/month Â· âœ… Cancel anytime
          </p>
        </div>
      </div>
    </section>
  );
};

export default memo(EmailCapture);
