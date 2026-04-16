import type { MetadataRoute } from "next"

const BASE_URL = "https://admissions.ignitoacademy.com"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // Only the public application portal should be indexed.
        // More-specific disallow rules below take precedence over this allow.
        allow: "/apply",
        disallow: [
          "/apply/confirm-email",
          "/apply/academic-history",
          "/dashboard",
          "/admin",
          "/api",
          "/auth",
          "/login",
          "/test-payment",
          "/test-scholarship-video",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  }
}
