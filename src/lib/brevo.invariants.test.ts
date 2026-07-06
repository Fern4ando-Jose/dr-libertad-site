import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  buildContactPayload,
  listIdForFaixa,
  isFaixa,
  brevoConfigured,
  upsertBrevoContact,
  FAIXAS,
} from "./brevo";
import { faixaForScore, quizContent } from "@/components/quiz/quiz.content";

describe("brevo — invariantes de captura do quiz", () => {
  const OLD = process.env;
  beforeEach(() => {
    process.env = { ...OLD };
    delete process.env.BREVO_API_KEY;
    for (const f of FAIXAS) delete process.env[`BREVO_LIST_${f.toUpperCase()}`];
  });
  afterEach(() => {
    process.env = OLD;
  });

  it("o payload sempre carrega a FAIXA como atributo (é a tag de segmentação)", () => {
    const p = buildContactPayload({ email: "a@b.com", faixa: "vermelho", score: 15, lang: "pt" });
    expect((p.attributes as Record<string, unknown>).FAIXA).toBe("vermelho");
    expect((p.attributes as Record<string, unknown>).QUIZ_SCORE).toBe(15);
    expect(p.email).toBe("a@b.com");
    expect(p.updateEnabled).toBe(true); // idempotente — não duplica contato
  });

  it("sem BREVO_LIST_* configurado, o payload não força listIds (usa só o atributo)", () => {
    const p = buildContactPayload({ email: "a@b.com", faixa: "verde", score: 2, lang: "es" });
    expect(p.listIds).toBeUndefined();
  });

  it("com BREVO_LIST_<FAIXA>, o contato é adicionado à lista daquela faixa", () => {
    process.env.BREVO_LIST_CRITICO = "7";
    expect(listIdForFaixa("critico")).toBe(7);
    const p = buildContactPayload({ email: "a@b.com", faixa: "critico", score: 22, lang: "pt" });
    expect(p.listIds).toEqual([7]);
  });

  it("ID de lista inválido é ignorado (não vira NaN nem 0)", () => {
    process.env.BREVO_LIST_VERDE = "abc";
    expect(listIdForFaixa("verde")).toBeNull();
    process.env.BREVO_LIST_VERDE = "0";
    expect(listIdForFaixa("verde")).toBeNull();
  });

  it("GATED: sem chave, upsert não faz rede e devolve gated:true (no-op honesto)", async () => {
    expect(brevoConfigured()).toBe(false);
    const r = await upsertBrevoContact({ email: "a@b.com", faixa: "amarelo", score: 9, lang: "pt" });
    expect(r).toEqual({ ok: true, gated: true });
  });

  it("isFaixa só aceita as 4 faixas conhecidas", () => {
    expect(isFaixa("verde")).toBe(true);
    expect(isFaixa("roxo")).toBe(false);
    expect(isFaixa(3)).toBe(false);
  });
});

describe("faixaForScore — os cortes batem com o Quiz.md (0–5 / 6–12 / 13–18 / 19–24)", () => {
  const bands = quizContent.pt.bands;
  const cases: [number, string][] = [
    [0, "verde"],
    [5, "verde"],
    [6, "amarelo"],
    [12, "amarelo"],
    [13, "vermelho"],
    [18, "vermelho"],
    [19, "critico"],
    [24, "critico"],
  ];
  for (const [score, faixa] of cases) {
    it(`${score} pontos → ${faixa}`, () => {
      expect(faixaForScore(score, bands).key).toBe(faixa);
    });
  }

  it("faixas cobrem 0–24 sem buraco nem sobreposição", () => {
    for (let s = 0; s <= 24; s++) {
      const matches = bands.filter((b) => s >= b.min && s <= b.max);
      expect(matches.length).toBe(1);
    }
  });

  it("clampa fora do intervalo em vez de estourar", () => {
    expect(faixaForScore(-3, bands).key).toBe("verde");
    expect(faixaForScore(99, bands).key).toBe("critico");
  });
});
