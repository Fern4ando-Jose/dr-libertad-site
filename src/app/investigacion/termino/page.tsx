// /investigacion/termino — término de consentimiento (§1) íntegro, ES.

import type { Metadata } from "next";
import TermoView from "@/components/survey/TermoView";
import { surveyContent } from "@/components/survey/survey.content";

const SITE_URL = "https://www.drlibertad.com";
const c = surveyContent.es;

export const metadata: Metadata = {
  title: c.termo.metaTitle,
  description: c.termo.intro,
  alternates: {
    canonical: `${SITE_URL}/investigacion/termino`,
    languages: {
      "pt-BR": `${SITE_URL}/pesquisa/termo`,
      "es-ES": `${SITE_URL}/investigacion/termino`,
      "x-default": `${SITE_URL}/pesquisa/termo`,
    },
  },
  robots: { index: false, follow: true },
};

export default function TerminoPage() {
  return <TermoView lang="es" />;
}
