// Invariante da TRAVA DE PUBLICAÇÃO (rede de segurança independente da seleção).
// Regra: o tema só é bloqueado se já saiu em OUTRA vaga (dia,run) na janela; a MESMA
// vaga (par ES/PT do mesmo dia,run = mesmo vídeo) é permitida. Este é o teste que
// FALTAVA — modela o cenário real (cross-formato/idioma/dia por vaga), não a rotação
// pura. Foi o buraco que deixou "Si no pones límites" repetir reel+carrossel em 24/06.
import { describe, it, expect } from "vitest";
import { hasOtherVaga } from "./run-ledger";

const D = "2026-06-24";

describe("hasOtherVaga — trava de publicação por vaga", () => {
  it("tema inédito (sem vagas) → false (publica)", () => {
    expect(hasOtherVaga([], D, 0)).toBe(false);
  });

  it("MESMA vaga (par ES/PT do mesmo dia,run) → false (permite o 2º idioma = mesmo vídeo)", () => {
    expect(hasOtherVaga([{ day: D, run: 0 }], D, 0)).toBe(false);
    expect(hasOtherVaga([{ day: D, run: 0 }, { day: D, run: 0 }], D, 0)).toBe(false);
  });

  it("OUTRO run no mesmo dia → true (bloqueia: reel run0 vs carrossel run4)", () => {
    expect(hasOtherVaga([{ day: D, run: 0 }], D, 4)).toBe(true);
  });

  it("OUTRO dia (dentro da janela 7d) → true (bloqueia repetição cross-dia)", () => {
    expect(hasOtherVaga([{ day: "2026-06-23", run: 0 }], D, 0)).toBe(true);
  });

  it("mistura própria vaga + outra → true (a outra vaga manda)", () => {
    expect(hasOtherVaga([{ day: D, run: 0 }, { day: D, run: 2 }], D, 0)).toBe(true);
  });
});
