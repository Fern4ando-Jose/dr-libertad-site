// /investigacion/gracias — agradecimiento ES + CTA seguir a @dr.libertad.
// Dispara el evento "pesquisa_enviada" en el Meta Pixel CUANDO exista la env
// NEXT_PUBLIC_META_PIXEL_ID (ver components/survey/MetaPixel.tsx).

import type { Metadata } from "next";
import ThanksView from "@/components/survey/ThanksView";
import { surveyContent } from "@/components/survey/survey.content";

const c = surveyContent.es;

export const metadata: Metadata = {
  title: c.thanks.metaTitle,
  description: c.thanks.body,
  robots: { index: false, follow: false },
};

export default function GraciasPage() {
  return <ThanksView lang="es" />;
}
