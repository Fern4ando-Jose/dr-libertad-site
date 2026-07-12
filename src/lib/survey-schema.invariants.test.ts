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

describe("survey-schema — estrutura (FUNIL v2, 2026-07-11)", () => {
  it("tem 6 telas de perguntas e 24 itens (q25 = e-mail, fora do answers)", () => {
    expect(SCREENS).toHaveLength(6);
    const ids = SCREENS.flatMap((s) => s.questions.map((q) => q.id));
    expect(ids).toHaveLength(24);
    expect(new Set(ids).size).toBe(24);
    expect(ids[0]).toBe("q1");
    expect(ids[ids.length - 1]).toBe("q24");
  });

  it("v2: PNR em TODOS os 5 itens da tela 5 (veredito do dono — a promessa do subtítulo manda)", () => {
    const pnrIds = SCREENS.flatMap((s) => s.questions)
      .filter((q) => q.pnr)
      .map((q) => q.id);
    expect(pnrIds).toEqual(["q18", "q19", "q20", "q21", "q22"]);
  });

  it("v2: q9 é o ÚNICO item reverso (inverter escala antes de agregar) e é escala", () => {
    const reversed = SCREENS.flatMap((s) => s.questions).filter((q) => q.reverse);
    expect(reversed.map((q) => q.id)).toEqual(["q9"]);
    expect(reversed[0].kind).toBe("scale");
  });

  it("v2: q13 tem a opção extra 'nunca conheci alguém que vi primeiro online'; q17 virou frequência", () => {
    const all = SCREENS.flatMap((s) => s.questions);
    const q13 = all.find((q) => q.id === "q13")!;
    expect(q13.extra).toBe("nunca_conheci_online");
    const q17 = all.find((q) => q.id === "q17")!;
    expect(q17.kind).toBe("freq");
    // q13 é o único item com `extra`
    expect(all.filter((q) => q.extra).map((q) => q.id)).toEqual(["q13"]);
  });

  it("v2: tela 5 na ordem comportamento→percepção→comportamento→opinião→desfecho", () => {
    const tela5 = SCREENS[4];
    expect(tela5.questions.map((q) => `${q.id}:${q.kind}`)).toEqual([
      "q18:freq",
      "q19:scale",
      "q20:yesno",
      "q21:scale",
      "q22:yesno",
    ]);
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

  it("PNR passa em TODA a tela 5 (q18..q22) e só nela", () => {
    const a = fullValidAnswers();
    a.q18 = PNR; // freq sensível → ok
    a.q19 = PNR; // ESCALA sensível (v2) → ok
    a.q20 = PNR; // yesno sensível → ok
    a.q21 = PNR; // opinião (veredito: PNR = missing na análise) → ok
    a.q22 = PNR; // desfecho (veredito: PNR = missing na análise) → ok
    expect(validateAnswers(a).ok).toBe(true);
    const b = fullValidAnswers();
    b.q11 = PNR; // escala fora da tela 5 NÃO aceita PNR
    expect(validateAnswers(b)).toEqual({ ok: false, error: "invalid_q11" });
    const d = fullValidAnswers();
    d.q13 = PNR; // frequência fora da tela 5 NÃO aceita PNR (extra ≠ PNR)
    expect(validateAnswers(d)).toEqual({ ok: false, error: "invalid_q13" });
  });

  it("opção extra do q13 passa; a mesma string em outra frequência é rejeitada", () => {
    const a = fullValidAnswers();
    a.q13 = "nunca_conheci_online";
    expect(validateAnswers(a).ok).toBe(true);
    const b = fullValidAnswers();
    b.q10 = "nunca_conheci_online";
    expect(validateAnswers(b)).toEqual({ ok: false, error: "invalid_q10" });
  });

  it("escala aceita só inteiro 1..5 (fora do PNR sensível)", () => {
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
