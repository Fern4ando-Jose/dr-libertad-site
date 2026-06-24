// Invariante da TRAVA DE PUBLICAÇÃO (rede de segurança independente da seleção).
// Regra: o tema só é bloqueado se já saiu em OUTRA vaga (dia,run) na janela; a MESMA
// vaga (par ES/PT do mesmo dia,run = mesmo vídeo) é permitida. Este é o teste que
// FALTAVA — modela o cenário real (cross-formato/idioma/dia por vaga), não a rotação
// pura. Foi o buraco que deixou "Si no pones límites" repetir reel+carrossel em 24/06.
import { describe, it, expect } from "vitest";
import { hasOtherVaga, publishedId } from "./run-ledger";

const D = "2026-06-24";

// Anti "post-fantasma": uma publicação CONFIRMADA sempre gera um id NÃO-NULO p/ gravar
// no livro-razão. Sem isso, o post vivo-sem-id ficava invisível ao anti-dup e o watchdog
// redisparava a vaga (tema duplicado no mesmo dia — ED 112 "O amor que morre de tédio").
describe("publishedId — id a gravar após publicação confirmada", () => {
  it("media id presente → usa o media id", () => {
    expect(publishedId("17900000000000000", "cre_1")).toBe("17900000000000000");
  });
  it("media id ausente/ruim → cai no creation_id (sentinela, NUNCA nulo)", () => {
    expect(publishedId(null, "cre_1")).toBe("cre_1");
    expect(publishedId(undefined, "cre_1")).toBe("cre_1");
    expect(publishedId("", "cre_1")).toBe("cre_1");
    expect(publishedId("   ", "cre_1")).toBe("cre_1");
    expect(publishedId(42, "cre_1")).toBe("cre_1");
  });
  it("o resultado é SEMPRE uma string não-vazia (a vaga sempre fica gravável)", () => {
    for (const m of [null, undefined, "", "  ", 0, {}, "id_real"]) {
      const r = publishedId(m, "cre_x");
      expect(typeof r).toBe("string");
      expect(r.length).toBeGreaterThan(0);
    }
  });
});

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
