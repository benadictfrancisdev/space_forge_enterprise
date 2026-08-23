import type { ReactNode } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";

type NavItem = {
  label: string;
  to: string;
  end?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Rule Editor", to: "/v2", end: true },
  { label: "Incidents", to: "/v2/incidents" },
  { label: "Metrics", to: "/v2/metrics" },
  { label: "Casual Mode", to: "/v2/casual" },
];

type AppLayoutProps = {
  children: ReactNode;
};

function getSectionTitle(pathname: string): string {
  if (pathname.startsWith("/v2/casual")) return "Casual Mode";
  if (pathname.startsWith("/v2/incidents")) return "Incidents";
  if (pathname.startsWith("/v2/metrics")) return "Metrics";
  return "Rule Editor";
}

export function AppLayout({ children }: AppLayoutProps) {
  const { pathname } = useLocation();
  const sectionTitle = getSectionTitle(pathname);

  return (
    <div
      data-v2-shell
      className="isolate flex h-screen w-screen bg-v2-background text-text-main"
    >
      <aside className="flex w-64 shrink-0 flex-col border-r border-v2-border bg-surface">
        <div className="border-b border-v2-border px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md border border-v2-primary bg-v2-background" />
            <span className="font-mono text-xs font-semibold tracking-[0.28em] text-text-main">
              SPACEFORGE
            </span>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 p-4">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "rounded-md px-4 py-2 text-left text-sm transition-colors",
                  isActive
                    ? "border-l-[3px] border-v2-primary pl-[13px] text-text-main"
                    : "border-l-[3px] border-transparent pl-[13px] text-text-muted hover:text-text-main",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-v2-border bg-surface px-6">
          <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
            <span>Platform</span>
            <span>/</span>
            <span className="text-text-main">{sectionTitle}</span>
          </div>

          <div
            className="flex h-8 w-8 items-center justify-center rounded-md border border-v2-border bg-v2-background text-xs font-medium text-text-main"
            aria-label="User profile"
          >
            SF
          </div>
        </header>

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
