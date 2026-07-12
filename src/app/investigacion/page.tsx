// /investigacion — investigación "Redes Sociales y Relaciones" (ES).
// Ruta fija fuera del prefijo de idioma — el link de la bio del @dr.libertad
// apunta directo aquí. Espelho PT: /pesquisa.

import type { Metadata } from "next";
import SurveyExperience from "@/components/survey/SurveyExperience";
import MetaPixel from "@/components/survey/MetaPixel";
import { surveyContent } from "@/components/survey/survey.content";

const SITE_URL = "https://www.drlibertad.com";
const c = surveyContent.es;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/investigacion`,
    languages: {
      "pt-BR": `${SITE_URL}/pesquisa`,
      "es-ES": `${SITE_URL}/investigacion`,
      "x-default": `${SITE_URL}/pesquisa`,
    },
  },
  openGraph: {
    type: "website",
    siteName: c.brand,
    title: c.metaTitle,
    description: c.metaDescription,
    url: `${SITE_URL}/investigacion`,
    locale: "es_ES",
  },
  twitter: { card: "summary_large_image", title: c.metaTitle, description: c.metaDescription },
};

export default function InvestigacionPage() {
  return (
    <>
      <MetaPixel />
      <SurveyExperience lang="es" />
    </>
  );
}
