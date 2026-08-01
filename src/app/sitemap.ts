import type { MetadataRoute } from "next";
import { BOOKS } from "@/lib/books";
import { ROUTES, SEO_LANGS, abs, hreflang, type IndexableRoute } from "@/lib/seo";

// O sitemap NÃO repete a lista de páginas: ele deriva de src/lib/seo.ts (ROUTES)
// e do registro de livros. A lista escrita à mão que existia aqui tinha ficado
// para trás — faltavam /livros, /autor, /dopamina, /guia-7-dias e /creditos nos
// dois idiomas, ou seja, metade do site nunca era oferecida ao Google.

// Data de referência do conteúdo. `lastModified` sem valor real é ruído: o Google
// desconta sitemaps que carimbam "hoje" em tudo a cada deploy. Aqui vale a data do
// build, que é quando o conteúdo estático de fato pode ter mudado.
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

export default function sitemap(): MetadataRoute.Sitemap {
  // Uma página por livro, em cada idioma — inclusive os que saíram da vitrine
  // (hidden), que seguem com página no ar e vendendo por link direto.
  const bookRoutes: IndexableRoute[] = BOOKS.map((book) => ({
    paths: { br: `/br/livros/${book.slug}`, es: `/es/livros/${book.slug}` },
    priority: 0.9,
    changeFrequency: "weekly",
  }));

  return [...ROUTES, ...bookRoutes].flatMap(entriesFor);
}
