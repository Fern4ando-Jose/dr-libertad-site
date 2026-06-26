// Invariante da TRAVA DE PUBLICAÇÃO (rede de segurança independente da seleção).
// Regra: o tema só é bloqueado se já saiu em OUTRA vaga (dia,run) na janela; a MESMA
// vaga (par ES/PT do mesmo dia,run = mesmo vídeo) é permitida. Este é o teste que
// FALTAVA — modela o cenário real (cross-formato/idioma/dia por vaga), não a rotação
// pura. Foi o buraco que deixou "Si no pones límites" repetir reel+carrossel em 24/06.
import { describe, it, expect } from "vitest";
import { hasOtherVaga, publishedId, shouldStopRetrying, isHardPublishBlock, MAX_PUBLISH_ATTEMPTS, orphanedPairs } from "./run-ledger";

const D = "2026-06-24";

// DISJUNTOR anti-martelo: uma vaga que falha publicação era redisparada pra sempre
// (a cada 15min) → martelou a conta PT até o Instagram BLOQUEAR. Regra: para após MAX
// falhas no dia; erro DURO do IG (limite/bloqueio/429) para na hora.
describe("disjuntor de publicação (anti-martelo / anti-bloqueio de conta)", () => {
  it("abaixo do teto → ainda tenta; no teto ou acima → desiste", () => {
    expect(shouldStopRetrying(0)).toBe(false);
    expect(shouldStopRetrying(MAX_PUBLISH_ATTEMPTS - 1)).toBe(false);
    expect(shouldStopRetrying(MAX_PUBLISH_ATTEMPTS)).toBe(true);
    expect(shouldStopRetrying(MAX_PUBLISH_ATTEMPTS + 5)).toBe(true);
  });

  it("detecta bloqueio/limite DURO do Instagram (não adianta insistir)", () => {
    const block = 'Carousel publish error: {"error":{"message":"Application request limit reached","code":4,"error_subcode":2207051,"error_user_title":"action is blocked"}}';
    expect(isHardPublishBlock(block)).toBe(true);
    expect(isHardPublishBlock("HTTP 429 Too Many Requests")).toBe(true);
    expect(isHardPublishBlock("rate limit exceeded")).toBe(true);
  });

  it("NÃO marca como bloqueio duro um erro comum (ex.: timeout) — esse só conta +1", () => {
    expect(isHardPublishBlock("Timeout: reel não finalizou")).toBe(false);
    expect(isHardPublishBlock("Carousel child error: bad image url")).toBe(false);
    expect(isHardPublishBlock(null)).toBe(false);
  });

  it("códigos 40x/46x NÃO são bloqueio duro (o '\"code\":4' exige a vírgula)", () => {
    expect(isHardPublishBlock('{"error":{"code":400,"message":"bad request"}}')).toBe(false);
    expect(isHardPublishBlock('{"error":{"code":463,"message":"reauthenticate"}}')).toBe(false);
  });

  // RAIZ real das duplicatas no PT (24/06): NÃO foi bloqueio da conta — foi 402 de
  // ORÇAMENTO. O balde ig-posts é DIÁRIO e o 2º idioma da vaga pegava o balde já gasto
  // pelo 1º → 402 → vaga "faltando" → watchdog redisparava de 15/15min → cada redisparo
  // regerava ilustração (fal) → gasto subia (US$0,573) → MAIS 402 = tempestade. O publish
  // passa a tratar 402 como DESISTÊNCIA DO DIA (bumpAttempt hard), pois o orçamento não
  // reabre até amanhã. Contrato: desistência-do-dia (hard) = teto na hora, igual ao bloqueio
  // duro do IG → o catchup para de redisparar imediatamente.
  it("orçamento estourado e bloqueio do IG são da MESMA classe: desiste do dia (teto na hora)", () => {
    // ambos chegam via bumpAttempt(hard=true) → attempts = MAX → shouldStopRetrying = true
    expect(shouldStopRetrying(MAX_PUBLISH_ATTEMPTS)).toBe(true);
    // uma falha transitória (timeout) NÃO é desistência: conta +1 e ainda pode tentar
    expect(shouldStopRetrying(1)).toBe(false);
  });
});

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

// ATOMICIDADE ES+PT: a vaga tem de sair nas DUAS contas ou em nenhuma ("publicou numa,
// tem de sair na outra"). `orphanedPairs` é o ALARME: detecta a vaga em que UMA língua
// publicou e a irmã DESISTIU (gaveUp) — assimetria permanente no feed. Foi o defeito que
// o dono apontou (ES-only). A causa nº1 (balde de orçamento compartilhado) é tratada à
// parte pelo `siblingPublished` no gate; este alarme cobre o resíduo (ex.: lang-guard).
const LANGS = ["es", "pt"];
describe("orphanedPairs — alarme de par ES/PT quebrado", () => {
  it("ambas publicaram → sem órfão (par íntegro)", () => {
    expect(orphanedPairs({ es: [4], pt: [4] }, [], LANGS)).toEqual([]);
  });

  it("uma publicou e a irmã ainda está tentando (missing, não gaveUp) → ainda NÃO é órfão", () => {
    // gaveUp vazio = a irmã não desistiu; o catchup ainda pode parear
    expect(orphanedPairs({ es: [4], pt: [] }, [], LANGS)).toEqual([]);
  });

  it("ES publicou e PT DESISTIU na MESMA vaga → órfão (alarme)", () => {
    const r = orphanedPairs({ es: [4], pt: [] }, [{ lang: "pt", run: 4 }], LANGS);
    expect(r).toEqual([{ run: 4, publishedLang: "es", orphanLang: "pt" }]);
  });

  it("PT publicou e ES desistiu → órfão simétrico (não importa qual lado saiu)", () => {
    const r = orphanedPairs({ es: [], pt: [5] }, [{ lang: "es", run: 5 }], LANGS);
    expect(r).toEqual([{ run: 5, publishedLang: "pt", orphanLang: "es" }]);
  });

  it("NENHUMA publicou (as duas desistiram) → NÃO é órfão (é falha total, não assimetria)", () => {
    expect(orphanedPairs({ es: [], pt: [] }, [{ lang: "es", run: 4 }, { lang: "pt", run: 4 }], LANGS)).toEqual([]);
  });

  it("desistência em run DIFERENTE do publicado → não pareia como órfão", () => {
    // ES publicou run4; PT desistiu de run5 (vaga distinta) → não é o par do run4
    expect(orphanedPairs({ es: [4], pt: [] }, [{ lang: "pt", run: 5 }], LANGS)).toEqual([]);
  });
});
