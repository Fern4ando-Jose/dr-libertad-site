import { describe, it, expect } from "vitest";
import { ASSINATURA, NOME_SERIE, assinarLegenda, selo } from "./serie";

// A série batizada e a assinatura fixa são o item que os 8 perfis medidos tinham e nós
// não. As regras aqui são as mesmas do CTA de rodapé, e pelo mesmo motivo: um enfeite
// nunca pode impedir a peça de sair.

describe("o selo da coleção", () => {
  it("traz NOME e número — número sozinho não vira coleção", () => {
    expect(selo("br", 244)).toBe("GAIOLA SEM GRADE · Nº 244");
    expect(selo("es", "244")).toBe("JAULA SIN REJAS · Nº 244");
  });

  it("é a bandeira que o dono escolheu, em cada língua", () => {
    expect(NOME_SERIE.br).toBe("GAIOLA SEM GRADE");
    expect(NOME_SERIE.es).toBe("JAULA SIN REJAS");
  });

  it("sem número, sai só o nome — nunca «Nº 0» nem «Nº undefined»", () => {
    expect(selo("br")).toBe("GAIOLA SEM GRADE");
    expect(selo("br", 0)).toBe("GAIOLA SEM GRADE");
    expect(selo("br", null)).toBe("GAIOLA SEM GRADE");
    expect(selo("br", "")).toBe("GAIOLA SEM GRADE");
  });

  it("idioma desconhecido cai no português, nunca em branco", () => {
    expect(selo("xx", 7)).toBe("GAIOLA SEM GRADE · Nº 7");
  });
});

describe("a assinatura na abertura da legenda", () => {
  it("abre a legenda com o mesmo sinal da bio das duas contas", () => {
    expect(assinarLegenda("A gaiola não tem grade.")).toBe(`${ASSINATURA} A gaiola não tem grade.`);
  });

  it("é idempotente — re-tentativa não empilha dois sinais", () => {
    const uma = assinarLegenda("Texto.");
    expect(assinarLegenda(uma)).toBe(uma);
    expect(uma.split(ASSINATURA).length - 1).toBe(1);
  });

  it("legenda vazia volta como veio — não se inventa legenda", () => {
    expect(assinarLegenda("")).toBe("");
    expect(assinarLegenda(null)).toBe("");
    expect(assinarLegenda(undefined)).toBe("");
    expect(assinarLegenda("   ")).toBe("   ");
  });

  it("no limite do Instagram, a legenda sai SEM o sinal em vez de falhar", () => {
    const cheia = "x".repeat(2200);
    expect(assinarLegenda(cheia)).toBe(cheia);
    expect(assinarLegenda(cheia).length).toBeLessThanOrEqual(2200);
  });
});
