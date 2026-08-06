import { Component, type ReactNode, type ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary${this.props.name ? ` — ${this.props.name}` : ""}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-xl border border-destructive/30 bg-destructive/5 min-h-[200px]">
          <AlertTriangle className="w-10 h-10 text-destructive/60 mb-3" />
          <p className="text-sm font-semibold text-foreground mb-1">
            {this.props.name ? `${this.props.name} failed to load` : "Something went wrong"}
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-xs">
            {this.state.error?.message || "An unexpected error occurred"}
          </p>
          <Button size="sm" variant="outline" onClick={this.handleReset} className="gap-2">
            <RefreshCw className="w-3.5 h-3.5" /> Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
