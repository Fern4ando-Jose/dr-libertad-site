// Trava do FECHO FALADO — o que a voz pode e o que NÃO pode dizer no fim do Reel.
//
// Histórico, na ordem em que doeu:
//  · 26/07 — a voz passou a pedir o MESMO que a tela e, com o funil ligado, dizia
//    "Comenta LIBERTAD... al Direct".
//  · 29/07 de manhã — o dono OUVIU o Reel ES: «Direct» (palavra emprestada do inglês) e a
//    própria palavra-chave «LIBERTAD» saíam com sotaque estrangeiro na voz MiniMax. Mandou
//    tirar o trecho da narração.
//  · 29/07 à noite — aprovou um fecho no BR SEM @handle e SEM a palavra-chave, e disse:
//    "no Doutor Liberdade a gente TINHA QUE FAZER, mas a voz espanhola está embolando...
//    coloca no BR". O ES ficou mudo no fim.
//  · 10/08 — o dono ouviu o resultado disso: "áudio no IG ES está truncado". Medido nos
//    Reels no ar: a voz para aos 18,4 s de um vídeo de 27,2 s (e aos 12,8 s de um de 21,5 s)
//    — 8,6 s finais só com música. O ES ganhou fecho, com as palavras que embolavam FORA.
//
// ⚠️ Este teste importa a função REAL (`src/lib/roteiro-falado.ts`). Até 10/08 ele tinha
// uma CÓPIA da montagem ("espelha publish/route.ts") e por isso ficou verde enquanto a
// rota mudava — teste que confere a si mesmo não trava nada.
import { describe, it, expect } from "vitest";
import { FECHO_FALADO, blocosFalados, roteiroFalado } from "./roteiro-falado";

const PALAVRAS_QUE_EMBOLAM = ["direct", "libertad", "liberdade", "sígueme", "@"];

describe("fecho falado — as palavras que a voz embolava ficam FORA (defeito real 29/07)", () => {
  for (const lang of ["es", "br"] as const) {
    it(`${lang}: o roteiro não contém nenhuma das palavras que o dono reprovou`, () => {
      const r = roteiroFalado(
        "Título de teste",
        ["primeiro insight", "segundo insight"],
        lang,
        "Pergunta do dia?",
      );
      const baixo = r.toLowerCase();
      for (const p of PALAVRAS_QUE_EMBOLAM) expect(baixo).not.toContain(p);
    });

    it(`${lang}: a frase do fecho, sozinha, também está limpa`, () => {
      const baixo = FECHO_FALADO[lang].toLowerCase();
      for (const p of PALAVRAS_QUE_EMBOLAM) expect(baixo).not.toContain(p);
    });
  }
});

describe("fecho falado — a voz vai até o fim nos DOIS idiomas (queixa de 10/08)", () => {
  for (const lang of ["es", "br"] as const) {
    it(`${lang}: o roteiro TERMINA no fecho da marca, e não no último insight`, () => {
      const r = roteiroFalado("Título", ["insight"], lang, "Você acha que escolhe?");
      expect(r.endsWith(FECHO_FALADO[lang])).toBe(true);
      expect(r).toContain("Você acha que escolhe?");
    });

    it(`${lang}: são n+2 blocos (capa + insights + fecho) — é o que o render espera`, () => {
      const slides = ["um", "dois"];
      expect(blocosFalados("Título", slides, lang, "Pergunta?")).toHaveLength(slides.length + 2);
    });
  }

  it("idioma sem fecho declarado cai em n+1 e não quebra (degrada, não estoura)", () => {
    expect(blocosFalados("Título", ["um", "dois"], "fr", "Pergunta?")).toHaveLength(3);
  });

  it("sem cta, o fecho ainda é falado — o silêncio do fim é o defeito, não o cta", () => {
    const r = roteiroFalado("Título", ["insight"], "es", "");
    expect(r.endsWith(FECHO_FALADO.es)).toBe(true);
  });
});

describe("fecho falado — cada bloco termina em ponto (a voz precisa da pausa)", () => {
  it("bloco sem pontuação ganha ponto final; com pontuação fica intacto", () => {
    const b = blocosFalados("Sem ponto", ["Com interrogação?", "Sem nada"], "es", "");
    expect(b[0]).toBe("Sem ponto.");
    expect(b[1]).toBe("Com interrogação?");
    expect(b[2]).toBe("Sem nada.");
  });
});
