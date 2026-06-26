import { describe, it, expect } from "vitest";
import { normalizePhrase, titleDupedInSlides } from "./slide-dedup";

describe("slide-dedup — o 1º slide não pode repetir o título", () => {
  it("pega o caso real (ES): slide 1 == título", () => {
    const title = "La libertad empieza donde acaba el miedo";
    const slides = [
      "La libertad empieza donde acaba el miedo",
      "El miedo no es una emoción que esperas a controlar",
      "Libertad es actuar a pesar del miedo",
    ];
    expect(titleDupedInSlides(title, slides)).toBe(true);
  });

  it("ignora acento/pontuação/caixa na comparação", () => {
    expect(titleDupedInSlides("Nunca mude quem você é", ["nunca mude quem voce e!"])).toBe(true);
  });

  it("slides DISTINTOS do título → não marca (sem falso positivo)", () => {
    const title = "A liberdade começa onde acaba o medo";
    const slides = [
      "Medo sussurra. Você escuta. Você obedece.",
      "Todo dia você escolhe entre viver e estar seguro.",
      "A terceira opção existe: crescer sem culpa.",
    ];
    expect(titleDupedInSlides(title, slides)).toBe(false);
  });

  it("título vazio nunca marca", () => {
    expect(titleDupedInSlides("", ["qualquer coisa"])).toBe(false);
  });

  it("normalizePhrase: normaliza igual p/ comparar", () => {
    expect(normalizePhrase("  Olá, MUNDO! ")).toBe("ola mundo");
  });
});
