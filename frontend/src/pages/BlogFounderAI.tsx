import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const LINKEDIN = "https://www.linkedin.com/in/benadict-francis-5959a7313/";
const GITHUB = "https://github.com/benadictfrancisdev";
const PHOTO_PATH = "/founder-benadict-francis.jpg";
const PHOTO_URL = `https://www.spaceforge.in${PHOTO_PATH}`;
const URL = "https://www.spaceforge.in/blog/benadict-francis-founder-building-ai-for-the-next-generation";
const PUBLISHED = "2026-08-01";

const TITLE = "Benadict Francis – Founder Building AI for the Next Generation";
const DESCRIPTION =
  "How Benadict Francis, founder and AI engineer of SpaceForge AI, builds practical artificial intelligence that helps businesses turn data into faster, more confident decisions.";

const paragraphs = [
  "The future of technology will not be defined by the number of AI models that exist, but by how effectively those models help people make better decisions. This belief has shaped the journey of Benadict Francis, an engineer, entrepreneur, and AI product builder focused on creating practical artificial intelligence that solves real-world business challenges.",
  "From an early stage in his career, Benadict developed a strong interest in artificial intelligence, data systems, software engineering, and cloud technologies. Rather than viewing AI as a tool for automation alone, he believes its greatest value lies in helping organizations understand complex information, identify patterns, and make faster, more confident decisions.",
  "His work combines modern software engineering with machine learning, analytics, and scalable cloud architecture. The objective is simple: build technology that is intelligent, reliable, and accessible to businesses of every size.",
  "Benadict's approach to product development is centered around solving real operational problems instead of following technology trends. Every feature begins with a business challenge, followed by careful engineering, continuous testing, and an emphasis on performance, scalability, and user experience.",
  "Over the years, he has worked extensively with technologies including Artificial Intelligence, Data Science, React, TypeScript, Python, Django, REST APIs, cloud platforms, databases, enterprise SaaS architecture, and modern web technologies. His engineering philosophy focuses on creating systems that are maintainable, secure, and capable of supporting long-term growth.",
  "As the founder of SpaceForge AI, Benadict is working toward a future where businesses can leverage advanced AI capabilities without unnecessary complexity. The vision extends beyond building software—it is about creating an intelligent platform that helps organizations transform data into meaningful insights and confident decisions.",
  "Innovation, continuous learning, and disciplined engineering remain the core principles behind his work. He believes that successful technology products are built through consistency, attention to detail, and a commitment to delivering genuine value to users rather than short-term innovation alone.",
  "Looking ahead, Benadict's mission is to contribute to the global AI ecosystem by developing enterprise-grade solutions that combine intelligence, usability, and trust. His long-term goal is to build products that are recognized internationally for their quality, reliability, and impact while encouraging the next generation of engineers and entrepreneurs to solve meaningful problems through technology.",
  "Technology continues to evolve rapidly, but the purpose remains unchanged: create solutions that improve the way people work, make decisions, and build the future.",
];

const articleSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "BlogPosting",
      "@id": `${URL}#article`,
      headline: TITLE,
      description: DESCRIPTION,
      image: PHOTO_URL,
      datePublished: PUBLISHED,
      dateModified: PUBLISHED,
      inLanguage: "en",
      mainEntityOfPage: { "@type": "WebPage", "@id": URL },
      articleSection: "Founder Story",
      keywords:
        "Benadict Francis, SpaceForge AI founder, AI engineer India, decision intelligence, enterprise SaaS, artificial intelligence entrepreneur",
      author: {
        "@type": "Person",
        "@id": "https://www.spaceforge.in/founder#benadict-francis",
        name: "Benadict Francis",
        jobTitle: "Founder & AI Engineer",
        url: "https://www.spaceforge.in/founder",
        image: PHOTO_URL,
        sameAs: [LINKEDIN, GITHUB, "https://www.instagram.com/space_forge.in"],
      },
      publisher: {
        "@type": "Organization",
        name: "SpaceForge AI",
        url: "https://www.spaceforge.in",
        logo: { "@type": "ImageObject", url: "https://www.spaceforge.in/favicon.ico" },
      },
      about: {
        "@type": "Organization",
        name: "SpaceForge AI",
        url: "https://www.spaceforge.in",
        founder: { "@id": "https://www.spaceforge.in/founder#benadict-francis" },
      },
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.spaceforge.in/" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.spaceforge.in/blog" },
        { "@type": "ListItem", position: 3, name: TITLE, item: URL },
      ],
    },
  ],
};

const BlogFounderAI = () => (
  <div className="min-h-screen bg-background relative">
    <SEO title={`${TITLE} | SpaceForge AI`} description={DESCRIPTION} ogImage={PHOTO_URL} />
    <SpaceBackground />
    <Navbar />
    <main className="relative z-10 pt-24 pb-20">
      <article className="container mx-auto px-6 max-w-3xl" itemScope itemType="https://schema.org/BlogPosting">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />

        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">Home</Link>
          <span className="mx-2">/</span>
          <Link to="/blog" className="hover:text-foreground">Blog</Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">Founder Story</span>
        </nav>

        <header className="mb-10">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-4">Founder Story</p>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight" itemProp="headline">
            {TITLE}
          </h1>
          <p className="mt-5 text-lg text-muted-foreground" itemProp="description">
            {DESCRIPTION}
          </p>

          <div className="mt-8 flex items-center gap-4 border-y border-border py-5">
            <img
              src={PHOTO_PATH}
              alt="Benadict Francis, Founder & AI Engineer of SpaceForge AI"
              className="h-14 w-14 rounded-full object-cover"
              itemProp="image"
              loading="lazy"
            />
            <div className="text-sm">
              <p className="font-semibold">
                <Link to="/founder" rel="author" className="hover:underline">Benadict Francis</Link>
              </p>
              <p className="text-muted-foreground">
                Founder &amp; AI Engineer, SpaceForge AI ·{" "}
                <time dateTime={PUBLISHED} itemProp="datePublished">August 1, 2026</time>
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-6 text-base leading-relaxed text-foreground/90" itemProp="articleBody">
          {paragraphs.map((p) => (
            <p key={p.slice(0, 40)}>{p}</p>
          ))}
        </div>

        <section className="mt-14 rounded-xl border border-border bg-card/60 p-6">
          <h2 className="text-lg font-semibold">About the author</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Benadict Francis is the founder, designer, and lead developer of SpaceForge AI — an AI decision
            intelligence platform that turns business data into clear, confident decisions.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/founder" className="rounded-md border border-border px-4 py-2 hover:bg-muted transition-colors">
              Read the full founder profile
            </Link>
            <a
              href={LINKEDIN}
              target="_blank"
              rel="me noopener noreferrer"
              className="rounded-md border border-border px-4 py-2 hover:bg-muted transition-colors"
            >
              Connect on LinkedIn
            </a>
            <Link to="/data-agent" className="rounded-md bg-primary px-4 py-2 text-primary-foreground hover:opacity-90 transition-opacity">
              Try SpaceForge free
            </Link>
          </div>
        </section>
      </article>
    </main>
    <Footer />
  </div>
);

export default BlogFounderAI;
