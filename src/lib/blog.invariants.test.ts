import { describe, expect, it } from "vitest";
import {
  chaveDeConteudo,
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

// Achado no banco de produção em 01/08/2026: dos 186 artigos reais, um par era
// o MESMO texto gravado duas vezes — "O amor que morre de tédio", 24/06 e
// 25/06, corpo idêntico ao caractere. O filtro de repetição do listArticles
// não pegava, porque comparava SLUGS, e o slug carrega o hash da data: datas
// diferentes, endereços diferentes, as duas cópias passavam. Iam virar duas
// páginas iguais competindo entre si — exatamente o que o filtro existia para
// impedir.
describe("mesma matéria republicada não vira duas páginas", () => {
  const artigo = (title: string, body: string) => ({ title, body });

  it("reconhece o mesmo texto em publicações de datas diferentes", () => {
    const corpo = "O tédio não mata o amor. O que mata é fugir dele.";
    expect(chaveDeConteudo(artigo("O amor que morre de tédio", corpo))).toBe(
      chaveDeConteudo(artigo("O amor que morre de tédio", corpo))
    );
  });

  it("ignora diferença de espaço e de caixa — é formatação, não conteúdo", () => {
    expect(chaveDeConteudo(artigo("Dopamina", "O  texto\n\ncom  espaços."))).toBe(
      chaveDeConteudo(artigo("DOPAMINA", "o texto com espaços."))
    );
  });

  it("textos diferentes sob o mesmo título continuam sendo dois artigos", () => {
    // O caso real: "Ninguém te deve nada" saiu duas vezes com textos distintos
    // (24/06 e 08/07). São duas matérias, e as duas devem ter página.
    expect(chaveDeConteudo(artigo("Ninguém te deve nada", "Primeira versão."))).not.toBe(
      chaveDeConteudo(artigo("Ninguém te deve nada", "Segunda versão, reescrita."))
    );
  });

  it("o mesmo corpo sob títulos diferentes também são artigos distintos", () => {
    const corpo = "Mesmo texto, chamadas diferentes.";
    expect(chaveDeConteudo(artigo("Título A", corpo))).not.toBe(
      chaveDeConteudo(artigo("Título B", corpo))
    );
  });

  it("a chave NÃO depende da data — era esse o furo do filtro por slug", () => {
    const post = { title: "O amor que morre de tédio", lang: "br" };
    const slugA = slugFor({ ...post, publishedAt: "2026-06-24T10:00:00.000Z" });
    const slugB = slugFor({ ...post, publishedAt: "2026-06-25T10:00:00.000Z" });
    expect(slugA).not.toBe(slugB); // dois endereços — por isso o slug não servia
    const corpo = "Mesmo corpo nas duas linhas do banco.";
    expect(chaveDeConteudo(artigo(post.title, corpo))).toBe(
      chaveDeConteudo(artigo(post.title, corpo))
    ); // uma chave só — é o que o filtro passa a usar
  });
});
