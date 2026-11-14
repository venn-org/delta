import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,

  turbopack: {
    // Pins the workspace root. Without it Turbopack walks up and finds a stray
    // package-lock.json outside the repo.
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },

  /**
   * Response headers, applied to every route.
   *
   * Deliberately NOT here: HSTS. Vercel already redirects HTTP to HTTPS, and
   * a max-age sent before the custom domain is settled commits every browser
   * that saw it. Worth adding once app.vennflat.site is final.
   *
   * Indexing is refused in app/robots.ts, not here, so one file answers
   * "are we public yet?".
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nothing in the app is meant to be framed, and a sign-in form in
          // somebody else's iframe is a clickjacking target.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Send the origin to other sites, never the path. A match detail URL
          // carries another user's id in it.
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // No route uses the camera, microphone or location yet. Verification
          // selfies (phase 6) will need camera, so this gets revisited then.
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
