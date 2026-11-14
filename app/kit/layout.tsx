import { notFound } from "next/navigation";

/**
 * /kit is the component gallery — a development tool, not a screen.
 *
 * It leaks nothing private (every fixture in it is invented), but a public
 * app should not serve a page that enumerates its own UI, and anyone who
 * found it would reasonably mistake it for something broken.
 *
 * Gated at build time rather than per request on purpose: `next build` runs
 * with NODE_ENV=production, so the gallery is replaced by the 404 at build
 * time and the real page is never generated for a production deploy.
 * `next dev` renders it as before.
 */
export default function KitLayout({ children }: LayoutProps<"/kit">) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
