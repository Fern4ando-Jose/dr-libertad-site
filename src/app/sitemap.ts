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

  const quiz = {
    "pt-BR": `${base}/pt/quiz`,
    "es-ES": `${base}/es/quiz`,
    "x-default": `${base}/pt/quiz`,
  };

  // Pesquisa "Redes Sociais e Relacionamentos" — rotas fixas por idioma
  // (fora do prefixo /pt|/es; ver src/proxy.ts).
  const survey = {
    "pt-BR": `${base}/pesquisa`,
    "es-ES": `${base}/investigacion`,
    "x-default": `${base}/pesquisa`,
  };

  // Uma entrada por idioma, cada uma declarando as alternativas (hreflang).
  return [
    {
      url: `${base}/pesquisa`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: survey },
    },
    {
      url: `${base}/investigacion`,
      changeFrequency: "monthly" as const,
      priority: 0.8,
      alternates: { languages: survey },
    },
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
      url: `${base}/pt/quiz`,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: quiz },
    },
    {
      url: `${base}/es/quiz`,
      changeFrequency: "monthly",
      priority: 0.8,
      alternates: { languages: quiz },
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
