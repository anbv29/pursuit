import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/w", "/account", "/onboarding", "/shared/", "/login", "/signup"] } };
}
