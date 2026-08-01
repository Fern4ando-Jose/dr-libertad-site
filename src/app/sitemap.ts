import type { MetadataRoute } from "next";
import { BOOKS } from "@/lib/books";
import { listArticles } from "@/lib/blog";
import { ROUTES, SEO_LANGS, abs, hreflang, type IndexableRoute } from "@/lib/seo";

// O sitemap NÃO repete a lista de páginas: ele deriva de src/lib/seo.ts (ROUTES),
// do registro de livros e dos artigos publicados. A lista escrita à mão que
// existia aqui tinha ficado para trás — faltavam /livros, /autor, /dopamina,
// /guia-7-dias e /creditos nos dois idiomas, ou seja, metade do site.

// Revalida de hora em hora, como o resto do blog: artigo novo entra no sitemap
// sozinho, sem esperar deploy. É o que o Google usa para saber que há algo novo.
export const revalidate = 3600;

// Data de referência do conteúdo estático. `lastModified` sem valor real é ruído:
// o Google desconta sitemaps que carimbam "hoje" em tudo a cada deploy. Aqui vale
// a data do build, que é quando esse conteúdo de fato pode ter mudado. Os artigos
// não usam isto — cada um carrega a sua própria data de publicação.
const BUILD_DATE = new Date();

function entriesFor(route: IndexableRoute): MetadataRoute.Sitemap {
  const languages = hreflang(route.paths);
  // Uma entrada por idioma, cada uma declarando todas as alternativas: é assim
  // que o Google casa as duas versões em vez de tratá-las como duplicatas.
  return SEO_LANGS.map((l) => ({
    url: abs(route.paths[l]),
    lastModified: BUILD_DATE,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
    alternates: { languages },
  }));
}

/**
 * Os artigos entram SEM bloco de hreflang: as versões PT e ES de um texto são
 * linhas separadas no banco, sem nada que as ligue. Parear no chute seria pior
 * que não parear.
 */
async function articleEntries(): Promise<MetadataRoute.Sitemap> {
  const byLang = await Promise.all(SEO_LANGS.map((l) => listArticles(l)));
  return byLang.flat().map((article) => ({
    url: abs(`/${article.lang}/blog/${article.slug}`),
    lastModified: article.publishedAt ? new Date(article.publishedAt) : BUILD_DATE,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Uma página por livro, em cada idioma — inclusive os que saíram da vitrine
  // (hidden), que seguem com página no ar e vendendo por link direto.
  const bookRoutes: IndexableRoute[] = BOOKS.map((book) => ({
    paths: { br: `/br/livros/${book.slug}`, es: `/es/livros/${book.slug}` },
    priority: 0.9,
    changeFrequency: "weekly",
  }));

  return [...[...ROUTES, ...bookRoutes].flatMap(entriesFor), ...(await articleEntries())];
}
