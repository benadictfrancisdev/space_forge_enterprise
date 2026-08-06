import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";

interface MobileCardViewProps {
  data: Record<string, unknown>[];
  columns: string[];
  primaryColumn?: string;
  maxVisible?: number;
}

const MobileCardView = ({ 
  data, 
  columns, 
  primaryColumn,
  maxVisible = 50 
}: MobileCardViewProps) => {
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [visibleCount, setVisibleCount] = useState(maxVisible);

  const primary = primaryColumn || columns[0];
  const secondaryColumns = columns.filter(c => c !== primary).slice(0, 4);

  const toggleCard = (index: number) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const visibleData = data.slice(0, visibleCount);

  return (
    <div className="space-y-3">
      {/* Info bar */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          Showing {visibleData.length} of {data.length.toLocaleString()} records
        </span>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {visibleData.map((row, index) => {
          const isExpanded = expandedCards.has(index);
          const allColumns = columns.filter(c => c !== primary);

          return (
            <div
              key={index}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              {/* Card Header */}
              <button
                onClick={() => toggleCard(index)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0 pr-2">
                  <p className="font-medium text-sm truncate">
                    {String(row[primary] ?? '-')}
                  </p>
                  {!isExpanded && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {secondaryColumns.map(col => `${col}: ${String(row[col] ?? '-')}`).join(' • ')}
                    </p>
                  )}
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
                  {allColumns.map(col => (
                    <div key={col} className="flex justify-between items-start gap-2">
                      <span className="text-xs text-muted-foreground shrink-0">{col}</span>
                      <span className="text-xs text-foreground text-right break-words min-w-0">
                        {String(row[col] ?? '-')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Load More */}
      {visibleCount < data.length && (
        <button
          onClick={() => setVisibleCount(prev => Math.min(prev + maxVisible, data.length))}
          className="w-full py-3 text-sm text-primary font-medium hover:bg-primary/5 rounded-lg transition-colors"
        >
          Load more ({Math.min(maxVisible, data.length - visibleCount)} remaining)
        </button>
      )}
    </div>
  );
};

export default MobileCardView;
