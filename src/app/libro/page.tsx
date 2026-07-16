// /libro — página del libro "Redes Sociales y Relaciones" (ES).
// Capa por DETRÁS de la investigación (PLANO-PAGINA-LIVRO.md). Espelho PT: /livro.

import type { Metadata } from "next";
import LivroView from "@/components/survey/LivroView";
import { surveyContent } from "@/components/survey/survey.content";

const SITE_URL = "https://www.drlibertad.com";
const c = surveyContent.es;

export const metadata: Metadata = {
  title: c.livro.metaTitle,
  description: c.livro.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/libro`,
    languages: {
      "pt-BR": `${SITE_URL}/livro`,
      "es-ES": `${SITE_URL}/libro`,
      "x-default": `${SITE_URL}/livro`,
    },
  },
  openGraph: {
    type: "website",
    siteName: c.brand,
    title: c.livro.metaTitle,
    description: c.livro.metaDescription,
    url: `${SITE_URL}/libro`,
    locale: "es_ES",
  },
  twitter: { card: "summary_large_image", title: c.livro.metaTitle, description: c.livro.metaDescription },
};

export default function LibroPage() {
  return <LivroView lang="es" />;
}
