import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";

type Breadcrumb = { label: string; to?: string };

type WorkspacePageFrameProps = {
  title?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  children: ReactNode;
};

/** In-shell page chrome (title, breadcrumbs, actions) — no duplicate sidebar. */
export function WorkspacePageFrame({ title, breadcrumbs, actions, children }: WorkspacePageFrameProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {(breadcrumbs?.length || title || actions) && (
        <div className="shrink-0 border-b border-border px-4 py-4 md:px-6 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {breadcrumbs && breadcrumbs.length > 0 && (
              <nav className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-1">
                {breadcrumbs.map((b, i) => (
                  <span key={i} className="flex items-center gap-2">
                    {i > 0 && <span className="text-border">/</span>}
                    {b.to ? (
                      <NavLink to={b.to} className="hover:text-foreground transition-colors">
                        {b.label}
                      </NavLink>
                    ) : (
                      <span className="text-foreground">{b.label}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
            {title && <h1 className="text-xl font-semibold tracking-tight">{title}</h1>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 md:p-6">{children}</div>
    </div>
  );
}
