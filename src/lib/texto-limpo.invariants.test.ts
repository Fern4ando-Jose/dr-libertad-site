// Trava dos caracteres INVISÍVEIS — o defeito que só o ouvido pega.
//
// Caso REAL (Reel ES nº 362, 10/08/2026): o redator escreveu «qué buscas» com um hífen
// suave (U+00AD) entre "busca" e "s". Na tela: invisível. Na voz: a palavra quebrou, e a
// transcrição do próprio áudio publicado — guardada em `narration_cache.words` — registrou
// «qué busca H». O dono ouviu e disse que não fazia sentido nenhum.
import { describe, it, expect } from "vitest";
import { limparInvisiveis, temInvisivel } from "./texto-limpo";
import { normalizeContentJson } from "./content-json";

const SOFT_HYPHEN = "\u00AD"; // o caractere do caso real
const FRASE_REAL = `Revisas el móvil sin saber qué busca${SOFT_HYPHEN}s.`;

describe("invisíveis — o caso que foi ao ar", () => {
  it("o hífen suave sai e a palavra volta a ser uma só", () => {
    expect(limparInvisiveis(FRASE_REAL)).toBe("Revisas el móvil sin saber qué buscas.");
    expect(limparInvisiveis(FRASE_REAL)).not.toContain(SOFT_HYPHEN);
  });

  it("a limpeza chega ao conteúdo do redator inteiro (título, slides, cta, legenda, voz)", () => {
    const c = normalizeContentJson({
      postTitle: `¿Qué busca${SOFT_HYPHEN} quien se vende?`,
      postBody: `texto\u200B com largura zero`,
      slides: [FRASE_REAL, `segundo\uFEFF insight`],
      cta: `Manda\u2060 esto`,
      instagramCaption: `legenda\u200D`,
      tags: [`#uma\u200Btag`],
      narration: FRASE_REAL,
    });
    const tudo = [c.postTitle, c.postBody, ...c.slides, c.cta, c.instagramCaption, ...c.tags, c.narration ?? ""];
    for (const t of tudo) expect(temInvisivel(t)).toBe(false);
    expect(c.slides[0]).toBe("Revisas el móvil sin saber qué buscas.");
  });
});

describe("invisíveis — a limpeza não pode estragar texto bom", () => {
  it("acento, ¿¡, travessão, emoji e hífen DE VERDADE ficam intactos", () => {
    const bom = "¿Qué? — la señal está aí: não-linear, 100% 🧠 «incómodas»";
    expect(limparInvisiveis(bom)).toBe(bom);
    expect(temInvisivel(bom)).toBe(false);
  });

  it("espaço-duro vira espaço NORMAL — apagá-lo colaria duas palavras", () => {
    expect(limparInvisiveis("duas\u00A0palavras")).toBe("duas palavras");
    expect(limparInvisiveis("três\u2009mil")).toBe("três mil"); // espaço fino
  });

  it("vazio e não-texto não estouram", () => {
    expect(limparInvisiveis("")).toBe("");
    expect(limparInvisiveis(undefined as unknown as string)).toBe("");
    expect(temInvisivel(null as unknown as string)).toBe(false);
  });
});

describe("invisíveis — o detector responde igual quando perguntado duas vezes", () => {
  it("expressão global não guarda posição entre chamadas (o bug clássico do /g)", () => {
    for (let i = 0; i < 6; i++) expect(temInvisivel(FRASE_REAL)).toBe(true);
    for (let i = 0; i < 6; i++) expect(temInvisivel("texto limpo")).toBe(false);
  });
});
