import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "lucide-react";
import { MOBILE_DOMAIN_NAV, WORKSPACE_BASE, navItemMatches } from "@/config/workspaceNav";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";

export function WorkspaceMobileNav({ onMore }: { onMore: () => void }) {
  const { pathname } = useLocation();

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur safe-bottom"
      aria-label="Primary"
    >
      <div className="flex h-14">
        {MOBILE_DOMAIN_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={() =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground",
                navItemMatches(pathname, item) && "text-foreground"
              )
            }
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={onMore}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground"
        >
          <MoreHorizontal className="h-4 w-4" />
          More
        </button>
      </div>
    </nav>
  );
}

export function workspaceHomeHref() {
  return WORKSPACE_BASE;
}
