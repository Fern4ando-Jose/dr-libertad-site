import { describe, it, expect } from "vitest";
import { capaDoAcervo, fotosDoPilar } from "./cover-acervo";
import { FOOTAGE_LIBRARY } from "./footage-library";

// Invariantes da capa do ACERVO — o degrau grátis que impede o carrossel de parar quando o
// teto de gasto está fechado. O que estes testes protegem é o que quebrou de verdade em
// 05–09/08/2026: nada publicado por 4 dias porque a única capa possível era paga.

describe("capa do acervo", () => {
  it("todo pilar da biblioteca tem pelo menos uma foto utilizável", () => {
    for (const pilar of Object.keys(FOOTAGE_LIBRARY)) {
      expect(fotosDoPilar(pilar).length, `pilar ${pilar} sem foto`).toBeGreaterThan(0);
    }
  });

  it("a MESMA chave devolve a MESMA foto — ES e BR do mesmo tema não divergem", () => {
    // Se isto quebrar, o par sai com capas diferentes e o feed perde a paridade que o dono
    // exige ("tem de sair nas DUAS contas, e tem de ser única").
    const a = capaDoAcervo("self", "El silencio incomoda|2026-08-09");
    const b = capaDoAcervo("self", "El silencio incomoda|2026-08-09");
    expect(a).toBe(b);
    expect(a).toBeTruthy();
  });

  it("chaves diferentes espalham pelo acervo em vez de fixar numa foto só", () => {
    const vistas = new Set<string>();
    for (let i = 0; i < 40; i++) vistas.add(String(capaDoAcervo("mind", `tema-${i}|2026-08-09`)));
    expect(vistas.size).toBeGreaterThan(3);
  });

  it("a foto escolhida vem do PILAR pedido — o sujeito da imagem é o sujeito da frase", () => {
    const escolhida = capaDoAcervo("anxiety", "qualquer|2026-08-09");
    expect(fotosDoPilar("anxiety")).toContain(escolhida);
    expect(fotosDoPilar("freedom")).not.toContain(escolhida);
  });

  it("pilar inexistente devolve null em vez de inventar imagem de outro assunto", () => {
    expect(capaDoAcervo("pilar-que-nao-existe", "x|y")).toBeNull();
  });

  it("toda foto é uma URL de imagem — nunca um .mp4 disfarçado de capa", () => {
    for (const pilar of Object.keys(FOOTAGE_LIBRARY)) {
      for (const url of fotosDoPilar(pilar)) {
        expect(url, `${pilar}: ${url}`).toMatch(/\.(jpe?g|png|webp|gif)(\?|$)/i);
      }
    }
  });
});
