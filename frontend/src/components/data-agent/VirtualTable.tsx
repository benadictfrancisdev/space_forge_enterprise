import { useRef, useMemo, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import MobileCardView from "./MobileCardView";

interface VirtualTableProps {
  data: Record<string, unknown>[];
  columns: string[];
  height?: number;
  rowHeight?: number;
  className?: string;
  primaryColumn?: string;
}

const VirtualTableRow = memo(({ 
  row, 
  columns, 
  style,
  isEven 
}: { 
  row: Record<string, unknown>; 
  columns: string[];
  style: React.CSSProperties;
  isEven: boolean;
}) => (
  <div 
    className={cn(
      "flex border-b border-border/30 hover:bg-muted/30 transition-colors",
      isEven ? "bg-card/30" : "bg-card/10"
    )}
    style={style}
  >
    {columns.map((col) => (
      <div 
        key={col}
        className="flex-1 px-4 py-2 min-w-[120px] max-w-[200px] truncate text-sm"
        title={String(row[col] ?? '')}
      >
        {String(row[col] ?? '-')}
      </div>
    ))}
  </div>
));

VirtualTableRow.displayName = 'VirtualTableRow';

const VirtualTable = ({ 
  data, 
  columns, 
  height = 500,
  rowHeight = 40,
  className,
  primaryColumn
}: VirtualTableProps) => {
  const isMobile = useIsMobile();
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => rowHeight,
    overscan: 10,
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  const columnWidth = useMemo(() => {
    return Math.max(120, Math.min(200, 100 / columns.length));
  }, [columns.length]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data to display
      </div>
    );
  }

  // Use card view on mobile for better UX
  if (isMobile) {
    return (
      <div className={cn("bg-card/50 rounded-xl border border-border/50 p-3", className)}>
        <MobileCardView
          data={data}
          columns={columns}
          primaryColumn={primaryColumn}
          maxVisible={30}
        />
      </div>
    );
  }

  return (
    <div className={cn("bg-card/50 rounded-xl border border-border/50 overflow-hidden", className)}>
      {/* Performance indicator */}
      {data.length >= 10000 && (
        <div className="px-4 py-2 bg-primary/10 border-b border-primary/20">
          <span className="text-xs text-primary font-medium">
            ⚡ Virtual scrolling enabled for {data.length.toLocaleString()} rows
          </span>
        </div>
      )}
      
      {/* Sticky Header */}
      <div 
        className="flex border-b border-border/50 bg-muted/50 sticky top-0 z-10"
        style={{ minWidth: columns.length * columnWidth }}
      >
        {columns.map((col) => (
          <div 
            key={col}
            className="flex-1 px-4 py-3 min-w-[120px] max-w-[200px] font-semibold text-sm text-foreground"
          >
            {col}
          </div>
        ))}
      </div>

      {/* Virtual Scrollable Body */}
      <div
        ref={parentRef}
        className="overflow-auto scrollbar-thin"
        style={{ height, contain: 'strict' }}
      >
        <div
          style={{
            height: rowVirtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
            minWidth: columns.length * columnWidth,
          }}
        >
          {virtualItems.map((virtualRow) => {
            const row = data[virtualRow.index];
            return (
              <VirtualTableRow
                key={virtualRow.key}
                row={row}
                columns={columns}
                isEven={virtualRow.index % 2 === 0}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Footer with row count */}
      <div className="px-4 py-3 border-t border-border/30 bg-muted/20 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {data.length.toLocaleString()} total rows • {columns.length} columns
        </span>
        <span className="text-xs text-muted-foreground">
          Scroll to view all data
        </span>
      </div>
    </div>
  );
};

export default VirtualTable;
