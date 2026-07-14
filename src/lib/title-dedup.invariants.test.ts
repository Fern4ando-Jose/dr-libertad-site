import { describe, it, expect } from "vitest";
import { titleSimilarity, titleCollides, TITLE_SIM_THRESHOLD } from "./title-dedup";

describe("title-dedup — trava de duplicata na saída (texto gerado)", () => {
  it("pega o caso real: título idêntico palavra-por-palavra (11/07 × 14/07)", () => {
    const t = "Você ama ou tem medo de ficar sozinho?";
    expect(titleCollides(t, [t])).toBe(true);
  });

  it("ignora acento, pontuação e caixa na comparação exata", () => {
    expect(titleCollides("Você AMA ou tem MEDO de ficar sozinho", ["voce ama ou tem medo de ficar sozinho?"])).toBe(true);
  });

  it("pega quase-igual (uma palavra a menos) acima do threshold", () => {
    expect(titleCollides("Ama ou tem medo de ficar sozinho?", ["Você ama ou tem medo de ficar sozinho?"])).toBe(true);
  });

  it("NÃO colide com título de tema/ângulo diferente", () => {
    expect(titleCollides("O feed é um caça-níquel no seu bolso", ["Você ama ou tem medo de ficar sozinho?"])).toBe(false);
  });

  it("título vazio nunca colide", () => {
    expect(titleCollides("", ["qualquer coisa"])).toBe(false);
    expect(titleCollides("   ", ["qualquer coisa"])).toBe(false);
  });

  it("lista de recentes vazia → sem colisão", () => {
    expect(titleCollides("Você ama ou tem medo de ficar sozinho?", [])).toBe(false);
  });

  it("similaridade: idêntico=1, disjunto=0, simétrica", () => {
    expect(titleSimilarity("a b c", "a b c")).toBe(1);
    expect(titleSimilarity("um dois três", "quatro cinco seis")).toBe(0);
    const a = "medo de ficar sozinho", b = "medo de ficar só agora";
    expect(titleSimilarity(a, b)).toBeCloseTo(titleSimilarity(b, a), 10);
  });

  it("threshold é respeitado: abaixo dele não colide", () => {
    // 1 token em comum de 5 distintos → jaccard baixo, não deve colidir no default
    const sim = titleSimilarity("medo de ficar totalmente sozinho hoje", "amor exige coragem sozinho");
    expect(sim).toBeLessThan(TITLE_SIM_THRESHOLD);
    expect(titleCollides("medo de ficar totalmente sozinho hoje", ["amor exige coragem sozinho"])).toBe(false);
  });

  it("ignora entradas nulas/vazias na lista de recentes", () => {
    expect(titleCollides("frase única aqui", ["", null as unknown as string, "outra coisa"])).toBe(false);
  });
});
