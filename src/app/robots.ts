import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/apply",
        disallow: ["/dashboard", "/admin", "/api", "/auth"],
      },
    ],
    sitemap: "https://admissions.ignitoacademy.com/sitemap.xml",
  }
}
