import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { UniversalShareButton } from "@/components/sharing/UniversalShareButton";
import { PlatformChrome } from "@/app/layout/PlatformChrome";
import { LegacyPathRedirect } from "@/components/layout/LegacyPathRedirect";
import V2Platform from "./pages/V2Platform";
import { DECISION_INTELLIGENCE_PATH, workspacePath } from "@/config/workspaceNav";

const SHARE_BUTTON_HIDDEN_PATHS = ["/auth", "/privacy", "/terms", "/data-agent", "/app", "/apps", "/v2"];
const GlobalShareButton = () => {
  const { pathname } = useLocation();
  if (SHARE_BUTTON_HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  return <UniversalShareButton floating />;
};

// Lazy load all pages for code splitting
const LandingPage     = lazy(() => import("@/features/marketing/components/LandingPage"));
const Auth            = lazy(() => import("./pages/Auth"));
const Pricing         = lazy(() => import("./pages/Pricing"));
const CognitiveLanding = lazy(() => import("./pages/CognitiveLanding"));
const PersonaReports  = lazy(() => import("./pages/PersonaReports"));
const About           = lazy(() => import("./pages/About"));
const Founder         = lazy(() => import("./pages/Founder"));
const Blog            = lazy(() => import("./pages/Blog"));
const BlogFounderAI   = lazy(() => import("./pages/BlogFounderAI"));
const Privacy         = lazy(() => import("./pages/Privacy"));
const Terms           = lazy(() => import("./pages/Terms"));
const Docs            = lazy(() => import("./pages/Docs"));
const NotFound        = lazy(() => import("./pages/NotFound"));
const SharedDashboard = lazy(() => import("./pages/SharedDashboard"));
const UseCases        = lazy(() => import("./pages/UseCases"));
const Compare         = lazy(() => import("./pages/Compare"));
const Leaderboard     = lazy(() => import("./pages/Leaderboard"));
const AnalyzeUseCase  = lazy(() => import("./pages/AnalyzeUseCase"));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
      <span className="text-sm text-muted-foreground">Loading…</span>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 1,
    },
  },
});

const PageTracker = () => { usePageTracking(); return null; };

const App = () => (
  <ErrorBoundary name="App">
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {/* BrowserRouter MUST wrap everything that uses useNavigate/useLocation */}
        <BrowserRouter>
          <PageTracker />
          <AuthProvider>
            <OnboardingProvider>
              <TooltipProvider>
                <Toaster />
                <Sonner />
                <PlatformChrome />
                <ErrorBoundary name="GlobalShareButton">
                  <GlobalShareButton />
                </ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <ErrorBoundary name="LandingPage">
                          <LandingPage />
                        </ErrorBoundary>
                      }
                    />
                    <Route
                      path="/v2/*"
                      element={
                        <ErrorBoundary name="V2Platform">
                          <V2Platform />
                        </ErrorBoundary>
                      }
                    />
                    <Route path="/auth"            element={<ErrorBoundary name="Auth"><Auth /></ErrorBoundary>} />
                    <Route path="/data-agent"      element={<LegacyPathRedirect fromPrefix="/data-agent" toSubpath="/data-agent" />} />
                    <Route path="/cognitive"       element={<ErrorBoundary name="Cognitive"><CognitiveLanding /></ErrorBoundary>} />
                    <Route path="/pricing"         element={<ErrorBoundary name="Pricing"><Pricing /></ErrorBoundary>} />
                    <Route path="/persona-reports" element={<ErrorBoundary name="PersonaReports"><PersonaReports /></ErrorBoundary>} />
                    <Route path="/about"           element={<ErrorBoundary name="About"><About /></ErrorBoundary>} />
                    <Route path="/founder"         element={<ErrorBoundary name="Founder"><Founder /></ErrorBoundary>} />
                    <Route path="/about/founder"   element={<ErrorBoundary name="Founder"><Founder /></ErrorBoundary>} />
                    <Route path="/blog"            element={<ErrorBoundary name="Blog"><Blog /></ErrorBoundary>} />
                    <Route path="/blog/benadict-francis-founder-building-ai-for-the-next-generation" element={<ErrorBoundary name="BlogFounderAI"><BlogFounderAI /></ErrorBoundary>} />
                    <Route path="/privacy"         element={<ErrorBoundary name="Privacy"><Privacy /></ErrorBoundary>} />
                    <Route path="/terms"           element={<ErrorBoundary name="Terms"><Terms /></ErrorBoundary>} />
                    <Route path="/docs"            element={<ErrorBoundary name="Docs"><Docs /></ErrorBoundary>} />
                    <Route path="/shared/:token"   element={<ErrorBoundary name="SharedDashboard"><SharedDashboard /></ErrorBoundary>} />
                    <Route path="/leaderboard"     element={<ErrorBoundary name="Leaderboard"><Leaderboard /></ErrorBoundary>} />
                    <Route path="/use-cases"       element={<ErrorBoundary name="UseCases"><UseCases /></ErrorBoundary>} />
                    <Route path="/compare"         element={<ErrorBoundary name="Compare"><Compare /></ErrorBoundary>} />
                    <Route path="/dashboards"      element={<Navigate to={workspacePath("/dashboards")} replace />} />
                    <Route path="/decisions"       element={<Navigate to={DECISION_INTELLIGENCE_PATH} replace />} />
                    <Route path="/analyze/:slug"   element={<ErrorBoundary name="AnalyzeUseCase"><AnalyzeUseCase /></ErrorBoundary>} />
                    <Route path="/analytics/*"     element={<LegacyPathRedirect fromPrefix="/analytics" toSubpath="/analytics" />} />
                    <Route path="/apps/*"              element={<LegacyPathRedirect fromPrefix="/apps" toSubpath="/apps" />} />
                    <Route path="/app/events/*"         element={<LegacyPathRedirect fromPrefix="/app/events" toSubpath="/events" />} />
                    <Route path="*"               element={<ErrorBoundary name="NotFound"><NotFound /></ErrorBoundary>} />
                  </Routes>
                </Suspense>
              </TooltipProvider>
            </OnboardingProvider>
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
