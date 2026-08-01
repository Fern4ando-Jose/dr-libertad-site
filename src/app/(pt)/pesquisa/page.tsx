// /pesquisa — pesquisa "Redes Sociais e Relacionamentos" (PT).
// Rota fixa fora do prefixo de idioma (como /insights e /admin) — o link da bio
// do @dr.liberdade.br aponta direto para cá. Espelho ES: /investigacion.

import type { Metadata } from "next";
import SurveyExperience from "@/components/survey/SurveyExperience";
import MetaPixel from "@/components/survey/MetaPixel";
import { surveyContent } from "@/components/survey/survey.content";

const SITE_URL = "https://www.drlibertad.com";
const c = surveyContent.br;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/pesquisa`,
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
    url: `${SITE_URL}/pesquisa`,
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: c.metaTitle, description: c.metaDescription },
};

export default function PesquisaPage() {
  return (
    <>
      <MetaPixel />
      <SurveyExperience lang="br" />
    </>
  );
}
