import { useEffect, useState, useRef } from "react";
import { useOnboarding } from "@/hooks/useOnboarding";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface TooltipPosition {
  top: number;
  left: number;
  arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

const OnboardingOverlay = () => {
  const { 
    state, 
    currentStepData, 
    nextStep, 
    prevStep, 
    skipOnboarding, 
    completeOnboarding,
    totalSteps 
  } = useOnboarding();
  
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Find and highlight target element
  useEffect(() => {
    if (!currentStepData?.target) {
      setTargetRect(null);
      setTooltipPosition(null);
      return;
    }

    const findTarget = () => {
      const target = document.querySelector(currentStepData.target!);
      if (target) {
        const rect = target.getBoundingClientRect();
        setTargetRect(rect);
        
        // Calculate tooltip position
        const tooltipWidth = 320;
        const tooltipHeight = 180;
        const padding = 16;
        
        let top = 0;
        let left = 0;
        let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';
        
        switch (currentStepData.position) {
          case 'bottom':
            top = rect.bottom + padding;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrowPosition = 'top';
            break;
          case 'top':
            top = rect.top - tooltipHeight - padding;
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            arrowPosition = 'bottom';
            break;
          case 'right':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.right + padding;
            arrowPosition = 'left';
            break;
          case 'left':
            top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
            left = rect.left - tooltipWidth - padding;
            arrowPosition = 'right';
            break;
        }
        
        // Ensure tooltip stays within viewport
        left = Math.max(padding, Math.min(left, window.innerWidth - tooltipWidth - padding));
        top = Math.max(padding, Math.min(top, window.innerHeight - tooltipHeight - padding));
        
        setTooltipPosition({ top, left, arrowPosition });
      }
    };

    findTarget();
    
    // Re-calculate on resize
    window.addEventListener('resize', findTarget);
    return () => window.removeEventListener('resize', findTarget);
  }, [currentStepData]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!state.isActive) return;
      
      if (e.key === 'Escape') {
        skipOnboarding();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        if (state.currentStep >= totalSteps - 1) {
          completeOnboarding();
        } else {
          nextStep();
        }
      } else if (e.key === 'ArrowLeft') {
        prevStep();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.isActive, state.currentStep, totalSteps, nextStep, prevStep, skipOnboarding, completeOnboarding]);

  if (!state.isActive || !currentStepData) {
    return null;
  }

  const isLastStep = state.currentStep >= totalSteps - 1;
  const isFirstStep = state.currentStep === 0;
  const isCenterStep = currentStepData.position === 'center';

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={skipOnboarding}
      />
      
      {/* Spotlight cutout for targeted element */}
      {targetRect && !isCenterStep && (
        <div
          className="absolute rounded-lg ring-4 ring-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.7)] transition-all duration-300"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      )}
      
      {/* Tooltip / Modal */}
      <div
        ref={tooltipRef}
        className={cn(
          "absolute bg-card border border-border rounded-xl shadow-2xl p-6 w-80 animate-fade-in",
          isCenterStep && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        )}
        style={!isCenterStep && tooltipPosition ? {
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        } : undefined}
      >
        {/* Arrow indicator */}
        {!isCenterStep && tooltipPosition && (
          <div
            className={cn(
              "absolute w-3 h-3 bg-card border-border rotate-45",
              tooltipPosition.arrowPosition === 'top' && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-t",
              tooltipPosition.arrowPosition === 'bottom' && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-r border-b",
              tooltipPosition.arrowPosition === 'left' && "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 border-l border-b",
              tooltipPosition.arrowPosition === 'right' && "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 border-r border-t"
            )}
          />
        )}
        
        {/* Close button */}
        <button
          onClick={skipOnboarding}
          className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Skip onboarding"
        >
          <X className="w-4 h-4" />
        </button>
        
        {/* Content */}
        <div className="mb-6">
          {isCenterStep && (
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
            </div>
          )}
          <h3 className="text-lg font-semibold text-foreground mb-2 pr-6">
            {currentStepData.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStepData.description}
          </p>
        </div>
        
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mb-4">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2 h-2 rounded-full transition-all",
                i === state.currentStep 
                  ? "bg-primary w-4" 
                  : i < state.currentStep 
                    ? "bg-primary/50" 
                    : "bg-muted"
              )}
            />
          ))}
        </div>
        
        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={skipOnboarding}
            className="text-muted-foreground"
          >
            Skip tour
          </Button>
          
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button
                variant="outline"
                size="sm"
                onClick={prevStep}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            )}
            
            <Button
              size="sm"
              onClick={isLastStep ? completeOnboarding : nextStep}
              className="min-w-[80px]"
            >
              {isLastStep ? (
                'Get Started'
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
