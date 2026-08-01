// /o-estudo — página institucional da pesquisa "Redes Sociais e Relacionamentos" (PT).
// Rota fixa fora do prefixo de idioma (como /pesquisa) — explica o projeto e leva
// ao funil /pesquisa. Espelho ES: /el-estudio.

import type { Metadata } from "next";
import EstudoPage from "@/components/estudo/EstudoPage";
import { estudoContent } from "@/components/estudo/estudo.content";

const SITE_URL = "https://www.drlibertad.com";
const c = estudoContent.br;

export const metadata: Metadata = {
  title: c.metaTitle,
  description: c.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/o-estudo`,
    languages: {
      "pt-BR": `${SITE_URL}/o-estudo`,
      "es-ES": `${SITE_URL}/el-estudio`,
      "x-default": `${SITE_URL}/o-estudo`,
    },
  },
  openGraph: {
    type: "website",
    siteName: c.brand,
    title: c.metaTitle,
    description: c.metaDescription,
    url: `${SITE_URL}/o-estudo`,
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: c.metaTitle, description: c.metaDescription },
};

export default function Page() {
  return <EstudoPage lang="br" />;
}
