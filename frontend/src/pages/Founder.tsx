import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const ORIGIN = "https://www.spaceforge.in";
const PAGE_URL = `${ORIGIN}/founder`;
const PERSON_ID = `${PAGE_URL}#benadict-francis`;
const ORG_ID = `${ORIGIN}/#organization`;
const LINKEDIN = "https://www.linkedin.com/in/benadict-francis-5959a7313/";
const GITHUB = "https://github.com/benadictfrancisdev";
const INSTAGRAM = "https://www.instagram.com/space_forge.in";
const EMAIL = "hello@spaceforge.in";
const PHOTO_PATH = "/founder-benadict-francis.jpg";
const PHOTO_URL = `${ORIGIN}${PHOTO_PATH}`;

const TITLE = "Benadict Francis — Founder & AI Engineer, SpaceForge AI";
const DESCRIPTION =
  "Benadict Francis is the founder and AI engineer behind SpaceForge AI, an AI decision intelligence platform that helps businesses turn data into faster, more confident decisions.";

const EXPERTISE = [
  "Artificial Intelligence",
  "Machine Learning",
  "Data Analytics",
  "Decision Intelligence",
  "Enterprise SaaS",
  "Cloud-Based Applications",
  "Full-Stack Software Engineering",
  "REST APIs",
  "Business Intelligence",
  "AI-Powered Automation",
];

const STACK = [
  "React",
  "TypeScript",
  "Python",
  "Django",
  "REST APIs",
  "Node.js",
  "PostgreSQL",
  "Cloud Platforms",
  "Edge Functions",
  "Modern Web Technologies",
];

const PHILOSOPHY = [
  "Clean architecture",
  "Scalable system design",
  "Security by design",
  "Performance optimization",
  "User-first experiences",
  "Continuous innovation",
  "Long-term maintainability",
];

const VALUES = [
  "Innovation",
  "Integrity",
  "Simplicity",
  "Continuous learning",
  "Reliability",
  "Customer-centric thinking",
  "Long-term impact",
];

const FAQS = [
  {
    q: "Who is Benadict Francis?",
    a: "Benadict Francis is an AI engineer, software developer and technology entrepreneur. He is the founder, designer and lead developer of SpaceForge AI, a decision intelligence platform that helps businesses turn their data into clear, confident decisions.",
  },
  {
    q: "What does Benadict Francis work on?",
    a: "He works at the intersection of artificial intelligence, data analytics and enterprise software — designing and engineering AI systems that analyse business data, surface insights and support faster decision-making.",
  },
  {
    q: "What is SpaceForge AI?",
    a: "SpaceForge AI is an AI decision intelligence platform. Users upload business data such as spreadsheets or connect their existing systems, and the platform produces executive dashboards, forecasts and plain-English insights and recommendations.",
  },
  {
    q: "What technologies does Benadict Francis specialize in?",
    a: "Artificial intelligence and machine learning, data science and analytics, React, TypeScript, Python, Django, REST APIs, cloud platforms, databases and enterprise SaaS architecture.",
  },
  {
    q: "What is the mission behind SpaceForge AI?",
    a: "To make advanced artificial intelligence accessible to organizations of every size by building secure, scalable and reliable platforms that improve decision-making and business productivity.",
  },
  {
    q: "How can I contact Benadict Francis?",
    a: `You can reach him by email at ${EMAIL} or connect on LinkedIn at ${LINKEDIN}.`,
  },
];

const schema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${ORIGIN}/#website`,
      url: ORIGIN,
      name: "SpaceForge AI",
      description:
        "AI decision intelligence platform that turns business data into dashboards, forecasts and decisions.",
      inLanguage: "en",
      publisher: { "@id": ORG_ID },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${ORIGIN}/use-cases?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@type": "Organization",
      "@id": ORG_ID,
      name: "SpaceForge AI",
      alternateName: "SpaceForge",
      url: ORIGIN,
      email: EMAIL,
      sameAs: [LINKEDIN, GITHUB, INSTAGRAM],
      founder: { "@id": PERSON_ID },
      foundingLocation: { "@type": "Place", name: "India" },
      description:
        "SpaceForge AI is an AI decision intelligence platform that helps businesses transform data into executive dashboards, forecasts and confident decisions.",
    },
    {
      "@type": "Person",
      "@id": PERSON_ID,
      name: "Benadict Francis",
      alternateName: ["Benadict Francis D"],
      jobTitle: "Founder & AI Engineer",
      hasOccupation: {
        "@type": "Occupation",
        name: "AI Engineer",
        occupationalCategory: "15-1252.00",
      },
      description: DESCRIPTION,
      url: PAGE_URL,
      mainEntityOfPage: { "@id": `${PAGE_URL}#webpage` },
      image: { "@type": "ImageObject", url: PHOTO_URL, width: 1088, height: 929 },
      email: `mailto:${EMAIL}`,
      sameAs: [LINKEDIN, GITHUB, INSTAGRAM],
      worksFor: { "@id": ORG_ID },
      founder: { "@id": ORG_ID },
      knowsAbout: EXPERTISE,
      knowsLanguage: ["English", "Tamil"],
      nationality: { "@type": "Country", name: "India" },
    },
    {
      "@type": ["ProfilePage", "WebPage"],
      "@id": `${PAGE_URL}#webpage`,
      url: PAGE_URL,
      name: TITLE,
      description: DESCRIPTION,
      inLanguage: "en",
      isPartOf: { "@id": `${ORIGIN}/#website` },
      about: { "@id": PERSON_ID },
      mainEntity: { "@id": PERSON_ID },
      primaryImageOfPage: { "@type": "ImageObject", url: PHOTO_URL },
      breadcrumb: { "@id": `${PAGE_URL}#breadcrumb` },
    },
    {
      "@type": "BreadcrumbList",
      "@id": `${PAGE_URL}#breadcrumb`,
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
        { "@type": "ListItem", position: 2, name: "About", item: `${ORIGIN}/about` },
        { "@type": "ListItem", position: 3, name: "Founder", item: PAGE_URL },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": `${PAGE_URL}#faq`,
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ],
};

const Section = ({
  id,
  title,
  eyebrow,
  children,
}: {
  id: string;
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
}) => (
  <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28 border-t border-border pt-12">
    {eyebrow && (
      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">{eyebrow}</p>
    )}
    <h2 id={`${id}-heading`} className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-5">
      {title}
    </h2>
    <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
  </section>
);

const TagList = ({ items, label }: { items: string[]; label: string }) => (
  <ul aria-label={label} className="flex flex-wrap gap-2">
    {items.map((item) => (
      <li
        key={item}
        className="rounded-full border border-border bg-card/60 px-3.5 py-1.5 text-sm text-foreground/90"
      >
        {item}
      </li>
    ))}
  </ul>
);

const Founder = () => (
  <div className="min-h-screen bg-background relative">
    <SEO title={TITLE} description={DESCRIPTION} ogImage={PHOTO_URL} canonicalPath="/founder" />
    <SpaceBackground />
    <a
      href="#founder-main"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
    >
      Skip to main content
    </a>
    <Navbar />

    <main id="founder-main" className="relative z-10 pt-24 pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />

      <div className="container mx-auto px-6 max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <li><Link to="/" className="hover:text-foreground">Home</Link></li>
            <li aria-hidden="true">/</li>
            <li><Link to="/about" className="hover:text-foreground">About</Link></li>
            <li aria-hidden="true">/</li>
            <li aria-current="page" className="text-foreground">Founder</li>
          </ol>
        </nav>

        <article itemScope itemType="https://schema.org/Person">
          <link itemProp="url" href={PAGE_URL} />
          <meta itemProp="nationality" content="India" />

          {/* Hero */}
          <header className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 pb-12">
            <img
              src={PHOTO_PATH}
              alt="Portrait of Benadict Francis, Founder and AI Engineer of SpaceForge AI"
              itemProp="image"
              width={160}
              height={160}
              decoding="async"
              fetchPriority="high"
              className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl object-cover object-top border border-border shadow-sm shrink-0"
            />
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground mb-3">
                Founder Profile
              </p>
              <h1
                className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-3"
                itemProp="name"
              >
                Benadict Francis
              </h1>
              <p className="text-lg md:text-xl text-primary font-medium mb-4" itemProp="jobTitle">
                Founder &amp; AI Engineer, SpaceForge AI
              </p>
              <p className="text-lg leading-relaxed text-muted-foreground" itemProp="description">
                Building intelligent software that helps businesses transform data into better decisions.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={LINKEDIN}
                  target="_blank"
                  rel="me noopener noreferrer"
                  itemProp="sameAs"
                  className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90 transition-opacity"
                >
                  Connect on LinkedIn
                </a>
                <a
                  href={`mailto:${EMAIL}`}
                  className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
                >
                  Email {EMAIL}
                </a>
              </div>
            </div>
          </header>

          <div className="space-y-12">
            <Section id="story" eyebrow="Founder story" title="From engineering curiosity to a decision intelligence platform">
              <p>
                Hi, I&apos;m <strong className="text-foreground">Benadict Francis</strong>, the founder of{" "}
                <span itemProp="worksFor" itemScope itemType="https://schema.org/Organization">
                  <a href={ORIGIN} itemProp="url" className="text-primary hover:underline">
                    <span itemProp="name">SpaceForge AI</span>
                  </a>
                </span>
                . I am an AI engineer and technology entrepreneur focused on products that combine artificial
                intelligence, data intelligence and modern software engineering.
              </p>
              <p>
                The future of technology will not be defined by the number of AI models that exist, but by how
                effectively those models help people make better decisions. Rather than treating AI as automation
                alone, I build systems that help organizations understand complex information, identify patterns
                and act with confidence.
              </p>
              <p>
                Every product I build is guided by three principles: build with purpose, solve real-world
                problems, and create technology that scales.
              </p>
            </Section>

            <Section id="mission" eyebrow="Mission" title="Make advanced AI accessible to every organization">
              <p>
                My mission is to make advanced artificial intelligence accessible to organizations of every size
                by building secure, scalable and reliable platforms that improve decision-making and business
                productivity.
              </p>
              <p>
                I want to bridge the gap between complex AI technologies and everyday business operations through
                products that are simple to use and powerful in capability.
              </p>
            </Section>

            <Section id="vision" eyebrow="Vision" title="AI as a trusted partner in daily operations">
              <p>
                I envision a future where AI becomes a trusted partner in everyday business operations — building
                globally recognised products that help organizations innovate faster and unlock the full potential
                of their data.
              </p>
              <p>
                The next generation of software will not simply automate tasks; it will help people think,
                analyse and decide with confidence.
              </p>
            </Section>

            <Section id="philosophy" eyebrow="Engineering philosophy" title="Fundamentals over shortcuts">
              <p>
                Successful products are built through strong engineering fundamentals. Every feature begins with a
                business challenge, followed by careful engineering, continuous testing and an emphasis on
                performance, scalability and user experience.
              </p>
              <TagList items={PHILOSOPHY} label="Engineering principles" />
              <p className="pt-2">Technology should make businesses more efficient, not more complicated.</p>
            </Section>

            <Section id="values" eyebrow="Core values" title="What guides the work">
              <TagList items={VALUES} label="Core values" />
            </Section>

            <Section id="expertise" eyebrow="Areas of expertise" title="Where AI, data and enterprise software meet">
              <TagList items={EXPERTISE} label="Areas of expertise" />
            </Section>

            <Section id="stack" eyebrow="Technology stack" title="Tools and technologies used day to day">
              <TagList items={STACK} label="Technology stack" />
            </Section>

            <Section id="focus" eyebrow="Current focus" title="Building SpaceForge AI">
              <p>
                My current focus is SpaceForge AI — a decision intelligence platform where teams upload business
                data or connect existing systems and receive executive dashboards, forecasts and plain-English
                insights. Raw data stays in the browser; only statistical summaries are processed.
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Analytics and reporting that a non-analyst can read in seconds.</li>
                <li>Forecasting and scenario analysis for planning decisions.</li>
                <li>An AI copilot that explains what changed in the numbers and why.</li>
              </ul>
            </Section>

            <Section id="projects" eyebrow="Projects" title="Explore the product">
              <ul className="grid gap-3 sm:grid-cols-2">
                {[
                  { to: "/data-agent", label: "AI Data Agent", desc: "Upload data, get dashboards and insights." },
                  { to: "/analytics", label: "Analytics Hub", desc: "KPIs, trends, forecasting and business health." },
                  { to: "/decisions", label: "Decision Feed", desc: "Prioritised recommendations with reasoning." },
                  { to: "/blog", label: "Blog", desc: "Writing on AI, analytics and decision intelligence." },
                ].map((p) => (
                  <li key={p.to}>
                    <Link
                      to={p.to}
                      className="block h-full rounded-xl border border-border bg-card/60 p-4 hover:bg-muted/50 transition-colors"
                    >
                      <span className="block font-semibold text-foreground">{p.label}</span>
                      <span className="block text-sm text-muted-foreground mt-1">{p.desc}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Section>

            <Section id="future" eyebrow="Future goals" title="Looking ahead">
              <p>
                My long-term goal is to contribute to the global AI ecosystem by developing enterprise-grade
                solutions that combine intelligence, usability and trust — and to encourage the next generation of
                engineers and entrepreneurs to solve meaningful problems through technology.
              </p>
              <p>
                Technology continues to evolve rapidly, but the purpose remains unchanged: create solutions that
                improve the way people work, make decisions and build the future.
              </p>
            </Section>

            <Section id="profiles" eyebrow="Public profiles" title="Where to find me">
              <ul className="space-y-2">
                <li>
                  LinkedIn:{" "}
                  <a href={LINKEDIN} itemProp="sameAs" target="_blank" rel="me author noopener noreferrer" className="text-primary hover:underline break-words">
                    linkedin.com/in/benadict-francis-5959a7313
                  </a>
                </li>
                <li>
                  GitHub:{" "}
                  <a href={GITHUB} itemProp="sameAs" target="_blank" rel="me noopener noreferrer" className="text-primary hover:underline break-words">
                    github.com/benadictfrancisdev
                  </a>
                </li>
                <li>
                  Instagram:{" "}
                  <a href={INSTAGRAM} itemProp="sameAs" target="_blank" rel="me noopener noreferrer" className="text-primary hover:underline break-words">
                    instagram.com/space_forge.in
                  </a>
                </li>
              </ul>
            </Section>

            <Section id="contact" eyebrow="Contact" title="Get in touch">
              <p>
                For product questions, partnerships or press, email{" "}
                <a href={`mailto:${EMAIL}`} className="text-primary hover:underline">{EMAIL}</a> or send a message
                on LinkedIn.
              </p>
            </Section>

            <Section id="faq" eyebrow="FAQ" title="Frequently asked questions">
              <div className="divide-y divide-border rounded-xl border border-border bg-card/40">
                {FAQS.map((f) => (
                  <details key={f.q} className="group p-5">
                    <summary className="cursor-pointer list-none font-medium text-foreground marker:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
                      <span className="flex items-start justify-between gap-4">
                        <span>{f.q}</span>
                        <span aria-hidden="true" className="text-muted-foreground transition-transform group-open:rotate-45">
                          +
                        </span>
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </Section>
          </div>
        </article>

        <nav aria-label="Related pages" className="mt-14 border-t border-border pt-8">
          <h2 className="text-sm font-semibold text-foreground mb-4">Explore SpaceForge AI</h2>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {[
              { to: "/", label: "Home" },
              { to: "/about", label: "About" },
              { to: "/use-cases", label: "Products & use cases" },
              { to: "/pricing", label: "Pricing" },
              { to: "/blog", label: "Blog" },
              { to: "/docs", label: "Docs" },
              { to: "/privacy", label: "Privacy Policy" },
              { to: "/terms", label: "Terms" },
            ].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="hover:text-foreground">{l.label}</Link>
              </li>
            ))}
            <li>
              <a href="/sitemap.xml" className="hover:text-foreground">Sitemap</a>
            </li>
          </ul>
        </nav>
      </div>
    </main>
    <Footer />
  </div>
);

export default Founder;
