import { describe, it, expect } from "vitest";
import { buildRotation, topicIndexForRun } from "./rotation";

// Espelha THEMES[].cat de api/publish/route.ts (51 temas, em ordem). Se THEMES
// mudar, atualizar aqui. O bug antigo: reembaralho semanal repetia o mesmo tema
// em 1–3 dias e a anti-dup de 7d bloqueava o post. Estes testes barram a volta.
const CATS = ["dopamine","dopamine","dopamine","anxiety","dopamine","dopamine","dopamine","mind","self","network","network","network","network","network","dopamine","network","network","network","network","network","network","network","network","anxiety","freedom","self","network","self","freedom","self","anxiety","freedom","mind","self","freedom","self","anxiety","freedom","anxiety","self","dopamine","freedom","freedom","freedom","anxiety","freedom","freedom","freedom","self","anxiety","freedom"];

describe("rotação — sem repetição antes de fechar o ciclo", () => {
  it("buildRotation é uma permutação válida (cada índice exatamente 1×)", () => {
    const rot = buildRotation(CATS);
    expect(rot.length).toBe(CATS.length);
    expect(new Set(rot).size).toBe(CATS.length);
    expect([...rot].sort((a, b) => a - b)).toEqual(CATS.map((_, i) => i));
  });

  it("nenhum tema repete dentro de N posts (gap ≥ ciclo ≈ 8,5 dias > anti-dup 7d)", () => {
    const rot = buildRotation(CATS);
    const N = rot.length;
    const seq: number[] = [];
    const base = new Date(Date.UTC(2026, 5, 16, 12, 0, 0));
    for (let d = 0; d < 60; d++) {
      const date = new Date(base.getTime() + d * 86400000);
      for (let r = 0; r < 6; r++) seq.push(topicIndexForRun(rot, date, r));
    }
    // toda janela de N slots consecutivos tem N temas DISTINTOS (zero repetição no ciclo)
    for (let i = 0; i + N <= seq.length; i++) {
      expect(new Set(seq.slice(i, i + N)).size).toBe(N);
    }
  });

  it("intercala categorias — nenhum cat aparece > 3× num dia (janela de 6)", () => {
    const rot = buildRotation(CATS);
    let worst = 0;
    for (let s = 0; s < rot.length; s++) {
      const counts: Record<string, number> = {};
      for (let k = 0; k < 6; k++) {
        const cat = CATS[rot[(s + k) % rot.length]];
        counts[cat] = (counts[cat] || 0) + 1;
        worst = Math.max(worst, counts[cat]);
      }
    }
    expect(worst).toBeLessThanOrEqual(3); // o esquema antigo dava 4 (ex.: 4 dopamina/network no dia)
  });

  it("determinística — mesma entrada, mesma ordem (ES e PT batem)", () => {
    expect(buildRotation(CATS)).toEqual(buildRotation(CATS));
  });
});
