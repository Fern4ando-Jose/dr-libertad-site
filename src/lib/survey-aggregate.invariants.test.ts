import { describe, expect, it } from "vitest";
import { aggregate, toCsv, type SurveyRow } from "./survey-aggregate";
import { PNR, SCREENS, type Answers } from "./survey-schema";

function fullAnswers(over: Answers = {}): Answers {
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
          break;
      }
    }
  }
  return { ...a, ...over };
}

function row(over: Partial<SurveyRow> = {}): SurveyRow {
  return {
    id: 1,
    lang: "br",
    answers: fullAnswers(),
    email: null,
    source: {},
    created_at: "2026-07-30T10:00:00.000Z",
    ...over,
  };
}

describe("survey-aggregate — o que o painel mostra", () => {
  it("banco vazio não quebra nem inventa número", () => {
    const agg = aggregate([]);
    expect(agg.totals).toMatchObject({ total: 0, br: 0, es: 0, withEmail: 0, withOpen: 0, first: null, last: null });
    expect(agg.byDay).toEqual([]);
    expect(agg.bySource).toEqual([]);
    expect(agg.questions.every((q) => q.answered === 0)).toBe(true);
  });

  it("conta por idioma, e linha antiga 'pt' entra no BR", () => {
    const agg = aggregate([row({ id: 1 }), row({ id: 2, lang: "es" }), row({ id: 3, lang: "pt" })]);
    expect(agg.totals).toMatchObject({ total: 3, br: 2, es: 1 });
  });

  it("marca quem deixou e-mail e quem escreveu história", () => {
    const agg = aggregate([
      row({ id: 1, email: "a@b.com" }),
      row({ id: 2, answers: fullAnswers({ q23: "minha história" }) }),
      row({ id: 3, answers: fullAnswers({ q23: "   " }) }), // em branco não conta
    ]);
    expect(agg.totals.withEmail).toBe(1);
    expect(agg.totals.withOpen).toBe(1);
  });

  it("série por dia sai em ordem cronológica", () => {
    const agg = aggregate([
      row({ id: 1, created_at: "2026-07-30T23:00:00.000Z" }),
      row({ id: 2, created_at: "2026-07-28T01:00:00.000Z", lang: "es" }),
      row({ id: 3, created_at: "2026-07-30T02:00:00.000Z" }),
    ]);
    expect(agg.byDay.map((d) => d.day)).toEqual(["2026-07-28", "2026-07-30"]);
    expect(agg.byDay[1]).toMatchObject({ br: 2, es: 0, total: 2 });
  });

  it("quebra por campanha, do maior para o menor, com 'direto' para quem chegou sem utm", () => {
    const agg = aggregate([
      row({ id: 1, source: { s: "ig", m: "cpc", c: "pesq" } }),
      row({ id: 2, source: { s: "ig", m: "cpc", c: "pesq" } }),
      row({ id: 3, source: {} }),
    ]);
    expect(agg.bySource[0]).toMatchObject({ key: "ig / cpc / pesq", total: 2 });
    expect(agg.bySource[1]).toMatchObject({ key: "direto", total: 1 });
  });

  it("PNR é MISSING: conta separado e fica fora da média da escala", () => {
    const agg = aggregate([
      row({ id: 1, answers: fullAnswers({ q19: 5 }) }),
      row({ id: 2, answers: fullAnswers({ q19: PNR }) }),
    ]);
    const q19 = agg.questions.find((q) => q.id === "q19")!;
    expect(q19.answered).toBe(2);
    expect(q19.pnr).toBe(1);
    expect(q19.mean).toBe(5); // só a resposta numérica entra
    expect(q19.counts[PNR]).toBe(1);
  });

  it("item invertido (q9) traz a média corrigida ao lado da crua", () => {
    const agg = aggregate([row({ id: 1, answers: fullAnswers({ q9: 4 }) })]);
    const q9 = agg.questions.find((q) => q.id === "q9")!;
    expect(q9.reverse).toBe(true);
    expect(q9.mean).toBe(4);
    expect(q9.meanReversed).toBe(2); // 6 − 4
  });

  it("múltipla escolha conta UMA vez por marcação", () => {
    const agg = aggregate([
      row({ id: 1, answers: fullAnswers({ q6: ["instagram", "tiktok"] }) }),
      row({ id: 2, answers: fullAnswers({ q6: ["instagram"] }) }),
    ]);
    const q6 = agg.questions.find((q) => q.id === "q6")!;
    expect(q6.answered).toBe(2);
    expect(q6.counts.instagram).toBe(2);
    expect(q6.counts.tiktok).toBe(1);
  });

  it("histórias saem das mais novas para as mais velhas", () => {
    const agg = aggregate([
      row({ id: 1, created_at: "2026-07-01T00:00:00.000Z", answers: fullAnswers({ q23: "velha" }) }),
      row({ id: 2, created_at: "2026-07-20T00:00:00.000Z", answers: fullAnswers({ q23: "nova" }) }),
    ]);
    const q23 = agg.questions.find((q) => q.id === "q23")!;
    expect(q23.open.map((o) => o.text)).toEqual(["nova", "velha"]);
  });
});

describe("survey-aggregate — CSV", () => {
  it("uma linha por resposta, multi separado por | e vírgula escapada", () => {
    const csv = toCsv([
      row({ id: 7, source: { s: "ig" }, email: "a@b.com", answers: fullAnswers({ q23: 'ele disse "oi", eu não' }) }),
    ]);
    const [header, line] = csv.split("\n");
    expect(header.startsWith("id,created_at,lang,utm_source,utm_medium,utm_campaign,utm_content,email,q1")).toBe(true);
    expect(line).toContain("instagram|tiktok");
    expect(line).toContain('"ele disse ""oi"", eu não"');
  });

  it("export sem e-mail não leva a coluna de e-mail", () => {
    const csv = toCsv([row({ email: "a@b.com" })], false);
    expect(csv.split("\n")[0]).not.toContain("email");
    expect(csv).not.toContain("a@b.com");
  });
});
