import { describe, expect, it } from "vitest";
import { ARTICLE_MIN_BODY, slugFor } from "@/lib/blog";

// O endereço do artigo é calculado em DOIS lugares: em lib/blog.ts (que monta as
// páginas e o sitemap) e em api/posts (que dá o link ao card da home). Se as
// regras saírem de sincronia, o card da home passa a apontar para 404 — e um
// link quebrado partindo da página mais visitada é o pior lugar para ter um.
//
// Este teste replica a decisão do lado da API e confere que ela concorda com o
// lado das páginas nos casos de borda.

/** Espelho de `articleHref` em src/app/api/posts/route.ts. */
function apiHref(
  db: { title: string; body: string; published_at: string | null; lang: string } | undefined,
  lang: "br" | "es"
): string | null {
  if (!db) return null;
  const rowLang = db.lang === "br" || db.lang === "pt" ? "br" : "es";
  if (rowLang !== lang) return null;
  if (!db.title?.trim() || (db.body ?? "").trim().length < ARTICLE_MIN_BODY) return null;
  const publishedAt = db.published_at ? new Date(db.published_at).toISOString() : null;
  return `/${lang}/blog/${slugFor({ title: db.title.trim(), publishedAt, lang })}`;
}

/** Espelho de `toArticle` em src/lib/blog.ts. */
function pageSlug(
  row: { title: string; body: string; published_at: string | null },
  lang: "br" | "es"
): string | null {
  const title = row.title.trim();
  const body = row.body.trim();
  if (!title || body.length < ARTICLE_MIN_BODY) return null;
  const publishedAt = row.published_at ? new Date(row.published_at).toISOString() : null;
  return slugFor({ title, publishedAt, lang });
}

const CORPO_LONGO = "a".repeat(ARTICLE_MIN_BODY + 10);
const CORPO_CURTO = "a".repeat(ARTICLE_MIN_BODY - 1);

describe("link do card x página do artigo", () => {
  it("artigo publicável: o card aponta exatamente para o endereço da página", () => {
    const row = {
      title: "O sequestro da atenção",
      body: CORPO_LONGO,
      published_at: "2026-07-01T10:00:00.000Z",
      lang: "br",
    };
    expect(apiHref(row, "br")).toBe(`/br/blog/${pageSlug(row, "br")}`);
  });

  it("corpo curto demais: nenhum dos dois lados cria página", () => {
    const row = { title: "Nota rápida", body: CORPO_CURTO, published_at: null, lang: "br" };
    expect(apiHref(row, "br")).toBeNull();
    expect(pageSlug(row, "br")).toBeNull();
  });

  it("sem título: nenhum dos dois lados cria página", () => {
    const row = { title: "   ", body: CORPO_LONGO, published_at: null, lang: "br" };
    expect(apiHref(row, "br")).toBeNull();
    expect(pageSlug(row, "br")).toBeNull();
  });

  it("post de outro idioma não vira link — a listagem daquele idioma não o traria", () => {
    const row = { title: "Dopamina", body: CORPO_LONGO, published_at: null, lang: "es" };
    expect(apiHref(row, "br")).toBeNull();
    expect(apiHref(row, "es")).not.toBeNull();
  });

  it('linha antiga gravada como "pt" conta como BR', () => {
    const row = {
      title: "Texto antigo",
      body: CORPO_LONGO,
      published_at: "2026-06-01T10:00:00.000Z",
      lang: "pt",
    };
    expect(apiHref(row, "br")).toBe(`/br/blog/${pageSlug(row, "br")}`);
    expect(apiHref(row, "es")).toBeNull();
  });

  it("post sem registro no banco não vira link", () => {
    expect(apiHref(undefined, "br")).toBeNull();
  });
});
