// Invariante da TRAVA DE PUBLICAÇÃO (rede de segurança independente da seleção).
// Regra: o tema só é bloqueado se já saiu em OUTRA vaga (dia,run) na janela; a MESMA
// vaga (par ES/PT do mesmo dia,run = mesmo vídeo) é permitida. Este é o teste que
// FALTAVA — modela o cenário real (cross-formato/idioma/dia por vaga), não a rotação
// pura. Foi o buraco que deixou "Si no pones límites" repetir reel+carrossel em 24/06.
import { describe, it, expect } from "vitest";
import { hasOtherVaga, publishedId, shouldStopRetrying, slotSkipGate, isHardPublishBlock, MAX_PUBLISH_ATTEMPTS, orphanedPairs, publishFailureMode, runsForAutomation, shouldReopenOnBudgetChange, containerStatusOutcome } from "./run-ledger";

// Erro REAL do incidente (carrossel PT "O casal fake…", 26/06): o media_publish do IG
// devolveu este corpo, MAS o post foi pro feed assim mesmo (action-block publica-e-erra).
const ACTION_BLOCK_ERR = 'Carousel publish error: {"error":{"message":"Application request limit reached","type":"OAuthException","is_transient":false,"code":4,"error_subcode":2207051,"error_user_title":"action is blocked","error_user_msg":"We restrict certain activity to protect our community."}}';

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

  // RAIZ da DUPLICATA do carrossel PT (26/06): o action-block do IG responde ERRO no
  // media_publish MAS publica o post no feed. Se o publishCarousel LANÇA, o chamador grava
  // instagram_post_id NULL → o post-fantasma é invisível ao runAlreadyPublished (exige id
  // NOT NULL) → o catchup REPUBLICA → 2 posts idênticos. publishFailureMode resolve: erro
  // DURO (post provavelmente vivo) → "sentinel" (grava a vaga, ninguém republica); erro
  // não-duro (post NÃO vivo) → "throw" (falha real, pode tentar de novo).
  describe("publishFailureMode — anti-fantasma no erro de media_publish", () => {
    it("action-block REAL do incidente (publica-e-erra) → sentinel (grava a vaga, NÃO republica)", () => {
      expect(publishFailureMode(ACTION_BLOCK_ERR)).toBe("sentinel");
    });
    it("429 / rate limit / temporarily blocked → sentinel (mesma classe)", () => {
      expect(publishFailureMode("HTTP 429 Too Many Requests")).toBe("sentinel");
      expect(publishFailureMode("user is temporarily blocked")).toBe("sentinel");
    });
    it("erro transitório (media not ready / timeout) → throw (post NÃO vivo, pode tentar)", () => {
      expect(publishFailureMode("media not ready to publish")).toBe("throw");
      expect(publishFailureMode("Timeout")).toBe("throw");
      expect(publishFailureMode('{"error":{"code":400,"message":"bad request"}}')).toBe("throw");
    });
  });

  // O GATE que FALTAVA: o disjuntor (attempts/bumpAttempt) era lido SÓ pelo watchdog
  // (runs-status → gaveUp), nunca pelo próprio /api/publish. Quando o catchup redisparava
  // o workflow, o publish re-entrava SEM freio e publicava de novo. O gate de fronteira é
  // `shouldStopRetrying(attemptsToday(...))`: na 1ª falha DURA, bumpAttempt(hard) crava
  // attempts=MAX → a partir daí TODA re-entrada do publish pula a vaga (até o dia seguinte).
  it("contrato do gate de fronteira: 1ª falha dura (attempts=MAX) → toda re-entrada pula", () => {
    // após um action-block, bumpAttempt(hard) deixa attempts no teto…
    const attemptsAposHardBlock = MAX_PUBLISH_ATTEMPTS;
    // …e o gate de fronteira do /api/publish e do /api/publish-reel passa a pular a vaga.
    expect(shouldStopRetrying(attemptsAposHardBlock)).toBe(true);
  });

  // ORDEM load-bearing das duas primeiras portas (slotSkipGate). Antes morava solta em dois
  // `if` no /api/publish, sem teste: a regra "publicada ANTES de desistiu" é o que impede o
  // post-fantasma de reabrir. Se um refactor invertesse, uma vaga publicada-mas-com-attempts
  // (estado que recordRun agora evita, mas defensivo) seria tratada como "desistiu" e o
  // catchup poderia republicar. Aqui a ordem é PURA e travada.
  describe("slotSkipGate — ordem das portas (publicada vence o disjuntor)", () => {
    it("vaga limpa (não publicada, sem tentativas) → null (segue p/ a trava + publish)", () => {
      expect(slotSkipGate(false, 0, false)).toBe(null);
    });
    it("já publicada → 'published' (idempotência)", () => {
      expect(slotSkipGate(true, 0, false)).toBe("published");
    });
    it("PUBLICADA vence mesmo com attempts no teto (estado contraditório) — nunca vira 'desistiu'", () => {
      // é o coração do anti-fantasma: published SEMPRE curto-circuita antes do disjuntor
      expect(slotSkipGate(true, MAX_PUBLISH_ATTEMPTS, false)).toBe("published");
      expect(slotSkipGate(true, MAX_PUBLISH_ATTEMPTS + 9, false)).toBe("published");
    });
    it("não publicada + attempts no teto → 'circuit-open' (disjuntor)", () => {
      expect(slotSkipGate(false, MAX_PUBLISH_ATTEMPTS, false)).toBe("circuit-open");
    });
    it("não publicada + abaixo do teto → null (ainda tenta)", () => {
      expect(slotSkipGate(false, MAX_PUBLISH_ATTEMPTS - 1, false)).toBe(null);
    });
    it("force=1 (backfill manual) burla as DUAS portas", () => {
      expect(slotSkipGate(true, MAX_PUBLISH_ATTEMPTS, true)).toBe(null);
      expect(slotSkipGate(false, MAX_PUBLISH_ATTEMPTS, true)).toBe(null);
    });
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

// C2 (auditoria 30/06): reabrir o disjuntor quando o dono SOBE o teto ("liberar gasto").
// Um 402 de orçamento no carrossel marca a vaga attempts=MAX e o balde é DIÁRIO → sem
// isto a vaga fica presa o dia todo mesmo liberando gasto. As decisões são PURAS/testáveis.
describe("C2 — reabrir disjuntor ao liberar orçamento", () => {
  it("mapeia automação → vagas (reels 0..3, carrosséis 4..5)", () => {
    expect(runsForAutomation("ig-reels")).toEqual([0, 1, 2, 3]);
    expect(runsForAutomation("ig-posts")).toEqual([4, 5]);
  });

  it("automação sem vagas de publicação → [] (nada a reabrir)", () => {
    expect(runsForAutomation("manual")).toEqual([]);
    expect(runsForAutomation("ig-engagement")).toEqual([]);
    expect(runsForAutomation("newsletter")).toEqual([]);
  });

  it("reels e carrosséis não compartilham vagas (sem sobreposição)", () => {
    const reels = new Set(runsForAutomation("ig-reels"));
    expect(runsForAutomation("ig-posts").some((r) => reels.has(r))).toBe(false);
  });

  it("SÓ reabre quando o teto SOBE (dono liberou gasto)", () => {
    expect(shouldReopenOnBudgetChange(0.25, 0.5)).toBe(true);
  });

  it("baixar ou manter o teto NÃO reabre o disjuntor (não mexe à toa)", () => {
    expect(shouldReopenOnBudgetChange(0.5, 0.3)).toBe(false); // baixar (nosso caso ig-reels)
    expect(shouldReopenOnBudgetChange(0.3, 0.3)).toBe(false); // manter
  });
});

// C1 (auditoria 30/06): o carrossel publicava após 3s FIXOS → "Media not ready"
// intermitente. Agora espelha o poll do reel via containerStatusOutcome (PURA).
describe("C1 — classificação do status_code do container", () => {
  it("FINISHED → pronto p/ publicar", () => {
    expect(containerStatusOutcome("FINISHED")).toBe("finished");
  });

  it("ERROR e EXPIRED → falha TERMINAL (não adianta esperar)", () => {
    expect(containerStatusOutcome("ERROR")).toBe("error");
    expect(containerStatusOutcome("EXPIRED")).toBe("error"); // terminal (ver A2)
  });

  it("IN_PROGRESS / PUBLISHED / desconhecido / ausente → continua aguardando", () => {
    expect(containerStatusOutcome("IN_PROGRESS")).toBe("pending");
    expect(containerStatusOutcome("PUBLISHED")).toBe("pending");
    expect(containerStatusOutcome("QUALQUER")).toBe("pending");
    expect(containerStatusOutcome(undefined)).toBe("pending");
  });
});
