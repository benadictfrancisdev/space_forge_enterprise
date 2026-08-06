import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { OnboardingProvider } from "@/hooks/useOnboarding";
import { OnboardingOverlay } from "@/components/onboarding";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import { usePageTracking } from "@/hooks/usePageTracking";
import { UniversalShareButton } from "@/components/sharing/UniversalShareButton";

const SHARE_BUTTON_HIDDEN_PATHS = ["/auth", "/privacy", "/terms", "/data-agent", "/app", "/apps"];
const GlobalShareButton = () => {
  const { pathname } = useLocation();
  if (SHARE_BUTTON_HIDDEN_PATHS.some((p) => pathname.startsWith(p))) return null;
  return <UniversalShareButton floating />;
};

// Lazy load all pages for code splitting
const SpaceBotWidget  = lazy(() => import("@/components/SpaceBotWidget"));
const Index           = lazy(() => import("./pages/Index"));
const DataAgent       = lazy(() => import("./pages/DataAgent"));
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
const Dashboards      = lazy(() => import("./pages/Dashboards"));
const DecisionFeed    = lazy(() => import("./pages/DecisionFeed"));
const Leaderboard     = lazy(() => import("./pages/Leaderboard"));
const AnalyzeUseCase  = lazy(() => import("./pages/AnalyzeUseCase"));
const AnalyticsHub    = lazy(() => import("./pages/AnalyticsHub"));
const EventsDashboard = lazy(() => import("./features/events/pages/EventsDashboard"));
const EventsExplorer  = lazy(() => import("./features/events/pages/EventsExplorer"));
const EventDetails    = lazy(() => import("./features/events/pages/EventDetails"));
const EventSources    = lazy(() => import("./features/events/pages/EventSources"));
const EventMonitoring = lazy(() => import("./features/events/pages/EventMonitoring"));
const EventSearch     = lazy(() => import("./features/events/pages/EventSearch"));
const EventAnalytics  = lazy(() => import("./features/events/pages/EventAnalytics"));
const EventSettings   = lazy(() => import("./features/events/pages/EventSettings"));
const EnterpriseApps    = lazy(() => import("./pages/apps"));

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
                <ErrorBoundary name="OnboardingOverlay">
                  <OnboardingOverlay />
                </ErrorBoundary>
                <ErrorBoundary name="SpaceBotWidget">
                  <Suspense fallback={null}>
                    <SpaceBotWidget />
                  </Suspense>
                </ErrorBoundary>
                <ErrorBoundary name="GlobalShareButton">
                  <GlobalShareButton />
                </ErrorBoundary>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    <Route path="/"                element={<ErrorBoundary name="Home"><Index /></ErrorBoundary>} />
                    <Route path="/auth"            element={<ErrorBoundary name="Auth"><Auth /></ErrorBoundary>} />
                    <Route path="/data-agent"      element={<ErrorBoundary name="DataAgent"><DataAgent /></ErrorBoundary>} />
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
                    <Route path="/dashboards"      element={<ErrorBoundary name="Dashboards"><Dashboards /></ErrorBoundary>} />
                    <Route path="/decisions"       element={<ErrorBoundary name="DecisionFeed"><DecisionFeed /></ErrorBoundary>} />
                    <Route path="/analyze/:slug"   element={<ErrorBoundary name="AnalyzeUseCase"><AnalyzeUseCase /></ErrorBoundary>} />
                    <Route path="/analytics"       element={<ErrorBoundary name="AnalyticsHub"><AnalyticsHub /></ErrorBoundary>} />
                    <Route path="/analytics/:module" element={<ErrorBoundary name="AnalyticsHub"><AnalyticsHub /></ErrorBoundary>} />
                    <Route path="/apps/*"              element={<ErrorBoundary name="EnterpriseApps"><EnterpriseApps /></ErrorBoundary>} />
                    <Route path="/app/events"                    element={<ErrorBoundary name="EventsDashboard"><EventsDashboard /></ErrorBoundary>} />
                    <Route path="/app/events/explorer"           element={<ErrorBoundary name="EventsExplorer"><EventsExplorer /></ErrorBoundary>} />
                    <Route path="/app/events/explorer/:eventId"  element={<ErrorBoundary name="EventDetails"><EventDetails /></ErrorBoundary>} />
                    <Route path="/app/events/sources"            element={<ErrorBoundary name="EventSources"><EventSources /></ErrorBoundary>} />
                    <Route path="/app/events/monitoring"         element={<ErrorBoundary name="EventMonitoring"><EventMonitoring /></ErrorBoundary>} />
                    <Route path="/app/events/search"             element={<ErrorBoundary name="EventSearch"><EventSearch /></ErrorBoundary>} />
                    <Route path="/app/events/analytics"          element={<ErrorBoundary name="EventAnalytics"><EventAnalytics /></ErrorBoundary>} />
                    <Route path="/app/events/settings"           element={<ErrorBoundary name="EventSettings"><EventSettings /></ErrorBoundary>} />
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
