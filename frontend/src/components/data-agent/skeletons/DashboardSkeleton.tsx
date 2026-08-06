import { Skeleton } from "@/components/ui/skeleton";
import ChartSkeleton from "./ChartSkeleton";

interface DashboardSkeletonProps {
  showKPIs?: boolean;
  kpiCount?: number;
  chartCount?: number;
}

const DashboardSkeleton = ({ 
  showKPIs = true, 
  kpiCount = 4,
  chartCount = 2 
}: DashboardSkeletonProps) => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* KPI Cards */}
      {showKPIs && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: kpiCount }).map((_, i) => (
            <div 
              key={i}
              className="bg-card/50 rounded-xl border border-border/50 p-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <Skeleton className="w-12 h-5 rounded-full" />
              </div>
              <Skeleton className="h-7 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      )}
      
      {/* Charts Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {Array.from({ length: chartCount }).map((_, i) => (
          <div 
            key={i}
            style={{ animationDelay: `${(kpiCount + i) * 100}ms` }}
          >
            <ChartSkeleton type={i % 2 === 0 ? 'bar' : 'line'} height={250} />
          </div>
        ))}
      </div>
      
      {/* Additional Chart */}
      <ChartSkeleton type="area" height={200} />
    </div>
  );
};

export default DashboardSkeleton;
