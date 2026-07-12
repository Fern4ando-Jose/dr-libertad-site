// /pesquisa/termo — termo de consentimento (§1) na íntegra, PT.

import type { Metadata } from "next";
import TermoView from "@/components/survey/TermoView";
import { surveyContent } from "@/components/survey/survey.content";

const SITE_URL = "https://www.drlibertad.com";
const c = surveyContent.pt;

export const metadata: Metadata = {
  title: c.termo.metaTitle,
  description: c.termo.intro,
  alternates: {
    canonical: `${SITE_URL}/pesquisa/termo`,
    languages: {
      "pt-BR": `${SITE_URL}/pesquisa/termo`,
      "es-ES": `${SITE_URL}/investigacion/termino`,
      "x-default": `${SITE_URL}/pesquisa/termo`,
    },
  },
  robots: { index: false, follow: true },
};

export default function TermoPage() {
  return <TermoView lang="pt" />;
}
