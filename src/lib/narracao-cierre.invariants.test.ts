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

// Espelha `narrationSegments` de src/app/api/publish/route.ts.
// DELTA 29/07 à noite (ordem do dono, depois de aprovar o fecho no UPM): o BR
// GANHOU fecho falado ("Me segue pra mais verdades incômodas."); o ES segue SEM
// — era a voz ES que embolava "Direct"/"LIBERTAD", e nela nada mudou.
export const FECHO_BR = "Me segue pra mais verdades incômodas.";
export function roteiroFalado(titulo: string, slides: string[], lang: "es" | "pt" = "es", cta = ""): string {
  const fecho = lang === "pt" ? [cta, FECHO_BR].map((s) => s.trim()).filter(Boolean).join(" ") : "";
  return [titulo, ...slides, ...(fecho ? [fecho] : [])]
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

  it("o roteiro falado nunca contém 'me siga'/'sígueme' (o fecho antigo, que embolava)", () => {
    for (const lang of ["es", "pt"] as const) {
      const r = roteiroFalado("Título de teste", ["insight único"], lang, "Pergunta do dia?");
      expect(r.toLowerCase()).not.toContain("me siga");
      expect(r.toLowerCase()).not.toContain("sígueme");
    }
  });

  it("ES: o roteiro é só título + slides — termina no ÚLTIMO slide, nada depois", () => {
    const slides = ["primeiro insight", "segundo insight"];
    const r = roteiroFalado("Título", slides, "es");
    expect(r.endsWith("segundo insight.")).toBe(true);
  });

  it("BR: o roteiro TERMINA no fecho da marca (pergunta + 'Me segue…'), sem @handle nem keyword", () => {
    const r = roteiroFalado("Título", ["insight"], "pt", "Você acha que escolhe?");
    expect(r.endsWith(FECHO_BR)).toBe(true);
    expect(r).toContain("Você acha que escolhe?");
    expect(r).not.toContain("@");
    for (const f of [FUNIL_PT, FUNIL_ES]) expect(r.toUpperCase()).not.toContain(f!.keyword);
  });
});
