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

  const terms = {
    "pt-BR": `${base}/pt/termos`,
    "es-ES": `${base}/es/termos`,
    "x-default": `${base}/pt/termos`,
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

  // Página institucional do estudo — rotas fixas por idioma.
  const estudo = {
    "pt-BR": `${base}/o-estudo`,
    "es-ES": `${base}/el-estudio`,
    "x-default": `${base}/o-estudo`,
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
      url: `${base}/o-estudo`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages: estudo },
    },
    {
      url: `${base}/el-estudio`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
      alternates: { languages: estudo },
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
    {
      url: `${base}/pt/termos`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: { languages: terms },
    },
    {
      url: `${base}/es/termos`,
      changeFrequency: "yearly",
      priority: 0.3,
      alternates: { languages: terms },
    },
  ];
}
