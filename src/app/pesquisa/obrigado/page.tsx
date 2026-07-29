// /pesquisa/obrigado — agradecimento PT + CTA seguir @dr.liberdade.br.
// Dispara o evento "pesquisa_enviada" no Meta Pixel QUANDO a env
// NEXT_PUBLIC_META_PIXEL_ID existir (ver components/survey/MetaPixel.tsx).

import type { Metadata } from "next";
import ThanksView from "@/components/survey/ThanksView";
import { surveyContent } from "@/components/survey/survey.content";

const c = surveyContent.br;

export const metadata: Metadata = {
  title: c.thanks.metaTitle,
  description: c.thanks.body,
  robots: { index: false, follow: false },
};

export default function ObrigadoPage() {
  return <ThanksView lang="br" />;
}
