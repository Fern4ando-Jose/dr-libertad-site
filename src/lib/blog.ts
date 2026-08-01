import { langLegado } from "@/lib/accounts";
import type { SeoLang } from "@/lib/seo";

// Camada de leitura dos artigos publicados.
//
// A automação do Instagram já escreve o artigo INTEIRO na tabela `posts`
// (coluna `body`) toda vez que publica. Até aqui esse texto só existia dentro de
// um modal na home, carregado no navegador depois que a página abria: sem
// endereço próprio, fora do HTML do servidor e, portanto, invisível para o
// Google. Este módulo é o que transforma essas linhas em páginas de verdade.

export type Article = {
  /** Identificador na URL. Ver `slugFor`. */
  slug: string;
  title: string;
  /** Primeiro parágrafo — serve de meta description e de chamada na listagem. */
  excerpt: string;
  /** Texto completo, como veio do banco. */
  body: string;
  tags: string[];
  topic: string;
  lang: SeoLang;
  /** ISO 8601. Null quando o banco não tem a data (registro antigo). */
  publishedAt: string | null;
};

type PostRow = {
  title: string;
  body: string | null;
  instagram_caption: string | null;
  tags: unknown;
  topic: string | null;
  lang: string | null;
  published_at: string | null;
};

// ---------------------------------------------------------------------------
// Slug
// ---------------------------------------------------------------------------

/** Tira acento, pontuação e espaço: "Ansiedade & atenção" -> "ansiedade-atencao". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove os acentos separados pelo NFD
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

/**
 * Hash curto e estável de uma string (djb2 em base 36).
 *
 * Não é criptografia — é só um sufixo curto que separa dois artigos de mesmo
 * título. Precisa ser determinístico: o mesmo artigo tem de gerar sempre o
 * mesmo endereço, ou cada publicação inventaria uma URL nova e o Google
 * recomeçaria do zero.
 */
export function shortHash(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) h = ((h << 5) + h + input.charCodeAt(i)) >>> 0;
  return h.toString(36).slice(0, 6);
}

/**
 * Endereço do artigo: título legível + sufixo estável.
 *
 * A tabela `posts` não tem coluna de slug, e criar uma exigiria migração no
 * banco de produção. O sufixo vem da data de publicação, que não muda — então o
 * endereço sobrevive a uma correção de título (só a parte legível muda, e o
 * artigo continua sendo encontrado pelo sufixo; ver `findBySlug`).
 */
export function slugFor(post: { title: string; publishedAt: string | null; lang: string }): string {
  const base = slugify(post.title) || "artigo";
  return `${base}-${shortHash(`${post.lang}:${post.publishedAt ?? post.title}`)}`;
}

/** O sufixo estável de um slug — a parte que identifica o artigo de verdade. */
export function slugKey(slug: string): string {
  return slug.slice(slug.lastIndexOf("-") + 1);
}

// ---------------------------------------------------------------------------
// Normalização
// ---------------------------------------------------------------------------

function normalizeTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      // Formato de array do Postgres: "{a,b,c}"
      return raw
        .replace(/[{}"]/g, "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/** Linhas de hashtag (#foo #bar) — viram chips de tag, não fazem parte do texto. */
const HASHTAG_LINE = /^(#[\p{L}\p{N}_]+[ \t]*)+$/u;

export type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string };

/**
 * Quebra o corpo em blocos. O texto vem em markdown leve (## título, - item),
 * do jeito que o gerador escreve.
 *
 * O primeiro título é descartado quando repete o título do artigo: na página ele
 * já é o <h1>, e repetir criaria dois títulos iguais em sequência.
 */
export function toBlocks(body: string, title: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    const text = paragraph.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraph = [];
  };

  for (const rawLine of body.split("\n")) {
    const line = rawLine.trim().replace(/\*\*/g, "");
    if (!line) {
      flush();
      continue;
    }
    if (HASHTAG_LINE.test(line)) continue;

    const heading = line.match(/^#{1,4}\s+(.*)/);
    if (heading) {
      flush();
      const text = heading[1].trim();
      if (text && text.toUpperCase() !== title.toUpperCase()) blocks.push({ type: "h", text });
      continue;
    }

    const item = line.match(/^[-*•]\s+(.*)/);
    if (item) {
      flush();
      const text = item[1].trim();
      if (text) blocks.push({ type: "li", text });
      continue;
    }

    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Primeiro parágrafo, cortado no limite que o Google mostra na busca. */
export function excerptFrom(body: string, title: string, limit = 155): string {
  const first = toBlocks(body, title).find((b) => b.type === "p");
  const text = first?.text ?? "";
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" ")).trimEnd()}…`;
}

/** Estimativa de tempo de leitura, em minutos (200 palavras/min). */
export function readingMinutes(body: string): number {
  return Math.max(1, Math.round(body.trim().split(/\s+/).length / 200));
}

/**
 * Tamanho mínimo do corpo para o texto virar página.
 *
 * Sem isto, uma legenda de duas linhas viraria uma página quase vazia — e é
 * exatamente o "conteúdo raso" que o Google penaliza, arrastando junto a
 * reputação das páginas boas do mesmo site. Melhor não existir.
 */
export const ARTICLE_MIN_BODY = 200;

function toArticle(row: PostRow, lang: SeoLang): Article | null {
  const title = (row.title ?? "").trim();
  const body = (row.body ?? "").trim();
  if (!title || body.length < ARTICLE_MIN_BODY) return null;

  const publishedAt = row.published_at ? new Date(row.published_at).toISOString() : null;
  return {
    slug: slugFor({ title, publishedAt, lang }),
    title,
    excerpt: excerptFrom(body, title),
    body,
    tags: normalizeTags(row.tags),
    topic: row.topic ?? "geral",
    lang,
    publishedAt,
  };
}

// ---------------------------------------------------------------------------
// Banco
// ---------------------------------------------------------------------------

/**
 * Artigos publicados naquele idioma, do mais novo para o mais antigo.
 *
 * Fail-open: sem banco (build local, preview sem env) devolve lista vazia em vez
 * de derrubar a página. O blog some, o resto do site continua de pé.
 */
export async function listArticles(lang: SeoLang, limit = 200): Promise<Article[]> {
  let rows: PostRow[] = [];
  try {
    const { sql } = await import("@vercel/postgres");
    // `lang IN (atual, legado)`: linhas gravadas antes de 29/07/2026 usam "pt".
    const result = await sql<PostRow>`
      SELECT title, body, instagram_caption, tags, topic, lang, published_at
      FROM posts
      WHERE lang IN (${lang}, ${langLegado(lang)})
      ORDER BY published_at DESC
      LIMIT ${limit}
    `;
    rows = result.rows;
  } catch {
    return [];
  }

  const articles: Article[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const article = toArticle(row, lang);
    // Republicação do mesmo texto não vira duas páginas: conteúdo duplicado
    // dentro do próprio site faz as duas competirem e nenhuma ganhar.
    if (article && !seen.has(article.slug)) {
      seen.add(article.slug);
      articles.push(article);
    }
  }
  return articles;
}

/**
 * Um artigo pelo slug. Casa pelo sufixo estável, e não pela string inteira, para
 * que um link antigo continue funcionando depois de o título ser corrigido.
 */
export async function findBySlug(lang: SeoLang, slug: string): Promise<Article | null> {
  const key = slugKey(slug);
  const articles = await listArticles(lang);
  return articles.find((a) => a.slug === slug) ?? articles.find((a) => slugKey(a.slug) === key) ?? null;
}
