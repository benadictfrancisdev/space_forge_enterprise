import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const Privacy = () => (
  <div className="min-h-screen bg-background relative">
    <SEO
      title="Privacy Policy — SpaceForge AI"
      description="How SpaceForge AI collects, processes, and protects your data. Client-side privacy pipeline, AES-256 encryption, and full transparency on data retention."
    />
    <SpaceBackground />
    <Navbar />
    <main className="relative z-10 pt-24 pb-16">
      <div className="container mx-auto px-6 max-w-3xl">
        <h1 className="text-4xl font-extrabold text-foreground mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: March 2026</p>

        <div className="space-y-6 text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data Collection</h2>
            <p>SpaceForge collects minimal personal data necessary to provide our services. This includes email addresses for authentication, usage analytics for service improvement, and uploaded datasets for analysis purposes.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data Processing</h2>
            <p>Your data is processed locally in your browser whenever possible. When server-side processing is required, all data is encrypted in transit and at rest using AES-256 encryption. We never sell or share your data with third parties.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Data Retention</h2>
            <p>Uploaded datasets are retained for the duration of your subscription. Upon account deletion, all associated data is permanently removed within 30 days.</p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Your Rights</h2>
            <p>You have the right to access, export, or delete your data at any time. Contact us at privacy@spaceforge.in for any data-related requests.</p>
          </section>
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Privacy;
