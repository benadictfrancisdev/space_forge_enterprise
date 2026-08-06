import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Terms = () => (
  <div className="min-h-screen bg-background relative">
    <SEO
      title="Terms of Service — SpaceForge AI"
      description="Terms of Service for SpaceForge AI, the AI-powered data analytics platform. Acceptance, user responsibilities, and service description."
    />
    <SpaceBackground />
    <Navbar />
    <main className="relative z-10 pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Acceptance of Terms</h2>
            <p>By accessing or using SpaceForge, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Service Description</h2>
            <p>SpaceForge provides AI-powered data analytics tools including data cleaning, visualization, forecasting, and natural language querying capabilities.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">User Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. You agree not to upload malicious content or use the service for illegal purposes.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Limitation of Liability</h2>
            <p>SpaceForge is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Terms;
