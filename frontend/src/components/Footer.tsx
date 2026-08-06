import { useState } from "react";
import { Link } from "react-router-dom";
import DonateModal from "./DonateModal";
import Logo from "./Logo";
import { Linkedin, Github, Trophy, Crown, Star, ArrowUpRight } from "lucide-react";
import startupRankedBadge from "@/assets/startupranked-badge.png";

const Footer = () => {
  const [donateOpen, setDonateOpen] = useState(false);

  const solutions = [
    { label: "Use Cases", href: "/use-cases" },
    { label: "Compare", href: "/compare" },
    { label: "Founders & CEOs", href: "/founder" },
    { label: "Data Teams", href: "/data-agent" },
  ];

  const resources = [
    { label: "Documentation", href: "/docs" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Blog", href: "/blog" },
    { label: "Tutorials", href: "/docs" },
    { label: "Support", href: "mailto:hello@spaceforge.in", external: true },
  ];

  const company = [
    { label: "About Us", href: "/about" },
    { label: "Careers", href: "/about" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ];

  const renderFooterLink = ({ label, href, external }: { label: string; href: string; external?: boolean }) => {
    const className = "text-sm text-muted-foreground hover:text-primary transition-colors";

    if (external) {
      return (
        <a href={href} className={className} rel="noopener noreferrer">
          {label}
        </a>
      );
    }

    return (
      <Link to={href} className={className}>
        {label}
      </Link>
    );
  };

  return (
    <footer className="relative z-10 py-16 border-t border-border bg-card/95 backdrop-blur-xl">
      <div className="container mx-auto px-6">
        {/* Achievements — Editorial / Elite */}
        <div className="mb-16 pb-14 border-b border-border">
          <div className="flex items-end justify-between mb-10 gap-6 flex-wrap">
            <div>
              <p className="text-[10px] font-medium tracking-[0.28em] uppercase text-muted-foreground mb-3">
                Recognition
              </p>
              <h3 className="text-2xl md:text-3xl font-medium text-foreground tracking-[-0.02em] leading-tight">
                Ranked <span className="italic font-light text-foreground/55">#1 of all time</span>
                <br className="hidden sm:block" /> by the global startup community.
              </h3>
            </div>
            <a
              href="https://startupranked.com/startup/space-forge"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group"
            >
              View on StartupRanked
              <ArrowUpRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border border-y border-border">
            {[
              { rank: "01", icon: Crown,  label: "Last Week's Winner",   metric: "45 upvotes",   detail: "Apr 20 – Apr 26, 2026" },
              { rank: "02", icon: Star,   label: "Top Products of All Time", metric: "#1 ranked", detail: "Most upvoted product, ever" },
              { rank: "03", icon: Trophy, label: "Top Launches of All Time", metric: "#1 launch",  detail: "Most upvoted launch, ever" },
            ].map((a) => (
              <div key={a.rank} className="px-6 py-8 group hover:bg-muted/20 transition-colors">
                <div className="flex items-start justify-between mb-6">
                  <span className="text-[10px] tracking-[0.24em] text-muted-foreground/60 tabular-nums">{a.rank}</span>
                  <a.icon className="w-3.5 h-3.5 text-foreground/40 group-hover:text-foreground/70 transition-colors" />
                </div>
                <p className="text-[10px] font-medium tracking-[0.22em] uppercase text-muted-foreground mb-3">
                  {a.label}
                </p>
                <p className="text-2xl md:text-3xl font-medium text-foreground tracking-[-0.02em] mb-2">
                  {a.metric}
                </p>
                <p className="text-xs text-muted-foreground/80 font-light leading-relaxed">
                  {a.detail}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-12 mb-12">
          <div className="md:col-span-1">
            <Logo size="md" className="mb-4" />
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Your AI Analyst Copilot. Upload data, get insights, share decisions — built for founders and teams.
            </p>
            <div className="flex items-center gap-2">
              <a href="https://www.linkedin.com/in/benadict-francis-5959a7313" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://github.com/benadictfrancisdev" target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-foreground/10 transition-colors">
                <Github className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">Solutions</h4>
            <ul className="space-y-3">
              {solutions.map((solution) => (
                <li key={solution.label}>
                  {renderFooterLink(solution)}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">Resources</h4>
            <ul className="space-y-3">
              {resources.map((resource) => (
                <li key={resource.label}>
                  {renderFooterLink(resource)}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">How It Works</h4>
            <ul className="space-y-3">
              {["Upload Data", "AI Analysis", "Get Decisions", "Take Action", "Generate Reports"].map((step) => (
                <li key={step}><span className="text-sm text-muted-foreground">{step}</span></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold tracking-widest uppercase text-foreground mb-4">Company</h4>
            <ul className="space-y-3">
              {company.map((c) => (
                <li key={c.label}>
                  <Link to={c.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-border gap-4">
          <p className="text-sm text-muted-foreground">© SpaceForge AI 2026. All Rights Reserved.</p>
          <div className="flex items-center gap-4">
            <a href="https://startupranked.com/startup/space-forge" target="_blank" rel="noopener noreferrer" className="relative inline-block">
              <img src={startupRankedBadge} alt="SpaceForge - All-Time #1 on StartupRanked" className="h-10 w-auto" />
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-yellow-400 text-[10px] font-extrabold text-black shadow">#1</span>
            </a>
            <a href="https://www.producthunt.com/products/space-forge?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-space-forge" target="_blank" rel="noopener noreferrer">
              <img src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1107965&theme=light&t=1775116625511" alt="Space Forge - AI that turns data into instant decisions | Product Hunt" width="250" height="54" className="h-10 w-auto" />
            </a>
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-primary transition-colors">Terms</Link>
            <Link to="/docs" className="hover:text-primary transition-colors">Docs</Link>
          </div>
        </div>
      </div>
      <DonateModal open={donateOpen} onOpenChange={setDonateOpen} />
    </footer>
  );
};

export default Footer;
