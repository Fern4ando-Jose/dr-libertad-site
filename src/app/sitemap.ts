import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.drlibertad.com";
  return [
    {
      url: base,
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
