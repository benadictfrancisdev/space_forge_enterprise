import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import SpaceBackground from "@/components/SpaceBackground";
import SEO from "@/components/SEO";

const Features = lazy(() => import("@/components/Features"));
const PainPoints = lazy(() => import("@/components/PainPoints"));
const Integrations = lazy(() => import("@/components/Integrations"));
const CTASection = lazy(() => import("@/components/CTASection"));
const Footer = lazy(() => import("@/components/Footer"));
const ExitIntentPopup = lazy(() => import("@/components/ExitIntentPopup"));
const SocialProofStrip = lazy(() => import("@/components/SocialProofStrip"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEO
        title="SpaceForge — Your spreadsheet, answered in 60 seconds"
        description="Upload Excel or CSV — get an executive dashboard, the 5 insights that matter, and a shareable report. No analyst, no SQL, no setup."
      />
      <SpaceBackground />
      <Navbar />
      <main className="relative z-10">
        <Hero />
        <Suspense fallback={null}>
          <SocialProofStrip />
          <Features />
          <PainPoints />
          <Integrations />
          <CTASection />
        </Suspense>
      </main>
      <Suspense fallback={null}>
        <Footer />
        <ExitIntentPopup />
      </Suspense>
    </div>
  );
};

export default Index;
