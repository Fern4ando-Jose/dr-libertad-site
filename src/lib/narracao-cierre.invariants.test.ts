// Trava do CIERRE FALADO: a voz NÃO narra mais o fecho (comentário/seguir).
//
// Histórico: em 2026-07-26 a voz foi ajustada pra pedir a MESMA coisa que a tela
// (achado do head-de-crescimento) — com o funil ligado, a voz passou a dizer
// "Comenta LIBERTAD... al Direct" em vez de "me siga".
//
// Essa frase foi RETIRADA da voz em 2026-07-29 (ordem do dono): no Reel ES daquele
// dia, "Direct" (palavra emprestada do inglês) E a própria palavra-chave "LIBERTAD"
// saíam com sotaque estrangeiro na voz MiniMax. O dono ouviu e mandou tirar esse
// trecho da NARRAÇÃO — o end-card visual do funil continua mostrando o CTA
// normalmente; só a voz ficou muda ali (silêncio no fecho é aceito).
//
// Este módulo replica a montagem do roteiro falado de publish/route.ts. Se a rota
// voltar a concatenar um fecho à narração, este teste tem de travar — é a régua.
import { describe, it, expect } from "vitest";

type Funil = { keyword: string } | undefined;

// Espelha `narrationSegments` de src/app/api/publish/route.ts — SEM fecho.
export function roteiroFalado(titulo: string, slides: string[]): string {
  return [titulo, ...slides]
    .map((s) => s.trim()).filter(Boolean)
    .map((s) => (/[.!?]$/.test(s) ? s : s + "."))
    .join(" ");
}

const FUNIL_PT: Funil = { keyword: "LIBERDADE" };
const FUNIL_ES: Funil = { keyword: "LIBERTAD" };

describe("cierre falado — a voz NÃO narra mais o fecho (defeito real 2026-07-29)", () => {
  it("o roteiro falado nunca contém a palavra emprestada 'Direct'", () => {
    const r = roteiroFalado("Título de teste", ["primeiro insight", "segundo insight"]);
    expect(r.toLowerCase()).not.toContain("direct");
  });

  it("o roteiro falado nunca contém a palavra-chave do funil (LIBERTAD/LIBERDADE)", () => {
    const r = roteiroFalado("Título de teste", ["primeiro insight"]);
    for (const f of [FUNIL_PT, FUNIL_ES]) {
      expect(r.toUpperCase()).not.toContain(f!.keyword);
    }
  });

  it("o roteiro falado nunca contém 'me siga'/'sígueme' (o fecho de seguir também saiu)", () => {
    const r = roteiroFalado("Título de teste", ["insight único"]);
    expect(r.toLowerCase()).not.toContain("me siga");
    expect(r.toLowerCase()).not.toContain("sígueme");
  });

  it("o roteiro falado é só título + slides — termina no ÚLTIMO slide, nada depois", () => {
    const slides = ["primeiro insight", "segundo insight"];
    const r = roteiroFalado("Título", slides);
    expect(r.endsWith("segundo insight.")).toBe(true);
  });
});
