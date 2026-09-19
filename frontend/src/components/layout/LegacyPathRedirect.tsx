import { Navigate, useLocation } from "react-router-dom";
import { workspacePath } from "@/config/workspaceNav";

type LegacyPathRedirectProps = {
  fromPrefix: string;
  toSubpath: string;
};

/** Preserve subpaths when redirecting legacy routes into the unified workspace. */
export function LegacyPathRedirect({ fromPrefix, toSubpath }: LegacyPathRedirectProps) {
  const { pathname } = useLocation();
  const suffix = pathname.slice(fromPrefix.length);
  const base = toSubpath.endsWith("/") ? toSubpath.slice(0, -1) : toSubpath;
  const target = suffix ? workspacePath(`${base}${suffix}`) : workspacePath(base);
  return <Navigate to={target} replace />;
}
