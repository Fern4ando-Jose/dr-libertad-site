// /livro — página do livro "Redes Sociais e Relacionamentos" (PT).
// Camada por TRÁS da pesquisa (PLANO-PAGINA-LIVRO.md): nenhum anúncio/bio
// aponta para cá enquanto o campo estiver aberto — chega-se pelo obrigado.
// Rota fixa fora do prefixo de idioma (matcher do proxy). Espelho ES: /libro.
// ⚠️ Nota: /livro (sem prefixo) redirecionava via middleware para /pt/livro
// (redirect legado → /pt/livros/100-plantas); agora serve ESTA página.

import type { Metadata } from "next";
import LivroView from "@/components/survey/LivroView";
import { surveyContent } from "@/components/survey/survey.content";

const SITE_URL = "https://www.drlibertad.com";
const c = surveyContent.pt;

export const metadata: Metadata = {
  title: c.livro.metaTitle,
  description: c.livro.metaDescription,
  alternates: {
    canonical: `${SITE_URL}/livro`,
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
    url: `${SITE_URL}/livro`,
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image", title: c.livro.metaTitle, description: c.livro.metaDescription },
};

export default function LivroPage() {
  return <LivroView lang="pt" />;
}
