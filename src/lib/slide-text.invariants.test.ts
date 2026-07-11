import { describe, it, expect } from "vitest";
import { clipSlideText } from "./slide-text";

// Invariantes da trava de texto de slide ("nunca cortar no meio da palavra").
// O caso REAL que motivou: o ED 04 PT publicou "...estar viv" porque o slice(0,120)
// cego cortava "vivo" no caractere 120.

describe("clipSlideText — nunca quebra no meio da palavra", () => {
  it("reproduz o ED 04 PT: corta na BORDA, nunca em 'viv'", () => {
    const insight =
      "Liberdade custa caro: sair de relacionamentos, largar validação, defender sua opinião. Mas já custou mais caro estar vivo de verdade";
    // Com o slice cego de 120, isto virava "...estar viv" (palavra partida).
    const out = clipSlideText(insight, 120);
    expect(out.endsWith("viv")).toBe(false);
    // Termina numa palavra inteira ("estar" — a anterior à que estourou).
    expect(out.endsWith("estar")).toBe(true);
  });

  it("com orçamento maior, o insight de duas orações cabe INTEIRO", () => {
    const insight =
      "Liberdade custa caro: sair de relacionamentos, largar validação, defender sua opinião. Mas já custou mais caro estar vivo de verdade";
    expect(clipSlideText(insight, 200)).toBe(insight); // 131 chars < 200 → intacto
  });

  it("texto curto passa intacto (sem corte)", () => {
    const s = "A liberdade começa onde acaba o medo";
    expect(clipSlideText(s, 120)).toBe(s);
  });

  it("nunca devolve uma palavra partida (propriedade geral)", () => {
    const samples = [
      "Você gasta mais tempo escolhendo do que vivendo de verdade todos os dias sem perceber",
      "A verdade incomoda muito mais que a mentira amável que todo mundo prefere ouvir sempre",
      "Mentira amável é escravidão disfarçada de aceitação social que ninguém quer encarar hoje",
    ];
    for (const s of samples) {
      for (const max of [40, 60, 80, 100, 120]) {
        const out = clipSlideText(s, max);
        if (out.length < s.length) {
          // out é um prefixo do original e o caractere logo após NÃO é letra
          // (= cortamos numa borda de palavra, nunca no meio).
          expect(s.startsWith(out)).toBe(true);
          expect(/\p{L}/u.test(s.charAt(out.length))).toBe(false);
          expect(out).not.toMatch(/[\s,;:–—-]$/u); // sem pontuação/espaço solto no fim
        }
      }
    }
  });

  it("não estoura o limite", () => {
    const s = "palavra ".repeat(50);
    expect(clipSlideText(s, 120).length).toBeLessThanOrEqual(120);
  });

  it("string vazia → vazia", () => {
    expect(clipSlideText("", 120)).toBe("");
  });
});
