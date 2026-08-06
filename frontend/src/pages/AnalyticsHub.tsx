import AnalyticsShell from "@/components/analytics/AnalyticsShell";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const AnalyticsHub = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Analytics Hub | SpaceForge"
        description="Centralized analytics: KPIs, forecasts, anomalies, segments, and executive briefs — all on your active dataset."
        canonicalPath="/analytics"
      />
      <Navbar />
      <main className="flex-1">
        <AnalyticsShell />
      </main>
      <Footer />
    </div>
  );
};

export default AnalyticsHub;
