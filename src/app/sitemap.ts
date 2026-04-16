import type { MetadataRoute } from "next"

const BASE_URL = "https://admissions.ignitoacademy.com"

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${BASE_URL}/apply`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1.0,
    },
  ]
}
