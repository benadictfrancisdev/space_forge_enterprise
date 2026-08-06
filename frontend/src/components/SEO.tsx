import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SITE_ORIGIN = "https://www.spaceforge.in";

interface SEOProps {
  title?: string;
  description?: string;
  canonicalPath?: string; // override; otherwise current path
  noindex?: boolean;
  ogImage?: string;
}

const upsertMeta = (selector: string, attrs: Record<string, string>) => {
  let el = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null;
  if (!el) {
    const tag = selector.startsWith("link") ? "link" : "meta";
    el = document.createElement(tag) as HTMLMetaElement | HTMLLinkElement;
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => el!.setAttribute(k, v));
};

export const SEO = ({ title, description, canonicalPath, noindex, ogImage }: SEOProps) => {
  const location = useLocation();

  useEffect(() => {
    // Build clean canonical URL (strip query/hash, normalise trailing slash for root only)
    const rawPath = canonicalPath ?? location.pathname;
    const path = rawPath === "/" ? "/" : rawPath.replace(/\/+$/, "");
    const canonicalUrl = `${SITE_ORIGIN}${path}`;

    if (title) document.title = title;

    if (description) {
      upsertMeta('meta[name="description"]', { name: "description", content: description });
      upsertMeta('meta[property="og:description"]', { property: "og:description", content: description });
      upsertMeta('meta[name="twitter:description"]', { name: "twitter:description", content: description });
    }

    if (title) {
      upsertMeta('meta[property="og:title"]', { property: "og:title", content: title });
      upsertMeta('meta[name="twitter:title"]', { name: "twitter:title", content: title });
    }

    upsertMeta('link[rel="canonical"]', { rel: "canonical", href: canonicalUrl });
    upsertMeta('meta[property="og:url"]', { property: "og:url", content: canonicalUrl });

    upsertMeta('meta[name="robots"]', {
      name: "robots",
      content: noindex
        ? "noindex, nofollow"
        : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    });

    if (ogImage) {
      upsertMeta('meta[property="og:image"]', { property: "og:image", content: ogImage });
      upsertMeta('meta[name="twitter:image"]', { name: "twitter:image", content: ogImage });
    }
  }, [location.pathname, title, description, canonicalPath, noindex, ogImage]);

  return null;
};

export default SEO;
