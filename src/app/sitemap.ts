import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.drlibertad.com";
  const languages = {
    "pt-BR": `${base}/pt`,
    "es-ES": `${base}/es`,
    "x-default": `${base}/pt`,
  };

  const privacy = {
    "pt-BR": `${base}/pt/privacidade`,
    "es-ES": `${base}/es/privacidade`,
    "x-default": `${base}/pt/privacidade`,
  };

  // Uma entrada por idioma, cada uma declarando as alternativas (hreflang).
  return [
    {
      url: `${base}/pt`,
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${base}/es`,
      changeFrequency: "daily",
      priority: 1,
      alternates: { languages },
    },
    {
      url: `${base}/pt/privacidade`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: { languages: privacy },
    },
    {
      url: `${base}/es/privacidade`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: { languages: privacy },
    },
  ];
}
