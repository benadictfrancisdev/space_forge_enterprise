import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SpaceBackground from "@/components/SpaceBackground";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";

const posts = [
  {
    slug: "/blog/benadict-francis-founder-building-ai-for-the-next-generation",
    title: "Benadict Francis – Founder Building AI for the Next Generation",
    excerpt:
      "How the founder of SpaceForge AI builds practical artificial intelligence that helps businesses turn data into faster, more confident decisions.",
    date: "2026-08-01",
    dateLabel: "August 1, 2026",
    category: "Founder Story",
  },
];

const blogSchema = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "@id": "https://www.spaceforge.in/blog#blog",
  name: "SpaceForge AI Blog",
  url: "https://www.spaceforge.in/blog",
  publisher: { "@type": "Organization", name: "SpaceForge AI", url: "https://www.spaceforge.in" },
  blogPost: posts.map((p) => ({
    "@type": "BlogPosting",
    headline: p.title,
    url: `https://www.spaceforge.in${p.slug}`,
    datePublished: p.date,
    author: { "@type": "Person", name: "Benadict Francis", url: "https://www.spaceforge.in/founder" },
  })),
};

const Blog = () => (
  <div className="min-h-screen bg-background relative">
    <SEO
      title="Blog — AI, Data & Decision Intelligence | SpaceForge AI"
      description="Insights on artificial intelligence, analytics and decision intelligence from the SpaceForge AI team and founder Benadict Francis."
    />
    <SpaceBackground />
    <Navbar />
    <main className="relative z-10 pt-24 pb-20">
      <div className="container mx-auto px-6 max-w-3xl">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">Blog</h1>
        <p className="mt-4 text-muted-foreground">
          Ideas on AI, analytics and building decision intelligence for modern businesses.
        </p>

        <div className="mt-10 space-y-4">
          {posts.map((post) => (
            <Link
              key={post.slug}
              to={post.slug}
              className="block rounded-xl border border-border bg-card/60 p-6 hover:bg-muted/50 transition-colors"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{post.category}</p>
              <h2 className="mt-3 text-xl font-semibold leading-snug">{post.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{post.excerpt}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                <time dateTime={post.date}>{post.dateLabel}</time> · Benadict Francis
              </p>
            </Link>
          ))}
        </div>
      </div>
    </main>
    <Footer />
  </div>
);

export default Blog;
