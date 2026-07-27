import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { seedForDay, cacheKey, falRequestBody, framingFor, FIXED_FRAMING, buildPrompt, isTransientCoverFailure } from "./illustration";

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

// ─────────────────────────────────────────────────────────────────────────────
// GUARD ANTI-CORTE (o "literal-lock" da CAPA). Causa-raiz provada: o enquadramento
// ROTATIVO (a22a0e0c) sorteava "extreme close-up filling the frame" e "subject small
// within a vast space" → o sujeito saía CORTADO/encolhido = a "capa cortada" que o
// dono vetou. Foi removido no fix c86ca9a0, mas REGREDIU no revert amplo 673a36bc e
// voltou ao feed. Estes invariantes BLOQUEIAM a volta: se alguém reintroduzir o
// rotativo (por revert ou edição), o CI fica VERMELHO antes de qualquer deploy.
// ─────────────────────────────────────────────────────────────────────────────
describe("GUARD anti-corte — enquadramento TRAVADO em figura grande/centralizada", () => {
  const SUBJECTS = [
    "a lone figure in a doorway", "uma porta fechada", "a figure walking into light",
    "fragile glass figures", "a calm figure unplugging cables", "a paralyzed figure before a shelf",
  ];

  it("framingFor SEMPRE devolve o enquadramento fixo aprovado (sem sorteio de plano)", () => {
    const got = new Set(SUBJECTS.map(framingFor));
    expect(got.size).toBe(1);                    // um único quadro p/ todos → nada de rotação
    expect([...got][0]).toBe(FIXED_FRAMING);
  });

  it("o enquadramento fixo é figura GRANDE, prominente e NÃO cortada", () => {
    expect(FIXED_FRAMING).toContain("large");
    expect(FIXED_FRAMING).toContain("prominent");
    expect(FIXED_FRAMING).toMatch(/never cropped/i);
  });

  it("o prompt PROÍBE os enquadramentos que cortam/encolhem (regressão do rotativo)", () => {
    for (const s of SUBJECTS) {
      const p = buildPrompt(s, "amber", "#C8862B");
      expect(p).toContain(FIXED_FRAMING);
      // frases exatas do rotativo vetado — NUNCA podem reaparecer no prompt:
      expect(p).not.toMatch(/extreme close-up/i);
      expect(p).not.toMatch(/subject small within a vast/i);
      expect(p).not.toMatch(/wide establishing shot/i);
    }
  });
});

describe("buildPrompt — capa preenche o post (full-bleed, sem moldura interna)", () => {
  it("exige sangria total e proíbe moldura/margem interna (mesmo em tema 'no people')", () => {
    const p = buildPrompt("a still calm pond with a single ripple, no people", "olive", "#5B6B3C");
    expect(p).toContain("full-bleed");
    expect(p).toMatch(/no (inner )?frame/i);
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

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE: TRANSITÓRIA (infra/billing) × CONTEÚDO (QA reprovou). RAIZ do
// "carrossel #4/#5 desiste o dia todo" quando a fal fica SEM SALDO (HTTP 403
// "Exhausted balance"): esse 403 é RECUPERÁVEL (volta com o saldo) e NÃO é culpa do
// tema → o chamador deve fazer retry no mesmo dia e NUNCA colocar o tema em quarentena
// de 7d. Já uma imagem GERADA mas reprovada pelo juiz é falha de CONTEÚDO → desistência
// dura + quarentena. Estes testes travam a classificação no CI.
// ─────────────────────────────────────────────────────────────────────────────
describe("isTransientCoverFailure (billing/infra é recuperável; QA reprovado não)", () => {
  it("url=null + transient=true (saldo fal/infra) → RECUPERÁVEL (true)", () => {
    expect(isTransientCoverFailure({ url: null, transient: true, error: "fal HTTP 403: Exhausted balance" })).toBe(true);
  });
  it("url=null + transient=false (imagem gerada, QA reprovou) → NÃO recuperável (false)", () => {
    expect(isTransientCoverFailure({ url: null, transient: false, error: "todas reprovadas pelo juiz" })).toBe(false);
  });
  it("url=null sem transient (default) → NÃO recuperável (false) — conservador", () => {
    expect(isTransientCoverFailure({ url: null, error: "subject vazio" })).toBe(false);
  });
  it("sucesso (url≠null) NUNCA é falha, mesmo com transient marcado", () => {
    expect(isTransientCoverFailure({ url: "https://blob/cover.jpg", transient: true })).toBe(false);
  });
});

describe("generateIllustration marca a falha da fal como TRANSITÓRIA", () => {
  beforeEach(() => {
    process.env.FAL_KEY = "test-key";
    vi.resetModules();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("fal HTTP 403 (saldo esgotado) → url=null e transient=true (retry + sem quarentena)", async () => {
    // Sem cache (useCache:false) → vai direto à fal, que responde 403 "Exhausted balance".
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: false,
      status: 403,
      text: async () => '{"detail": "User is locked. Reason: Exhausted balance."}',
      json: async () => ({}),
    } as unknown as Response)));
    const { generateIllustration, isTransientCoverFailure } = await import("./illustration");
    const res = await generateIllustration("uma corrente que se rompe", "freedom", { useCache: false, maxTries: 1, automation: "ig-posts" });
    expect(res.url).toBeNull();
    expect(res.transient).toBe(true);
    expect(isTransientCoverFailure(res)).toBe(true);
  });

  it("FAL_KEY ausente no runtime → transient=true (volta sem redeploy)", async () => {
    delete process.env.FAL_KEY;
    const { generateIllustration } = await import("./illustration");
    const res = await generateIllustration("x", "freedom", { useCache: false, automation: "ig-posts" });
    expect(res.url).toBeNull();
    expect(res.transient).toBe(true);
  });
});
