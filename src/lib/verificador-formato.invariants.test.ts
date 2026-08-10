import { describe, it, expect } from "vitest";
import { conferirFormato, reprovado, partesFixasDoMolde, resumoDoVeredito } from "./verificador-formato";
import { FORMATOS } from "./formatos-peca";

const comparacao = FORMATOS.find((f) => f.id === "comparacao")!;
const polemica = FORMATOS.find((f) => f.id === "polemica")!;

describe("verificador de formato — nenhuma peça sai fora do molde", () => {
  it("peça no molde passa limpa", () => {
    const a = conferirFormato({
      formato: comparacao, // molde: ___ NÃO É ___
      titulo: "DESCANSO NÃO É ROLAR O FEED",
      slides: ["Você deita exausto e pega o celular pra desligar."],
      lang: "br",
    });
    expect(reprovado(a)).toBe(false);
    expect(resumoDoVeredito(a)).toMatch(/formato ✓/);
  });

  it("REPROVA peça sem o molde do formato", () => {
    const a = conferirFormato({
      formato: comparacao,
      titulo: "O que te mantém preso à tela?",
      slides: ["Você sente isso todo dia."],
      lang: "br",
    });
    expect(reprovado(a)).toBe(true);
    expect(a.some((x) => x.regra === "titulo-molde")).toBe(true);
  });

  it("REPROVA peça sem formato carimbado — sem isso nada é comparável", () => {
    const a = conferirFormato({ titulo: "Qualquer coisa", slides: ["Você..."], lang: "br" });
    expect(reprovado(a)).toBe(true);
    expect(a[0].regra).toBe("formato-carimbado");
  });

  it("REPROVA quando a primeira tela é convite/oferta", () => {
    const a = conferirFormato({
      formato: comparacao,
      titulo: "DESCANSO NÃO É ROLAR O FEED",
      slides: ["Comenta QUERO que eu te mando o link do livro"],
      lang: "br",
    });
    expect(reprovado(a)).toBe(true);
    expect(a.some((x) => x.regra === "venda-dentro-do-molde")).toBe(true);
  });

  it("tema-convicção é EXCEÇÃO: a âncora do autor manda e o molde cede", () => {
    const a = conferirFormato({
      formato: comparacao,
      titulo: "Ninguém te deve nada.", // âncora verbatim, sem molde
      slides: ["Ninguém te deve nada."],
      temaLiteral: true,
      lang: "br",
    });
    expect(reprovado(a)).toBe(false);
  });

  it("abrir sem falar com a pessoa AVISA, mas não derruba a vaga", () => {
    const a = conferirFormato({
      formato: polemica, // molde: VOCÊ NÃO VAI GOSTAR: ___
      titulo: "VOCÊ NÃO VAI GOSTAR: a recompensa fácil cobra juros",
      slides: ["A recompensa fácil cobra juros altos."], // sem 2ª pessoa
      lang: "br",
    });
    expect(a.some((x) => x.regra === "conflito-antes-da-tese")).toBe(true);
    expect(reprovado(a)).toBe(false); // avisa, não bloqueia
  });

  it("vale em espanhol também — a 2ª pessoa muda de palavra, não de regra", () => {
    const a = conferirFormato({
      formato: comparacao,
      titulo: "DESCANSAR NO ES MIRAR EL FEED",
      slides: ["Te acuestas agotado y coges el móvil para desconectar."],
      lang: "es",
    });
    expect(a.some((x) => x.regra === "conflito-antes-da-tese")).toBe(false);
  });

  it("as partes fixas do molde ignoram as lacunas e a pontuação solta", () => {
    expect(partesFixasDoMolde("___ NÃO É ___")).toEqual(["NÃO É"]);
    expect(partesFixasDoMolde("«___» — RESPONDENDO")).toEqual(["RESPONDENDO"]);
    expect(partesFixasDoMolde("___ É COMO ___")).toEqual(["É COMO"]);
  });

  it("todo formato da casa tem molde conferível (nenhum passa por ser vago)", () => {
    for (const f of FORMATOS) {
      expect(partesFixasDoMolde(f.tituloMolde).length, `${f.id} sem parte fixa`).toBeGreaterThan(0);
    }
  });

  it("acento e caixa não enganam o verificador", () => {
    const a = conferirFormato({
      formato: comparacao,
      titulo: "descanso nao e rolar o feed", // sem acento, minúscula
      slides: ["Você deita exausto."],
      lang: "br",
    });
    expect(a.some((x) => x.regra === "titulo-molde")).toBe(false);
  });
});
