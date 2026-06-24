import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { seedForDay, cacheKey, falRequestBody, framingFor, buildPrompt } from "./illustration";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE MULTI-IDIOMA: a ILUSTRAÇÃO (arte da IA) é ÚNICA por post/dia e
// COMPARTILHADA entre as contas (ES, PT, …). Só a COPY muda por idioma.
// (Regra do CLAUDE.md: "Mesma máquina (footage, render, design); muda só a copy,
//  o @handle, o nome e as hashtags por idioma.")
//
// Histórico: já houve regressão gerando 2 imagens DIFERENTES (uma por conta),
// porque a chamada à fal não tinha seed. Estes testes BARRAM essa volta no CI.
// ─────────────────────────────────────────────────────────────────────────────

describe("seed determinístico (imagem idêntica entre idiomas)", () => {
  it("mesmo (cat, subject, dia) → mesmo seed (ES e PT batem)", () => {
    const es = seedForDay("freedom", "una persona rompiendo cadenas", "2026-06-17");
    const pt = seedForDay("freedom", "una persona rompiendo cadenas", "2026-06-17");
    expect(pt).toBe(es);
  });

  it("o seed NÃO depende de idioma: a função sequer recebe lang", () => {
    expect(seedForDay.length).toBeLessThanOrEqual(3); // (cat, subject, day?) — sem param de idioma
  });

  it("dia diferente → seed diferente (variação diária)", () => {
    const d1 = seedForDay("freedom", "x", "2026-06-17");
    const d2 = seedForDay("freedom", "x", "2026-06-18");
    expect(d1).not.toBe(d2);
  });

  it("subject diferente → seed diferente", () => {
    const a = seedForDay("freedom", "subject A", "2026-06-17");
    const b = seedForDay("freedom", "subject B", "2026-06-17");
    expect(a).not.toBe(b);
  });

  it("seed é inteiro não-negativo em faixa segura p/ a fal", () => {
    const s = seedForDay("calm", "algum subject", "2026-06-17");
    expect(Number.isInteger(s)).toBe(true);
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(2_000_000_000);
  });
});

// Anti-repetição VISUAL: o enquadramento varia por subject (temas vizinhos no feed
// não saem com o mesmo quadro), mas é DETERMINÍSTICO (ES e PT do mesmo subject batem)
// e entra no prompt. (Erro "Repetição VISUAL" no HISTORICO-ERROS.)
describe("framingFor — enquadramento rotativo (anti capa repetida)", () => {
  it("determinístico: mesmo subject → mesmo enquadramento (ES e PT batem)", () => {
    expect(framingFor("a lone figure in a doorway")).toBe(framingFor("a lone figure in a doorway"));
  });
  it("não depende de idioma (só do subject, que é compartilhado)", () => {
    expect(framingFor.length).toBe(1); // só (subject)
  });
  it("subjects diferentes podem cair em enquadramentos diferentes (há variedade)", () => {
    const got = new Set([
      "a", "uma porta fechada", "a figure walking into light", "fragile glass figures",
      "a calm figure unplugging cables", "a paralyzed figure before a shelf",
    ].map(framingFor));
    expect(got.size).toBeGreaterThan(1);
  });
  it("o enquadramento escolhido entra no prompt", () => {
    const subject = "a single closed door against a storm";
    expect(buildPrompt(subject, "amber", "#C8862B")).toContain(framingFor(subject));
  });
});

describe("corpo da requisição à fal SEMPRE tem seed", () => {
  it("falRequestBody inclui o seed passado (guarda contra voltar ao 'sem seed')", () => {
    const body = falRequestBody("um prompt qualquer", 12345);
    expect(body).toHaveProperty("seed", 12345);
    expect(typeof body.seed).toBe("number");
  });
});

describe("cache da ilustração é compartilhado entre idiomas", () => {
  it("a cacheKey NÃO inclui idioma → ES e PT leem/escrevem a MESMA entrada", () => {
    const k = cacheKey("fal-ai/flux/dev", "freedom", "subject");
    expect(k).toBe("fal-ai/flux/dev|freedom|subject");
    expect(k).not.toMatch(/\b(es|pt|lang)\b/);
  });
});

// COMPORTAMENTAL — o fix da CORRIDA ES/PT: havendo a ilustração do dia no cache,
// o 2º idioma REUSA e NUNCA chama a fal (senão paga 2×, que era o bug de custo).
describe("cache HIT reusa e NÃO repaga a fal (anti-corrida ES/PT)", () => {
  beforeEach(() => {
    process.env.FAL_KEY = "test-key";
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("com ilustração cacheada do dia, REUSA e nunca chama fal.run", async () => {
    const CACHED = "https://blob.test/cover.jpg";
    vi.doMock("@vercel/postgres", () => ({ sql: async () => ({ rows: [{ url: CACHED }] }) }));
    const fetched: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (u: unknown) => {
      fetched.push(String(u));
      return { ok: true, status: 200, text: async () => "", json: async () => ({}) } as unknown as Response;
    }));
    const { generateIllustration } = await import("./illustration");
    const res = await generateIllustration("uma corrente que se rompe", "freedom", { useCache: true, automation: "ig-posts" });
    expect(res.cached).toBe(true);
    expect(res.url).toBe(CACHED);
    // o 2º idioma NÃO pode ter chamado a fal (seria pagar de novo)
    expect(fetched.some((u) => u.includes("fal.run"))).toBe(false);
  });
});
