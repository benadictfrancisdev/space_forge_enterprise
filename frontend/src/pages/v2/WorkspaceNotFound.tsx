import { Link } from "react-router-dom";
import { WORKSPACE_BASE } from "@/config/workspaceNav";

export default function WorkspaceNotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <p className="text-xs font-mono uppercase tracking-wider text-muted-foreground">404</p>
        <h1 className="mt-2 text-xl font-semibold">This workspace view does not exist</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The path is not a SpaceForge workspace route. Return home or use the command palette to find a view.
        </p>
        <Link to={WORKSPACE_BASE} className="mt-4 inline-block text-sm underline underline-offset-4">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
