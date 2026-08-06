import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SpaceBackground from "@/components/SpaceBackground";
import SEO from "@/components/SEO";
import { Book, Code2, Rocket, Terminal, Database, Zap, ChevronRight, Search, Copy, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const sections = [
  { id: "getting-started", label: "Getting Started", icon: Rocket },
  { id: "installation", label: "Installation", icon: Terminal },
  { id: "api-reference", label: "API Reference", icon: Code2 },
  { id: "data-upload", label: "Data Upload", icon: Database },
  { id: "ai-analysis", label: "AI Analysis", icon: Zap },
  { id: "tutorials", label: "Tutorials", icon: Book },
];

const CodeBlock = ({ code, language = "bash" }: { code: string; language?: string }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group rounded-lg border border-border bg-muted/50 overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
        <span className="text-xs font-mono text-muted-foreground">{language}</span>
        <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-sm font-mono text-foreground/90">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const Docs = () => {
  const [activeSection, setActiveSection] = useState("getting-started");
  const [search, setSearch] = useState("");

  const filteredSections = sections.filter(s =>
    s.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <SEO
        title="Documentation — SpaceForge AI Developer Guide & API Reference"
        description="Official SpaceForge AI documentation: getting started, installation, API reference, data upload, AI analysis, and tutorials for the AI-powered analytics platform."
      />
      <SpaceBackground />
      <Navbar />
      <main className="relative z-10 pt-20">
        <div className="container mx-auto px-6 py-12">
          {/* Header */}
          <div className="mb-12">
            <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Link>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Documentation
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Everything you need to get started with SpaceForge — from setup to advanced AI-powered analytics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
            {/* Sidebar */}
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search docs…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 bg-card/50 border-border"
                />
              </div>
              <nav className="space-y-1">
                {filteredSections.map(s => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setActiveSection(s.id);
                      document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 ${
                      activeSection === s.id
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <s.icon className="w-4 h-4 flex-shrink-0" />
                    {s.label}
                    {activeSection === s.id && <ChevronRight className="w-3 h-3 ml-auto" />}
                  </button>
                ))}
              </nav>
            </aside>

            {/* Content */}
            <div className="space-y-16 max-w-3xl">
              {/* Getting Started */}
              <section id="getting-started">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Rocket className="w-6 h-6 text-primary" /> Getting Started
                </h2>
                <p className="text-muted-foreground mb-4">
                  SpaceForge is an AI-powered data analytics platform that transforms raw data into actionable intelligence. Follow these steps to get up and running in under 5 minutes.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                  {[
                    { step: "01", title: "Create Account", desc: "Sign up with email or OAuth" },
                    { step: "02", title: "Upload Data", desc: "CSV, Excel, or connect a database" },
                    { step: "03", title: "Get Insights", desc: "AI analyzes your data instantly" },
                  ].map(item => (
                    <div key={item.step} className="p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
                      <span className="text-xs font-mono text-primary">{item.step}</span>
                      <h3 className="font-semibold text-foreground mt-1">{item.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Installation */}
              <section id="installation">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Terminal className="w-6 h-6 text-primary" /> Installation
                </h2>
                <p className="text-muted-foreground mb-4">
                  SpaceForge runs in the browser — no installation needed. For programmatic access, use our API client:
                </p>
                <CodeBlock code={`npm install @spaceforge/sdk`} />
                <p className="text-muted-foreground mb-2">Initialize the client:</p>
                <CodeBlock language="typescript" code={`import { SpaceForge } from '@spaceforge/sdk';

const sf = new SpaceForge({
  apiKey: process.env.SPACEFORGE_API_KEY,
  project: 'my-analytics-project',
});

// Upload dataset
const dataset = await sf.datasets.upload('./sales-data.csv');
console.log('Dataset ID:', dataset.id);`} />
              </section>

              {/* API Reference */}
              <section id="api-reference">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Code2 className="w-6 h-6 text-primary" /> API Reference
                </h2>
                <p className="text-muted-foreground mb-6">
                  Core endpoints for interacting with SpaceForge programmatically.
                </p>
                <div className="space-y-4">
                  {[
                    { method: "POST", path: "/api/v1/datasets", desc: "Upload a new dataset" },
                    { method: "GET", path: "/api/v1/datasets/:id", desc: "Retrieve dataset details" },
                    { method: "POST", path: "/api/v1/analyze", desc: "Run AI analysis on a dataset" },
                    { method: "GET", path: "/api/v1/reports/:id", desc: "Get generated report" },
                    { method: "POST", path: "/api/v1/forecast", desc: "Generate predictive forecast" },
                    { method: "DELETE", path: "/api/v1/datasets/:id", desc: "Remove a dataset" },
                  ].map((ep, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card/30 hover:bg-card/50 transition-colors">
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        ep.method === "GET" ? "bg-green-500/10 text-green-500" :
                        ep.method === "POST" ? "bg-blue-500/10 text-blue-500" :
                        "bg-red-500/10 text-red-500"
                      }`}>{ep.method}</span>
                      <div>
                        <code className="text-sm font-mono text-foreground">{ep.path}</code>
                        <p className="text-sm text-muted-foreground mt-1">{ep.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <h3 className="text-lg font-semibold text-foreground mt-8 mb-3">Example Request</h3>
                <CodeBlock language="bash" code={`curl -X POST https://api.spaceforge.in/v1/analyze \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "dataset_id": "ds_abc123",
    "analysis_type": "comprehensive",
    "include_forecast": true
  }'`} />
              </section>

              {/* Data Upload */}
              <section id="data-upload">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Database className="w-6 h-6 text-primary" /> Data Upload
                </h2>
                <p className="text-muted-foreground mb-4">SpaceForge supports multiple data sources:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { title: "CSV / Excel", desc: "Drag & drop files up to 100MB" },
                    { title: "Database Connect", desc: "PostgreSQL, MySQL, MongoDB" },
                    { title: "API Ingest", desc: "Real-time data via REST or webhooks" },
                    { title: "Cloud Storage", desc: "Import from S3, GCS, or Azure Blob" },
                  ].map((item, i) => (
                    <div key={i} className="p-4 rounded-lg border border-border bg-card/30">
                      <h4 className="font-semibold text-foreground text-sm">{item.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* AI Analysis */}
              <section id="ai-analysis">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Zap className="w-6 h-6 text-primary" /> AI Analysis
                </h2>
                <p className="text-muted-foreground mb-4">
                  SpaceForge uses advanced machine learning models to automatically detect patterns, anomalies, and trends in your data.
                </p>
                <h3 className="text-lg font-semibold text-foreground mb-3">Analysis Types</h3>
                <ul className="space-y-3 text-muted-foreground">
                  {[
                    { name: "Descriptive", desc: "Summary statistics, distributions, and correlations" },
                    { name: "Diagnostic", desc: "Root cause analysis and anomaly detection" },
                    { name: "Predictive", desc: "Forecasting with confidence intervals" },
                    { name: "Prescriptive", desc: "AI-generated recommendations and action items" },
                  ].map((t, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="text-primary font-mono text-sm mt-0.5">→</span>
                      <div>
                        <strong className="text-foreground">{t.name}:</strong>{" "}
                        {t.desc}
                      </div>
                    </li>
                  ))}
                </ul>
                <CodeBlock language="typescript" code={`const report = await sf.analyze({
  datasetId: 'ds_abc123',
  type: 'predictive',
  targetColumn: 'revenue',
  horizon: '30d',
});

console.log(report.forecast);
// { trend: 'upward', confidence: 0.92, values: [...] }`} />
              </section>

              {/* Tutorials */}
              <section id="tutorials">
                <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-3">
                  <Book className="w-6 h-6 text-primary" /> Tutorials
                </h2>
                <div className="space-y-4">
                  {[
                    {
                      title: "Build a Sales Dashboard in 5 Minutes",
                      desc: "Upload your sales CSV, create real-time KPI tiles, and share with your team.",
                      time: "5 min",
                    },
                    {
                      title: "Connect PostgreSQL & Auto-Sync",
                      desc: "Set up a live connection to your database and schedule recurring analysis jobs.",
                      time: "10 min",
                    },
                    {
                      title: "Predictive Forecasting for E-Commerce",
                      desc: "Use AI to forecast revenue, detect seasonal patterns, and optimize inventory.",
                      time: "8 min",
                    },
                    {
                      title: "Custom Alerts & Automation",
                      desc: "Configure threshold-based triggers that notify your team via email or webhook.",
                      time: "6 min",
                    },
                  ].map((tut, i) => (
                    <div key={i} className="p-5 rounded-xl border border-border bg-card/40 hover:bg-card/60 transition-all duration-300 cursor-pointer group">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{tut.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{tut.desc}</p>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground whitespace-nowrap ml-4 mt-1">{tut.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTA */}
              <div className="p-8 rounded-2xl border border-primary/20 bg-primary/5 text-center">
                <h3 className="text-xl font-bold text-foreground mb-2">Ready to get started?</h3>
                <p className="text-muted-foreground mb-6">Create your free account and start analyzing data in minutes.</p>
                <div className="flex gap-3 justify-center">
                  <Link to="/auth">
                    <Button className="rounded-full px-8 bg-primary text-primary-foreground hover:bg-primary/90">
                      Sign Up Free
                    </Button>
                  </Link>
                  <Link to="/pricing">
                    <Button variant="outline" className="rounded-full px-8">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Docs;
