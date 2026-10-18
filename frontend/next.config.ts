import type { NextConfig } from "next";

// The browser only ever talks to this origin. /api/* is proxied to FastAPI so the
// session cookie stays first-party (SameSite=Lax) and no backend URL or secret is
// shipped to the client. BACKEND_URL is a server-only env var.
const backend = process.env.BACKEND_URL ?? "http://localhost:8000";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Lets a verification build (NEXT_DIST_DIR=.next-build) run while `next dev` uses .next;
  // building into the dev server's folder crashed its render workers.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/shared/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" },
        { key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow" }] },
    ];
  },
};

export default nextConfig;
