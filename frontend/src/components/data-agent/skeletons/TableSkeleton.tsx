import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

const TableSkeleton = ({ rows = 8, columns = 6 }: TableSkeletonProps) => {
  return (
    <div className="bg-card/50 rounded-xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="border-b border-border/50 bg-muted/30">
        <div className="flex gap-4 p-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton 
              key={i} 
              className="h-4 flex-1"
              style={{ maxWidth: i === 0 ? '80px' : '150px' }}
            />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      <div className="divide-y divide-border/30">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton 
                key={colIndex}
                className="h-4 flex-1"
                style={{ 
                  maxWidth: colIndex === 0 ? '80px' : `${80 + Math.random() * 70}px`,
                  animationDelay: `${rowIndex * 50 + colIndex * 20}ms`
                }}
              />
            ))}
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-border/30 bg-muted/20">
        <Skeleton className="h-4 w-32 mx-auto" />
      </div>
    </div>
  );
};

export default TableSkeleton;
