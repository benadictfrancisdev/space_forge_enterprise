import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import {
  MOBILE_PRIMARY_NAV,
  MOBILE_SECONDARY_NAV,
  type NavItem,
} from "@/config/dataAgentNav";

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  hasData: boolean;
}

function NavButton({
  item,
  isActive,
  isDisabled,
  onSelect,
  variant = "bar",
}: {
  item: NavItem;
  isActive: boolean;
  isDisabled: boolean;
  onSelect: () => void;
  variant?: "bar" | "grid";
}) {
  const Icon = item.icon;
  return (
    <button
      onClick={() => !isDisabled && onSelect()}
      disabled={isDisabled}
      className={cn(
        variant === "bar"
          ? "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors"
          : "flex flex-col items-center justify-center p-3 rounded-lg transition-colors min-h-[72px]",
        isActive
          ? variant === "bar"
            ? "text-primary"
            : "bg-primary/10 text-primary"
          : variant === "bar"
            ? "text-muted-foreground"
            : "bg-muted/50 text-muted-foreground hover:bg-muted",
        isDisabled && "opacity-40 cursor-not-allowed"
      )}
    >
      <Icon className={cn("w-5 h-5", variant === "bar" ? "mb-0.5" : "mb-1.5")} />
      <span
        className={cn(
          "font-medium truncate",
          variant === "bar" ? "text-[10px]" : "text-xs text-center"
        )}
      >
        {item.label}
      </span>
    </button>
  );
}

const MobileBottomNav = ({ activeTab, onTabChange, hasData }: MobileBottomNavProps) => {
  const [moreOpen, setMoreOpen] = useState(false);

  const handleSecondarySelect = (value: string) => {
    onTabChange(value);
    setMoreOpen(false);
  };

  const secondaryActive = MOBILE_SECONDARY_NAV.some((i) => i.value === activeTab);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border md:hidden safe-bottom">
      <div className="flex items-center justify-around h-16 pb-[env(safe-area-inset-bottom,0px)]">
        {MOBILE_PRIMARY_NAV.map((item) => (
          <NavButton
            key={item.value}
            item={item}
            isActive={activeTab === item.value}
            isDisabled={!!item.requiresData && !hasData}
            onSelect={() => onTabChange(item.value)}
            variant="bar"
          />
        ))}

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-0 px-1 transition-colors",
                secondaryActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <MoreHorizontal className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-safe">
            <SheetHeader>
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4">
              {MOBILE_SECONDARY_NAV.map((item) => (
                <NavButton
                  key={item.value}
                  item={item}
                  isActive={activeTab === item.value}
                  isDisabled={!!item.requiresData && !hasData}
                  onSelect={() => handleSecondarySelect(item.value)}
                  variant="grid"
                />
              ))}
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <span className="text-sm text-muted-foreground">Theme</span>
              <ThemeToggle showLabel />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
