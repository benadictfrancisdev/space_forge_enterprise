import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Briefcase, LineChart, Code2 } from "lucide-react";

export type UserRole = "business" | "analyst" | "developer";
const STORAGE_KEY = "spaceforge-user-role";

const roles: { id: UserRole; label: string; tagline: string; icon: typeof Briefcase }[] = [
  { id: "business",  label: "Business User", tagline: "Recommendations, risks & growth opportunities", icon: Briefcase },
  { id: "analyst",   label: "Analyst",       tagline: "Forecasts, anomalies & contextual insights",    icon: LineChart },
  { id: "developer", label: "Developer",     tagline: "APIs, schema tools & advanced workflows",       icon: Code2 },
];

export const getStoredRole = (): UserRole | null =>
  (typeof window !== "undefined" ? (localStorage.getItem(STORAGE_KEY) as UserRole | null) : null);

const RoleOnboardingModal = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!getStoredRole()) setOpen(true);
  }, []);

  const choose = (role: UserRole) => {
    localStorage.setItem(STORAGE_KEY, role);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-2xl font-medium tracking-tight">What best describes you?</DialogTitle>
          <DialogDescription>We'll personalize SpaceForge to surface what matters most for your role.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2 mt-2">
          {roles.map(r => (
            <button
              key={r.id}
              onClick={() => choose(r.id)}
              className="w-full text-left flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/30 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <r.icon className="w-5 h-5 text-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{r.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{r.tagline}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleOnboardingModal;
