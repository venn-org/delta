import type { MetadataRoute } from "next";

/**
 * Nothing here is for search engines.
 *
 * This host is the app: every screen past the front door is behind a session,
 * and the screens before it are a signup funnel, not content. The marketing
 * site on the apex domain is what should rank.
 *
 * It also matters while this is a public alpha — an indexed /onboarding or
 * /signin would outlive the alpha in search results long after the URLs
 * changed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
