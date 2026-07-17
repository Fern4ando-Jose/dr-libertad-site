// Invariante do QA de conteúdo do footage (incidente 2026-07-01: Reel com macro de
// pele/nudez). O juiz de visão olha o poster do clipe; o PARSER do veredito é
// FAIL-SAFE — na dúvida REJEITA (melhor perder um clipe que publicar algo impróprio
// numa marca de psicologia). Espelhado em scripts/fetch-footage.mjs (mesmo contrato).
import { describe, it, expect, vi } from "vitest";
import { parseFootageVerdict, isCacheableVerdictReason, FOOTAGE_QA_PROMPT } from "./footage-qa";

describe("parseFootageVerdict — fail-safe (bug footage 07-01)", () => {
  it("aprova quando o modelo diz reject:false", () => {
    expect(parseFootageVerdict('{"reject": false, "reason": "clear scene"}')).toEqual({ reject: false, reason: "clear scene" });
  });

  it("rejeita quando o modelo diz reject:true", () => {
    expect(parseFootageVerdict('{"reject": true, "reason": "skin macro"}')).toEqual({ reject: true, reason: "skin macro" });
  });

  it("extrai o JSON mesmo com prosa/backticks em volta", () => {
    const raw = 'Here is my verdict:\n```json\n{"reject": true, "reason": "nudity"}\n```';
    expect(parseFootageVerdict(raw).reject).toBe(true);
  });

  it("veredito ILEGÍVEL (sem JSON) → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict("não sei dizer").reject).toBe(true);
  });

  it("JSON malformado → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict('{"reject": tru').reject).toBe(true);
  });

  it("reject não-booleano (tipo errado) → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict('{"reject": "yes"}').reject).toBe(true);
  });

  it("entrada não-string (undefined/objeto) → REJEITA (fail-safe)", () => {
    expect(parseFootageVerdict(undefined).reject).toBe(true);
    expect(parseFootageVerdict({} as unknown).reject).toBe(true);
  });
});

// O cache de veredito por videoId (07/07: teto ig-reels espremido por re-julgar os
// mesmos clipes todo dia) SÓ pode gravar veredito REAL do juiz. Veredito de config
// ausente, erro transitório ou JSON ilegível NUNCA é permanente — um soluço de rede
// condenaria (ou liberaria) o clipe pra sempre.
describe("isCacheableVerdictReason — só veredito real é permanente", () => {
  it("veredito real do juiz → cacheável (aprovado ou rejeitado)", () => {
    expect(isCacheableVerdictReason("clear scene")).toBe(true);
    expect(isCacheableVerdictReason("skin macro")).toBe(true);
    expect(isCacheableVerdictReason("")).toBe(true);
  });

  it("config ausente (QA pulado) → NÃO cacheia", () => {
    expect(isCacheableVerdictReason("sem ANTHROPIC_API_KEY — QA pulado")).toBe(false);
    expect(isCacheableVerdictReason("sem poster — QA pulado")).toBe(false);
  });

  it("erro transitório (HTTP/exceção) → NÃO cacheia", () => {
    expect(isCacheableVerdictReason("QA HTTP 529 → rejeitado (fail-safe)")).toBe(false);
    expect(isCacheableVerdictReason("QA erro (fetch failed) → rejeitado (fail-safe)")).toBe(false);
  });

  it("JSON ilegível do modelo → NÃO cacheia (flakiness não é veredito)", () => {
    expect(isCacheableVerdictReason("veredito ilegível → rejeitado (fail-safe)")).toBe(false);
  });
});

// ─── `who`: o sujeito do quadro, no MESMO veredito (custo zero) ───────────────
// 2026-07-17: a busca AO VIVO entrou no caminho normal (FOOTAGE_LIVE_SLOTS) e ela não tem
// curadoria humana — sem saber QUEM está no quadro, um tema `man` receberia mulher da
// busca e o defeito da ed. 164 voltava pela porta dos fundos. O `who` viaja na mesma
// chamada do `reject` (mesma imagem, mesmo request) → nenhuma chamada paga a mais.
describe("parseFootageVerdict — sujeito do quadro (`who`)", () => {
  it("extrai o `who` quando o juiz responde no vocabulário da whitelist", () => {
    for (const who of ["man", "woman", "couple", "group", "none"]) {
      expect(parseFootageVerdict(`{"reject": false, "reason": "ok", "who": "${who}"}`).who).toBe(who);
    }
  });

  it("`who` fora do vocabulário → undefined (nunca uma string solta no filtro)", () => {
    expect(parseFootageVerdict('{"reject": false, "reason": "ok", "who": "alien"}').who).toBeUndefined();
    expect(parseFootageVerdict('{"reject": false, "reason": "ok", "who": 42}').who).toBeUndefined();
    expect(parseFootageVerdict('{"reject": false, "reason": "ok", "who": null}').who).toBeUndefined();
  });

  it("veredito ANTIGO (sem `who`) continua válido → who undefined, reject preservado", () => {
    // É o que está gravado hoje no footage_qa_cache. Não pode virar rejeição nem erro.
    const v = parseFootageVerdict('{"reject": false, "reason": "clear scene"}');
    expect(v.reject).toBe(false);
    expect(v.who).toBeUndefined();
  });

  it("o PROMPT pede o `who` no vocabulário exato da whitelist e manda não adivinhar gênero", () => {
    for (const who of ["man", "woman", "couple", "group", "none"]) {
      expect(FOOTAGE_QA_PROMPT).toContain(`"${who}"`);
    }
    // "na dúvida, none" é o que impede o juiz de chutar gênero e contaminar o filtro
    expect(FOOTAGE_QA_PROMPT).toMatch(/never guess/i);
  });
});

// ─── Cache tolerante à ordem deploy × migração ───────────────────────────────
// `who` é coluna NOVA. Se o deploy subir ANTES de /api/migrate rodar, uma query citando
// `who` falha inteira. Sem o fallback, o cache do QA sairia do ar EM SILÊNCIO e cada
// clipe seria re-julgado (re-pago) todo dia — o ralo que o cache existe pra tapar
// (incidente 07/07, teto ig-reels). Aqui provamos que ele degrada, não desliga.
describe("cache do QA sobrevive à coluna `who` ainda não migrada", () => {
  it("SELECT com `who` falha → relê no esquema antigo e o cache CONTINUA valendo", async () => {
    const chamadas: string[] = [];
    vi.doMock("@vercel/postgres", () => ({
      sql: (s: TemplateStringsArray) => {
        const q = s.join("?");
        chamadas.push(q);
        if (q.includes("who")) throw new Error(`column "who" does not exist`);
        return Promise.resolve({ rows: [{ reject: true, reason: "skin macro" }] });
      },
    }));
    vi.resetModules();
    const { readFootageVerdictCache } = await import("./footage-qa");
    const hit = await readFootageVerdictCache(123);
    expect(hit).toEqual({ reject: true, reason: "skin macro" }); // veredito PRESERVADO
    expect(chamadas.some((q) => q.includes("who"))).toBe(true);  // tentou o esquema novo
    expect(chamadas.length).toBe(2);                             // e caiu pro antigo
    vi.doUnmock("@vercel/postgres");
    vi.resetModules();
  });

  it("INSERT com `who` falha → grava no esquema antigo (não perde o veredito pago)", async () => {
    const chamadas: string[] = [];
    vi.doMock("@vercel/postgres", () => ({
      sql: (s: TemplateStringsArray) => {
        const q = s.join("?");
        chamadas.push(q);
        if (q.includes("who")) throw new Error(`column "who" does not exist`);
        return Promise.resolve({ rows: [] });
      },
    }));
    vi.resetModules();
    const { writeFootageVerdictCache } = await import("./footage-qa");
    await writeFootageVerdictCache(123, { reject: true, reason: "skin macro", who: "woman" });
    expect(chamadas.length).toBe(2);
    expect(chamadas[1]).toContain("INSERT INTO footage_qa_cache");
    expect(chamadas[1]).not.toContain("who");
    vi.doUnmock("@vercel/postgres");
    vi.resetModules();
  });
});
