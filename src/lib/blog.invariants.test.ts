import { describe, expect, it } from "vitest";
import {
  excerptFrom,
  readingMinutes,
  shortHash,
  slugFor,
  slugKey,
  slugify,
  toBlocks,
} from "@/lib/blog";

describe("slug do artigo", () => {
  it("tira acento, pontuação e maiúscula", () => {
    expect(slugify("Ansiedade & atenção: o sequestro")).toBe("ansiedade-atencao-o-sequestro");
    expect(slugify("¿Cómo dejar de rodar el feed?")).toBe("como-dejar-de-rodar-el-feed");
    expect(slugify("Tolos, inteligentes e sábios")).toBe("tolos-inteligentes-e-sabios");
  });

  it("nunca termina nem começa com hífen", () => {
    for (const t of ["— Dopamina —", "...", "  espaço  ", "###"]) {
      const s = slugify(t);
      expect(s.startsWith("-"), t).toBe(false);
      expect(s.endsWith("-"), t).toBe(false);
    }
  });

  it("o mesmo artigo gera sempre o mesmo endereço", () => {
    const post = { title: "O sequestro da atenção", publishedAt: "2026-07-01T10:00:00.000Z", lang: "br" };
    expect(slugFor(post)).toBe(slugFor({ ...post }));
  });

  it("artigos de mesmo título em datas diferentes não colidem", () => {
    const a = slugFor({ title: "Dopamina", publishedAt: "2026-07-01T10:00:00.000Z", lang: "br" });
    const b = slugFor({ title: "Dopamina", publishedAt: "2026-07-02T10:00:00.000Z", lang: "br" });
    expect(a).not.toBe(b);
  });

  it("o mesmo texto em idiomas diferentes tem endereços diferentes", () => {
    const pub = "2026-07-01T10:00:00.000Z";
    expect(slugFor({ title: "Dopamina", publishedAt: pub, lang: "br" })).not.toBe(
      slugFor({ title: "Dopamina", publishedAt: pub, lang: "es" })
    );
  });

  it("corrigir o título preserva o sufixo — o link antigo continua achando o artigo", () => {
    const pub = "2026-07-01T10:00:00.000Z";
    const antes = slugFor({ title: "O sequestro da atenção", publishedAt: pub, lang: "br" });
    const depois = slugFor({ title: "Como a sua atenção foi sequestrada", publishedAt: pub, lang: "br" });
    expect(antes).not.toBe(depois);
    expect(slugKey(antes)).toBe(slugKey(depois));
  });

  it("acento no título não muda o endereço", () => {
    const pub = "2026-07-01T10:00:00.000Z";
    expect(slugFor({ title: "atenção", publishedAt: pub, lang: "br" })).toBe(
      slugFor({ title: "atencao", publishedAt: pub, lang: "br" })
    );
  });

  it("título vazio ainda produz um endereço válido", () => {
    const s = slugFor({ title: "###", publishedAt: null, lang: "br" });
    expect(s.startsWith("artigo-")).toBe(true);
  });

  it("o hash é estável entre execuções", () => {
    expect(shortHash("br:2026-07-01T10:00:00.000Z")).toBe(shortHash("br:2026-07-01T10:00:00.000Z"));
    expect(shortHash("a")).not.toBe(shortHash("b"));
  });
});

const CORPO = [
  "# O sequestro da atenção",
  "",
  "Você não perdeu o foco. Ele foi **levado** — e há uma engenharia por trás disso.",
  "",
  "## Como funciona",
  "- A notificação chega antes da vontade",
  "- O feed nunca termina",
  "",
  "A saída começa por enxergar o mecanismo.",
  "",
  "#dopamina #atencao",
].join("\n");

describe("corpo do artigo", () => {
  it("vira blocos de título, parágrafo e item", () => {
    const blocks = toBlocks(CORPO, "O sequestro da atenção");
    expect(blocks.map((b) => b.type)).toEqual(["p", "h", "li", "li", "p"]);
    expect(blocks[1]).toEqual({ type: "h", text: "Como funciona" });
  });

  it("descarta o título repetido e as linhas de hashtag", () => {
    const texts = toBlocks(CORPO, "O sequestro da atenção").map((b) => b.text);
    expect(texts).not.toContain("O sequestro da atenção");
    expect(texts.some((t) => t.includes("#dopamina"))).toBe(false);
  });

  it("tira o negrito de markdown do texto", () => {
    const texts = toBlocks(CORPO, "x").map((b) => b.text).join(" ");
    expect(texts).not.toContain("**");
    expect(texts).toContain("levado");
  });

  it("o resumo sai do primeiro parágrafo e cabe na busca", () => {
    const resumo = excerptFrom(CORPO, "O sequestro da atenção");
    expect(resumo.startsWith("Você não perdeu o foco")).toBe(true);
    expect(resumo.length).toBeLessThanOrEqual(156);
  });

  it("resumo longo é cortado em palavra inteira", () => {
    const longo = `${"palavra ".repeat(60)}fim.`;
    const resumo = excerptFrom(longo, "t");
    expect(resumo.endsWith("…")).toBe(true);
    expect(resumo).not.toMatch(/\s…$/);
  });

  it("o tempo de leitura é pelo menos um minuto", () => {
    expect(readingMinutes("curto")).toBe(1);
    expect(readingMinutes("palavra ".repeat(600))).toBe(3);
  });
});
