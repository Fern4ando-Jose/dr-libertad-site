// /terms — Termos de Uso em INGLÊS. Rota fixa fora do prefixo de idioma (como
// /o-estudo · /el-estudio), porque o i18n do site só conhece pt|es e esta página
// existe para um leitor que não fala nenhum dos dois: o revisor do painel de
// developers do TikTok, que exige uma Terms of Service URL e lê em inglês.
// Espelhos: /pt/termos · /es/termos.

import type { Metadata } from "next";
import TermsView from "@/components/terms/TermsView";
import { termsContent, TERMS_PATH } from "@/components/terms/terms.content";
import HtmlLangEn from "./HtmlLangEn";

const SITE_URL = "https://www.drlibertad.com";
const c = termsContent.en;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: {
    canonical: `${SITE_URL}${TERMS_PATH.en}`,
    languages: {
      "pt-BR": `${SITE_URL}${TERMS_PATH.pt}`,
      "es-ES": `${SITE_URL}${TERMS_PATH.es}`,
      "en-US": `${SITE_URL}${TERMS_PATH.en}`,
      "x-default": `${SITE_URL}${TERMS_PATH.pt}`,
    },
  },
  openGraph: {
    type: "article",
    siteName: c.brand,
    title: c.metaTitle,
    description: c.metaDescription,
    url: `${SITE_URL}${TERMS_PATH.en}`,
    locale: c.ogLocale,
  },
};

export default function Page() {
  return (
    <>
      <HtmlLangEn />
      <TermsView copy={c} />
    </>
  );
}
