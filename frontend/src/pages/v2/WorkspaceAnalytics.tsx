import AnalyticsShell from "@/components/analytics/AnalyticsShell";

/** Analytics hub content inside the unified workspace (no marketing Navbar). */
export default function WorkspaceAnalytics() {
  return (
    <div className="p-4 md:p-6 min-h-0">
      <AnalyticsShell />
    </div>
  );
}
