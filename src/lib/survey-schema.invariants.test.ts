import { describe, expect, it } from "vitest";
import {
  OPEN_MAX_LEN,
  PNR,
  SCREENS,
  isValidAnswer,
  validateAnswers,
  type Answers,
} from "./survey-schema";

// Payload completo e válido (todas as fechadas respondidas), base dos testes.
function fullValidAnswers(): Answers {
  const a: Answers = {};
  for (const screen of SCREENS) {
    for (const q of screen.questions) {
      switch (q.kind) {
        case "single":
          a[q.id] = q.values![0];
          break;
        case "multi":
          a[q.id] = [q.values![0], q.values![1]];
          break;
        case "freq":
          a[q.id] = "as_vezes";
          break;
        case "scale":
          a[q.id] = 3;
          break;
        case "yesno":
          a[q.id] = "nao";
          break;
        case "open":
          break; // opcional
      }
    }
  }
  return a;
}

describe("survey-schema — estrutura (FUNIL-PERGUNTAS aprovado 2026-07-11)", () => {
  it("tem 6 telas de perguntas e 24 itens (q25 = e-mail, fora do answers)", () => {
    expect(SCREENS).toHaveLength(6);
    const ids = SCREENS.flatMap((s) => s.questions.map((q) => q.id));
    expect(ids).toHaveLength(24);
    expect(new Set(ids).size).toBe(24);
    expect(ids[0]).toBe("q1");
    expect(ids[ids.length - 1]).toBe("q24");
  });

  it("só q19 e q21 têm 'prefiro não responder' (itens sensíveis da tela 5)", () => {
    const pnrIds = SCREENS.flatMap((s) => s.questions)
      .filter((q) => q.pnr)
      .map((q) => q.id);
    expect(pnrIds).toEqual(["q19", "q21"]);
  });
});

describe("survey-schema — validação", () => {
  it("aceita payload completo válido e devolve objeto limpo", () => {
    const r = validateAnswers(fullValidAnswers());
    expect(r.ok).toBe(true);
    if (r.ok) expect(Object.keys(r.clean)).toHaveLength(22); // 24 - 2 abertas vazias
  });

  it("rejeita valor fora do domínio", () => {
    const a = fullValidAnswers();
    a.q1 = "17-e-meio";
    expect(validateAnswers(a)).toEqual({ ok: false, error: "invalid_q1" });
  });

  it("rejeita fechada faltando", () => {
    const a = fullValidAnswers();
    delete a.q18;
    expect(validateAnswers(a)).toEqual({ ok: false, error: "missing_q18" });
  });

  it("PNR só passa onde o item é sensível", () => {
    const a = fullValidAnswers();
    a.q19 = PNR; // sensível → ok
    a.q21 = PNR; // sensível → ok
    expect(validateAnswers(a).ok).toBe(true);
    a.q22 = PNR; // NÃO sensível → rejeita
    expect(validateAnswers(a)).toEqual({ ok: false, error: "invalid_q22" });
  });

  it("escala aceita só inteiro 1..5", () => {
    const spec = { id: "q11", kind: "scale" as const };
    expect(isValidAnswer(spec, 1)).toBe(true);
    expect(isValidAnswer(spec, 5)).toBe(true);
    expect(isValidAnswer(spec, 0)).toBe(false);
    expect(isValidAnswer(spec, 6)).toBe(false);
    expect(isValidAnswer(spec, 3.5)).toBe(false);
    expect(isValidAnswer(spec, "3")).toBe(false);
  });

  it("multi exige ≥1, sem duplicata, tudo no domínio", () => {
    const spec = SCREENS[0].questions.find((q) => q.id === "q6")!;
    expect(isValidAnswer(spec, [])).toBe(false);
    expect(isValidAnswer(spec, ["instagram", "instagram"])).toBe(false);
    expect(isValidAnswer(spec, ["instagram", "orkut"])).toBe(false);
    expect(isValidAnswer(spec, ["instagram", "tiktok", "whatsapp"])).toBe(true);
  });

  it("aberta é opcional, aparada e com teto de tamanho; extra fora do esquema não entra", () => {
    const a = fullValidAnswers();
    a.q23 = "  minha história  ";
    (a as Record<string, unknown>).hacker = "payload";
    (a as Record<string, unknown>).q24 = "x".repeat(OPEN_MAX_LEN + 500);
    const r = validateAnswers(a);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.clean.q23).toBe("minha história");
      expect((r.clean.q24 as string).length).toBe(OPEN_MAX_LEN);
      expect("hacker" in r.clean).toBe(false);
    }
  });

  it("rejeita payload que não é objeto", () => {
    expect(validateAnswers(null).ok).toBe(false);
    expect(validateAnswers([1, 2]).ok).toBe(false);
    expect(validateAnswers("oi").ok).toBe(false);
  });
});
