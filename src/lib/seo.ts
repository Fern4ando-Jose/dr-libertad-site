// Fonte única do que o buscador precisa saber sobre as rotas do site.
//
// Antes cada página repetia SITE_URL, montava o seu bloco de hreflang na mão e o
// sitemap trazia uma lista escrita à parte — que envelheceu: /livros, /autor,
// /dopamina e /guia-7-dias existiam no site e não constavam no sitemap. Aqui as
// rotas ficam declaradas UMA vez (ROUTES) e tanto o sitemap quanto as páginas
// bebem da mesma fonte, então uma página nova entra no índice por construção.

export const SITE_URL = "https://www.drlibertad.com";

export const SEO_LANGS = ["br", "es"] as const;
export type SeoLang = (typeof SEO_LANGS)[number];

/** Nome da marca por idioma (ordem do dono, 29/07/2026: PT-BR é "Dr. Liberdade"). */
export const brandFor = (l: SeoLang) => (l === "es" ? "Dr. Libertad" : "Dr. Liberdade");

/** Locale no formato do Open Graph (og:locale). */
export const ogLocaleFor = (l: SeoLang) => (l === "es" ? "es_ES" : "pt_BR");

/** Código BCP-47 para o atributo lang do <html>. */
export const htmlLangFor = (l: SeoLang) => (l === "es" ? "es-ES" : "pt-BR");

/** Normaliza o segmento de rota (qualquer coisa que não seja "es" cai no padrão BR). */
export const toLang = (raw: string | undefined): SeoLang => (raw === "es" ? "es" : "br");

/** Caminho relativo -> URL absoluta. */
export const abs = (path: string) => `${SITE_URL}${path}`;

/**
 * Bloco de hreflang a partir do caminho de cada idioma. x-default aponta para o
 * BR, que é o idioma padrão do proxy quando o Accept-Language não diz nada.
 */
export function hreflang(paths: Record<SeoLang, string>) {
  return {
    "pt-BR": abs(paths.br),
    "es-ES": abs(paths.es),
    "x-default": abs(paths.br),
  };
}

/** Atalho para as rotas que vivem sob o prefixo de idioma (/br/... e /es/...). */
export const hreflangPrefixed = (suffix = "") =>
  hreflang({ br: `/br${suffix}`, es: `/es${suffix}` });

/**
 * `alternates` completo (canonical + hreflang) de uma rota sob prefixo de idioma.
 * O canonical é SEMPRE o da própria página: sem ele o Next herda o canonical do
 * layout pai, e a página passa a se declarar cópia da home.
 */
export const alternatesPrefixed = (l: SeoLang, suffix = "") => ({
  canonical: abs(`/${l}${suffix}`),
  languages: hreflangPrefixed(suffix),
});

/** `alternates` de uma rota de caminho fixo por idioma (ex.: /o-estudo e /el-estudio). */
export const alternatesFixed = (l: SeoLang, paths: Record<SeoLang, string>) => ({
  canonical: abs(paths[l]),
  languages: hreflang(paths),
});

// ---------------------------------------------------------------------------
// Registro de rotas indexáveis
// ---------------------------------------------------------------------------

export type IndexableRoute = {
  /** Caminho por idioma. */
  paths: Record<SeoLang, string>;
  priority: number;
  changeFrequency: "daily" | "weekly" | "monthly" | "yearly";
};

/**
 * Toda rota pública que deve estar no sitemap. Páginas de agradecimento, painéis
 * (/admin, /insights) e a API ficam de fora de propósito — ver robots.ts.
 */
export const ROUTES: IndexableRoute[] = [
  // Prefixadas por idioma
  { paths: { br: "/br", es: "/es" }, priority: 1, changeFrequency: "daily" },
  { paths: { br: "/br/blog", es: "/es/blog" }, priority: 0.9, changeFrequency: "daily" },
  { paths: { br: "/br/livros", es: "/es/livros" }, priority: 0.9, changeFrequency: "weekly" },
  { paths: { br: "/br/dopamina", es: "/es/dopamina" }, priority: 0.9, changeFrequency: "weekly" },
  { paths: { br: "/br/autor", es: "/es/autor" }, priority: 0.8, changeFrequency: "monthly" },
  { paths: { br: "/br/quiz", es: "/es/quiz" }, priority: 0.8, changeFrequency: "monthly" },
  {
    paths: { br: "/br/guia-7-dias", es: "/es/guia-7-dias" },
    priority: 0.8,
    changeFrequency: "monthly",
  },
  { paths: { br: "/br/creditos", es: "/es/creditos" }, priority: 0.3, changeFrequency: "yearly" },
  {
    paths: { br: "/br/privacidade", es: "/es/privacidade" },
    priority: 0.3,
    changeFrequency: "yearly",
  },
  { paths: { br: "/br/termos", es: "/es/termos" }, priority: 0.3, changeFrequency: "yearly" },

  // Caminho fixo por idioma (fora do prefixo; ver src/proxy.ts)
  { paths: { br: "/pesquisa", es: "/investigacion" }, priority: 0.8, changeFrequency: "monthly" },
  { paths: { br: "/o-estudo", es: "/el-estudio" }, priority: 0.7, changeFrequency: "monthly" },
];
