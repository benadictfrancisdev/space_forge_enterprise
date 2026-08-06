import { Skeleton } from "@/components/ui/skeleton";

interface ChartSkeletonProps {
  type?: 'bar' | 'line' | 'pie' | 'area';
  height?: number;
}

const ChartSkeleton = ({ type = 'bar', height = 300 }: ChartSkeletonProps) => {
  return (
    <div className="bg-card/50 rounded-xl border border-border/50 p-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      </div>
      
      {/* Chart Area */}
      <div 
        className="relative flex items-end justify-around gap-2"
        style={{ height }}
      >
        {type === 'bar' && (
          <>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton 
                  className="w-full rounded-t-md"
                  style={{ 
                    height: `${30 + Math.random() * 60}%`,
                    animationDelay: `${i * 100}ms`
                  }}
                />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </>
        )}
        
        {type === 'line' && (
          <div className="absolute inset-0 flex flex-col justify-between py-4">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 w-10 flex flex-col justify-between">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
            {/* Chart line placeholder */}
            <div className="ml-12 flex-1 flex items-center justify-center">
              <Skeleton className="w-full h-1 rounded-full" />
            </div>
            {/* X-axis labels */}
            <div className="ml-12 flex justify-between pt-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-3 w-12" />
              ))}
            </div>
          </div>
        )}
        
        {type === 'pie' && (
          <div className="flex items-center justify-center gap-8 w-full">
            <Skeleton className="w-48 h-48 rounded-full" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Skeleton className="w-3 h-3 rounded-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              ))}
            </div>
          </div>
        )}
        
        {type === 'area' && (
          <div className="absolute inset-0 flex items-end">
            <Skeleton className="w-full h-2/3 rounded-t-lg opacity-50" />
          </div>
        )}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-border/30">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartSkeleton;
