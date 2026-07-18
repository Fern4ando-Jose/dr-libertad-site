import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FOOTAGE_LIBRARY } from "./footage-library";
import { FOOTAGE_SOURCES, type FootageSourceKey, type FootageCandidate } from "./footage-providers";
import { liveClipMatchesTheme, type ThemeWho } from "./footage-subject";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE: **as 4 fontes de footage funcionam no caminho NORMAL.**
//
// Ordem do dono (2026-07-17): "foram apresentadas 4 fontes e estamos usando só uma — as
// que constam no código devem funcionar".
//
// Defeito de origem: `selectFootage` tinha 2 caminhos — (1) whitelist curada
// (FOOTAGE_LIBRARY: 69 clipes, 100% videos.pexels.com) e (2) busca ao vivo, o ÚNICO lugar
// onde Pexels-FOTO e Pixabay (vídeo/foto) existem. A busca ao vivo só rodava
// `if (picked.length < numClips)` — e a whitelist SEMPRE entregava as 5 cenas (o menor
// combo cat×who entrega 5) → o harvest NUNCA rodava → 3 das 4 fontes eram
// **inalcançáveis**, mesmo com PIXABAY_API_KEY posta no cofre e na Vercel. Não faltava
// chave: faltava CAMINHO.
//
// Agora a whitelist entrega `numClips - FOOTAGE_LIVE_SLOTS` cenas e o resto vem ao vivo.
//
// 2026-07-17 (2ª ordem do dono, ao ver a MESMA capa em Reels de 15/07 e 17/07): "não
// quero vídeos repetidos; se o acervo está defasado, não pode ser usado" → o DEFAULT
// subiu de 2 para 5 (Reel inteiro, capa inclusive, da busca AO VIVO); a whitelist virou
// SÓ colchão de fail-open. Estes testes travam as promessas dessa mudança:
//   1. as 4 fontes são REALMENTE alcançáveis sem a whitelist ter falhado — e, por
//      default, TODAS as 5 cenas (capa inclusive) vêm ao vivo;
//   2. ES e PT continuam idênticos;
//   3. fail-open: busca morta → Reel sai com whitelist, NUNCA vazio;
//   4. tema `man` nunca recebe `woman` — nem da whitelist, nem do material ao vivo;
//   5. FOOTAGE_LIVE_SLOTS=0 → comportamento IDÊNTICO ao de antes (botão de pânico);
//   6. clipe usado nos últimos 14 dias (avoid, cross-fonte) NUNCA entra pelo harvest
//      enquanto houver candidato fresco — o coração do "não quero vídeos repetidos".
// ─────────────────────────────────────────────────────────────────────────────

const NUM_CLIPS = 5;

// ── Dublês ───────────────────────────────────────────────────────────────────
// O harvest é I/O puro (2 APIs + o juiz de visão). Mockamos as BORDAS e deixamos toda a
// lógica de selectFootage rodar de verdade — é ela que está sob teste.

const buscaAoVivo = vi.fn<(k: FootageSourceKey, term: string) => Promise<FootageCandidate[]>>();
// `paid` (2026-07-18): o juiz real declara se a chamada FOI COBRADA (resposta 200) — o
// teto de custo do harvest conta SÓ isso. Erro HTTP/rede e "sem poster" = paid:false.
const juiz = vi.fn<(id: number) => Promise<{ reject: boolean; reason: string; who?: string; cached: boolean; paid: boolean }>>();
// Linhas da reel_shared_cache que o recentClipUses enxerga; `null` = banco FORA (throw).
let linhasDoBanco: Array<{ cache_key: string; clips: string[]; created_at: string }> | null = [];

vi.mock("@/lib/footage-providers", async (importOriginal) => {
  const real = await importOriginal<typeof import("./footage-providers")>();
  return { ...real, searchBySourceKey: (k: FootageSourceKey, term: string) => buscaAoVivo(k, term) };
});

vi.mock("@/lib/footage-qa", () => ({
  judgeFootagePosterCached: (id: number) => juiz(id),
}));

vi.mock("@vercel/postgres", () => ({
  sql: () => {
    if (linhasDoBanco === null) throw new Error("banco fora");
    return Promise.resolve({ rows: linhasDoBanco });
  },
}));

// Importado DEPOIS dos mocks (vi.mock é içado, mas o import dinâmico deixa isto explícito).
const { selectFootage, pickFromWhitelist, liveSlotsFor } = await import("./reel-shared");

// Candidato ao vivo de uma fonte, com sujeito declarado (o que o juiz devolve).
const candidato = (k: FootageSourceKey, i: number, who = "none"): FootageCandidate & { who: string } => ({
  url: `https://live.test/${k}/${i}.${k.endsWith("photo") ? "jpg" : "mp4"}`,
  poster: `https://live.test/${k}/${i}.jpg`,
  mediaType: k.endsWith("photo") ? "photo" : "video",
  source: k.startsWith("pixabay") ? "pixabay" : "pexels",
  sourceId: i,
  width: 1080,
  height: 1920,
  who,
});

// Registro who por URL, p/ o juiz mockado responder o sujeito do candidato certo.
const whoPorUrl = new Map<string, string | undefined>();
const URL_POR_ID = new Map<number, string>();

/** Juiz que aprova tudo e devolve o `who` registrado do candidato. Veredito real = cobrado. */
function juizAprovaTudo(cached = false) {
  juiz.mockImplementation(async (id) => {
    const url = URL_POR_ID.get(id);
    return { reject: false, reason: "clear scene", who: url ? whoPorUrl.get(url) : "none", cached, paid: !cached };
  });
}

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.stubEnv("PEXELS_API_KEY", "pexels-fake");
  vi.stubEnv("PIXABAY_API_KEY", "pixabay-fake");
  vi.stubEnv("ANTHROPIC_API_KEY", "anthropic-fake");
  vi.stubEnv("FOOTAGE_LIVE_SLOTS", ""); // default (5 — Reel inteiro ao vivo)
  linhasDoBanco = [];
  whoPorUrl.clear();
  URL_POR_ID.clear();
  buscaAoVivo.mockReset();
  juiz.mockReset();
  // O juiz recebe o qaCacheId (source,id) — mapeamos id→url via a própria oferta.
  buscaAoVivo.mockImplementation(async () => []);
  juiz.mockImplementation(async () => ({ reject: false, reason: "ok", who: "none", cached: false, paid: true }));
});

afterEach(() => vi.unstubAllEnvs());

// O juiz mockado recebe só o id; p/ saber o `who` do candidato, interceptamos a oferta e
// indexamos id→url. `qaCacheId(sourceKey,id) = id*10 + tag`, injetivo — reconstruímos.
function indexarOferta(n = 6, whoDe: (k: FootageSourceKey) => string | undefined = () => "none") {
  const TAG: Record<FootageSourceKey, number> = {
    "pexels-video": 0, "pexels-photo": 1, "pixabay-video": 2, "pixabay-photo": 3,
  };
  buscaAoVivo.mockImplementation(async (k) => {
    const who = whoDe(k);
    return Array.from({ length: n }, (_, i) => {
      const c = candidato(k, i + 1, who ?? "none");
      whoPorUrl.set(c.url, who);
      URL_POR_ID.set(c.sourceId * 10 + TAG[k], c.url);
      return c;
    });
  });
}

const éAoVivo = (u: string) => u.startsWith("https://live.test/");
const fonteDe = (u: string) => u.replace("https://live.test/", "").split("/")[0] as FootageSourceKey;

// ── 1. As 4 fontes são alcançáveis SEM a whitelist ter falhado ───────────────
describe("1. as 4 fontes funcionam no caminho NORMAL (a whitelist NÃO falha)", () => {
  it("a whitelist SOZINHA daria as 5 cenas — é essa a premissa do defeito", () => {
    // Se este teste cair, o resto não prova nada: o harvest poderia estar rodando só
    // porque a whitelist secou (= o comportamento ANTIGO), não porque abrimos o caminho.
    for (const cat of Object.keys(FOOTAGE_LIBRARY)) {
      expect(pickFromWhitelist(cat, 12345, NUM_CLIPS, new Set())).toHaveLength(NUM_CLIPS);
    }
  });

  it("com a whitelist CHEIA, a busca ao vivo é chamada mesmo assim (era o bug)", async () => {
    indexarOferta();
    juizAprovaTudo();
    const clips = await selectFootage(["person alone"], "self", 12345, NUM_CLIPS, "self|2026-07-17");
    expect(buscaAoVivo).toHaveBeenCalled(); // ← ANTES desta mudança: 0 chamadas, para sempre
    expect(clips).toHaveLength(NUM_CLIPS);
    expect(clips.filter(éAoVivo)).toHaveLength(NUM_CLIPS); // default 5: Reel INTEIRO ao vivo
  });

  it("DEFAULT: as 5 cenas (capa inclusive) vêm da busca ao vivo quando o harvest entrega", async () => {
    indexarOferta();
    juizAprovaTudo();
    for (const seed of [3, 55, 909, 12345]) {
      const clips = await selectFootage(["a"], "freedom", seed, NUM_CLIPS, "k");
      expect(clips).toHaveLength(NUM_CLIPS);
      expect(clips.every(éAoVivo)).toBe(true); // zero cenas da whitelist no caminho feliz
    }
  });

  it("as 4 fontes (Pexels vídeo/foto + Pixabay vídeo/foto) são REALMENTE consultadas", async () => {
    indexarOferta();
    juizAprovaTudo();
    const consultadas = new Set<FootageSourceKey>();
    for (const seed of Array.from({ length: 20 }, (_, i) => i * 7919 + 13)) {
      buscaAoVivo.mockClear();
      await selectFootage(["a", "b"], "mind", seed, NUM_CLIPS, "k");
      for (const [k] of buscaAoVivo.mock.calls) consultadas.add(k);
    }
    expect([...consultadas].sort()).toEqual([...FOOTAGE_SOURCES].sort());
  });

  it("as 3 fontes que a whitelist NÃO tem (Pexels-foto, Pixabay vídeo/foto) chegam ao Reel", async () => {
    indexarOferta();
    juizAprovaTudo();
    const entregues = new Set<FootageSourceKey>();
    for (const seed of Array.from({ length: 60 }, (_, i) => i * 7919 + 13)) {
      const clips = await selectFootage(["a"], "dopamine", seed, NUM_CLIPS, "k");
      for (const u of clips.filter(éAoVivo)) entregues.add(fonteDe(u));
    }
    // O acervo curado é 100% videos.pexels.com; estas 3 só existem ao vivo.
    expect(entregues.has("pexels-photo")).toBe(true);
    expect(entregues.has("pixabay-video")).toBe(true);
    expect(entregues.has("pixabay-photo")).toBe(true);
  });

  it("com FOOTAGE_LIVE_SLOTS parcial (=2), a CAPA volta a vir do acervo curado (o env manda)", async () => {
    vi.stubEnv("FOOTAGE_LIVE_SLOTS", "2");
    indexarOferta();
    juizAprovaTudo();
    for (const seed of [3, 55, 909, 12345]) {
      const clips = await selectFootage(["a"], "freedom", seed, NUM_CLIPS, "k");
      expect(éAoVivo(clips[0])).toBe(false);
      expect(clips.filter(éAoVivo)).toHaveLength(2);
    }
  });

  it("com slots parciais, reservar cenas NÃO reembaralha a parte curada (prefixo do sorteio de sempre)", async () => {
    vi.stubEnv("FOOTAGE_LIVE_SLOTS", "2");
    indexarOferta();
    juizAprovaTudo();
    for (const seed of [11, 222, 3333]) {
      const clips = await selectFootage(["a"], "anxiety", seed, NUM_CLIPS, "k");
      const curados = clips.filter((u) => !éAoVivo(u));
      expect(curados).toEqual(pickFromWhitelist("anxiety", seed, NUM_CLIPS - 2, new Set()));
    }
  });
});

// ── 2. FOOTAGE_LIVE_SLOTS=0 → idêntico a hoje (botão de pânico) ──────────────
describe("2. FOOTAGE_LIVE_SLOTS=0 → comportamento IDÊNTICO ao de antes", () => {
  it("não chama a busca ao vivo NENHUMA vez e devolve o sorteio de sempre", async () => {
    vi.stubEnv("FOOTAGE_LIVE_SLOTS", "0");
    indexarOferta();
    juizAprovaTudo();
    for (const cat of Object.keys(FOOTAGE_LIBRARY)) {
      for (const seed of [1, 999, 12345]) {
        const clips = await selectFootage(["a"], cat, seed, NUM_CLIPS, "k");
        expect(clips).toEqual(pickFromWhitelist(cat, seed, NUM_CLIPS, new Set()));
      }
    }
    expect(buscaAoVivo).not.toHaveBeenCalled();
    expect(juiz).not.toHaveBeenCalled(); // e não gasta 1 centavo
  });

  it("liveSlotsFor: default 5 (tudo ao vivo), clampado, e lixo no env → default (fail-open)", () => {
    expect(liveSlotsFor(5, undefined)).toBe(5);
    expect(liveSlotsFor(5, "")).toBe(5);
    expect(liveSlotsFor(5, "0")).toBe(0);
    expect(liveSlotsFor(5, "3")).toBe(3);
    expect(liveSlotsFor(5, "99")).toBe(5); // teto = o Reel inteiro (a whitelist segue de colchão)
    expect(liveSlotsFor(5, "-4")).toBe(0);
    expect(liveSlotsFor(5, "abc")).toBe(5);
    expect(liveSlotsFor(1, "2")).toBe(1); // 1 cena → 1 ao vivo (clamp em numClips)
    expect(liveSlotsFor(3, undefined)).toBe(3); // Reel menor → default clampa no total de cenas
  });
});

// ── 3. FAIL-OPEN: nunca um Reel sem footage por causa desta mudança ──────────
describe("3. fail-open duro — o Reel SEMPRE sai com 5 cenas", () => {
  const cenários: Array<[string, () => void]> = [
    ["busca ao vivo EXPLODE (throw)", () => buscaAoVivo.mockRejectedValue(new Error("API fora"))],
    ["busca ao vivo devolve VAZIO", () => buscaAoVivo.mockResolvedValue([])],
    ["QA REJEITA tudo", () => { indexarOferta(); juiz.mockResolvedValue({ reject: true, reason: "skin macro", cached: false, paid: true }); }],
    ["sem PEXELS_API_KEY nem PIXABAY_API_KEY", () => { vi.stubEnv("PEXELS_API_KEY", ""); vi.stubEnv("PIXABAY_API_KEY", ""); indexarOferta(); juizAprovaTudo(); }],
    ["sem termos de busca (videoQueries vazio e categoria desconhecida)", () => { buscaAoVivo.mockResolvedValue([]); }],
  ];

  it.each(cenários)("%s → 5 cenas distintas, todas da whitelist", async (_nome, montar) => {
    montar();
    for (const cat of Object.keys(FOOTAGE_LIBRARY)) {
      const clips = await selectFootage(["a"], cat, 4242, NUM_CLIPS, "k");
      expect(clips).toHaveLength(NUM_CLIPS);
      expect(new Set(clips).size).toBe(NUM_CLIPS);
      expect(clips).toEqual(pickFromWhitelist(cat, 4242, NUM_CLIPS, new Set()));
    }
  });

  it("sem ANTHROPIC_API_KEY: QA pulado → em tema COM sujeito, o ao vivo não entra (fail-closed)", async () => {
    // Sem chave o juiz não julga NEM diz o sujeito → em tema com `who` declarado o material
    // ao vivo fica de fora e a whitelist enche o Reel. Em tema SEM `who` (a maioria) não há
    // o que casar → o ao vivo entra normalmente, como sempre.
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    indexarOferta();
    juiz.mockResolvedValue({ reject: false, reason: "sem ANTHROPIC_API_KEY — QA pulado", cached: false, paid: false });
    const comSujeito = await selectFootage(["a"], "self", 4242, NUM_CLIPS, "k", "man");
    expect(comSujeito.filter(éAoVivo)).toEqual([]);
    expect(comSujeito).toHaveLength(NUM_CLIPS);
    const semSujeito = await selectFootage(["a"], "self", 4242, NUM_CLIPS, "k");
    expect(semSujeito).toHaveLength(NUM_CLIPS);
  });

  it("busca ao vivo entrega MENOS que as cenas reservadas → whitelist completa o resto", async () => {
    // só 1 candidato no mundo inteiro, e só numa fonte
    buscaAoVivo.mockImplementation(async (k) => {
      if (k !== "pixabay-photo") return [];
      const c = candidato(k, 1, "none");
      URL_POR_ID.set(1 * 10 + 3, c.url);
      whoPorUrl.set(c.url, "none");
      return [c];
    });
    juizAprovaTudo();
    const clips = await selectFootage(["a"], "mind", 777, NUM_CLIPS, "k");
    expect(clips).toHaveLength(NUM_CLIPS);
    expect(new Set(clips).size).toBe(NUM_CLIPS);
    expect(clips.filter(éAoVivo)).toHaveLength(1); // o único que existia
  });

  it("nunca devolve URL duplicada dentro do mesmo Reel", async () => {
    indexarOferta(2); // pouca oferta → força a passada de relaxamento
    juizAprovaTudo();
    for (const seed of [1, 2, 3, 88, 12345]) {
      const clips = await selectFootage(["a"], "network", seed, NUM_CLIPS, "k");
      expect(new Set(clips).size).toBe(clips.length);
      expect(clips).toHaveLength(NUM_CLIPS);
    }
  });
});

// ── 4. ES = PT ───────────────────────────────────────────────────────────────
describe("4. ES e PT geram o MESMO vídeo", () => {
  it("mesmo (tópico,dia) → mesmo seed → mesmas 5 cenas, com material ao vivo no meio", async () => {
    indexarOferta();
    juizAprovaTudo();
    for (const seed of [1, 42, 999, 12345]) {
      const es = await selectFootage(["a", "b"], "self", seed, NUM_CLIPS, "self|2026-07-17");
      const pt = await selectFootage(["a", "b"], "self", seed, NUM_CLIPS, "self|2026-07-17");
      expect(pt).toEqual(es);
    }
  });

  it("BANCO FORA → ZERO cenas ao vivo → whitelist pura → ES=PT garantido (como hoje)", async () => {
    // Sem a reel_shared_cache de pé, o 2º idioma não tem como REUSAR o que o 1º achou ao
    // vivo — dois harvests independentes dariam vídeos diferentes. A trava: banco fora
    // desliga o ao vivo e devolve o determinismo puro. Determinismo > variedade.
    linhasDoBanco = null; // recentClipUses vai lançar
    indexarOferta();
    juizAprovaTudo();
    for (const cat of Object.keys(FOOTAGE_LIBRARY)) {
      const clips = await selectFootage(["a"], cat, 31337, NUM_CLIPS, "k");
      expect(clips.filter(éAoVivo)).toEqual([]);
      expect(clips).toEqual(pickFromWhitelist(cat, 31337, NUM_CLIPS, new Set()));
    }
    expect(buscaAoVivo).not.toHaveBeenCalled();
  });
});

// ── 5. O sujeito da imagem é o sujeito da frase — TAMBÉM ao vivo ────────────
describe("5. tema `man` nunca recebe `woman` — nem curado, nem ao vivo", () => {
  it("candidato ao vivo `woman` NUNCA entra em tema `man` (todas as fontes, muitos seeds)", async () => {
    indexarOferta(6, () => "woman"); // o mundo ao vivo só tem mulher
    juizAprovaTudo();
    for (const seed of Array.from({ length: 40 }, (_, i) => i * 7919 + 13)) {
      const clips = await selectFootage(["a"], "self", seed, NUM_CLIPS, "k", "man");
      expect(clips.filter(éAoVivo)).toEqual([]); // rejeitados pelo sujeito
      expect(clips).toHaveLength(NUM_CLIPS); // e o Reel sai igual, pela whitelist
      for (const u of clips) {
        const who = FOOTAGE_LIBRARY.self.find((c) => c.url === u)?.who;
        expect(who).not.toBe("woman");
        expect(who).not.toBe("couple");
      }
    }
  });

  it("candidato ao vivo `couple` não entra em tema `man`; `man`/`none`/`group` entram", async () => {
    for (const [who, deveEntrar] of [["man", true], ["none", true], ["group", true], ["woman", false], ["couple", false]] as const) {
      indexarOferta(6, () => who);
      juizAprovaTudo();
      const clips = await selectFootage(["a"], "self", 555, NUM_CLIPS, "k", "man");
      expect(clips.some(éAoVivo)).toBe(deveEntrar);
    }
  });

  it("FAIL-CLOSED: sujeito DESCONHECIDO ao vivo não entra em tema com `who` declarado", async () => {
    // É o caso da linha ANTIGA do footage_qa_cache (gravada antes da coluna `who`) e o do
    // QA pulado por falta de chave. Na whitelist "sem who" é fail-OPEN (o clipe foi curado
    // por gente); ao vivo ninguém olhou → não entra. O Reel sai igual, pela whitelist.
    indexarOferta(6, () => undefined);
    juiz.mockImplementation(async () => ({ reject: false, reason: "clear scene", who: undefined, cached: false, paid: true }));
    const clips = await selectFootage(["a"], "self", 555, NUM_CLIPS, "k", "man");
    expect(clips.filter(éAoVivo)).toEqual([]);
    expect(clips).toHaveLength(NUM_CLIPS);
  });

  it("tema SEM `who` aceita material ao vivo de qualquer sujeito (fail-open, como sempre)", async () => {
    indexarOferta(6, () => "woman");
    juizAprovaTudo();
    const clips = await selectFootage(["a"], "self", 555, NUM_CLIPS, "k", undefined);
    expect(clips.filter(éAoVivo).length).toBeGreaterThan(0);
  });

  it("liveClipMatchesTheme — a regra pura, nos dois sentidos", () => {
    // igual a clipMatchesTheme onde o sujeito é CONHECIDO…
    expect(liveClipMatchesTheme("man", "man")).toBe(true);
    expect(liveClipMatchesTheme("none", "man")).toBe(true);
    expect(liveClipMatchesTheme("group", "man")).toBe(true);
    expect(liveClipMatchesTheme("woman", "man")).toBe(false);
    expect(liveClipMatchesTheme("couple", "man")).toBe(false);
    expect(liveClipMatchesTheme("man", "woman")).toBe(false);
    expect(liveClipMatchesTheme("couple", "both")).toBe(true);
    // …e fail-CLOSED (≠ da whitelist) onde é DESCONHECIDO
    expect(liveClipMatchesTheme(undefined, "man")).toBe(false);
    expect(liveClipMatchesTheme(undefined, "woman")).toBe(false);
    expect(liveClipMatchesTheme(undefined, "both")).toBe(false);
    // tema sem sujeito declarado → sem restrição
    expect(liveClipMatchesTheme(undefined, undefined)).toBe(true);
    expect(liveClipMatchesTheme(undefined, "any")).toBe(true);
    expect(liveClipMatchesTheme("woman", "any")).toBe(true);
    expect(liveClipMatchesTheme("woman", "alien" as ThemeWho)).toBe(true); // valor futuro → fail-open
  });
});

// ── 6. Teto de custo do juiz ────────────────────────────────────────────────
describe("6. teto de vereditos PAGOS por Reel (protege o balde ig-reels)", () => {
  it("pilar/termo ruim (tudo rejeitado) não julga mais que o teto — e o Reel sai igual", async () => {
    // Sem o teto: 4 fontes × 20 candidatos × 7 rodadas de candidatos novos = centenas de
    // chamadas pagas num único Reel → o balde ig-reels (US$0,30/dia) estoura sozinho.
    indexarOferta(20);
    juiz.mockImplementation(async () => ({ reject: true, reason: "skin macro", cached: false, paid: true }));
    const clips = await selectFootage(["a"], "mind", 4242, NUM_CLIPS, "k");
    expect(juiz.mock.calls.length).toBeLessThanOrEqual(12);
    expect(clips).toHaveLength(NUM_CLIPS); // fail-open: whitelist completa
  });

  it("cache HIT não consome a cota (veredito de graça não é gasto)", async () => {
    indexarOferta(20);
    // tudo rejeitado, mas TUDO vindo do cache → pode varrer à vontade sem pagar
    juiz.mockImplementation(async () => ({ reject: true, reason: "skin macro", cached: true, paid: false }));
    const clips = await selectFootage(["a"], "mind", 4242, NUM_CLIPS, "k");
    expect(juiz.mock.calls.length).toBeGreaterThan(12);
    expect(clips).toHaveLength(NUM_CLIPS);
  });
});

// ── 7. O coração do pedido do dono: clipe usado nos 14 dias NÃO volta ────────
describe("7. clipe no avoid (usado nos últimos 14d, cross-fonte) nunca entra pelo harvest", () => {
  it("candidato já usado é PULADO — entram só os frescos, em todas as fontes e seeds", async () => {
    indexarOferta(6);
    juizAprovaTudo();
    // os 2 primeiros candidatos de CADA fonte saíram em Reels recentes (outra vaga)
    const usados = FOOTAGE_SOURCES.flatMap((k) => [1, 2].map((i) => candidato(k, i).url));
    linhasDoBanco = [{ cache_key: "outro|2026-07-15", clips: usados, created_at: "2026-07-15T12:00:00.000Z" }];
    for (const seed of [1, 42, 999, 12345]) {
      const clips = await selectFootage(["a"], "self", seed, NUM_CLIPS, "self|2026-07-17");
      expect(clips).toHaveLength(NUM_CLIPS);
      expect(clips.every(éAoVivo)).toBe(true); // a oferta fresca dá conta — nada de whitelist
      expect(clips.filter((u) => usados.includes(u))).toEqual([]); // NENHUM repetido dos 14d
    }
  });

  it("candidato usado não gasta veredito do juiz (é pulado ANTES de julgar)", async () => {
    indexarOferta(6);
    juizAprovaTudo();
    const usados = FOOTAGE_SOURCES.flatMap((k) => [1, 2, 3].map((i) => candidato(k, i).url));
    linhasDoBanco = [{ cache_key: "outro|2026-07-10", clips: usados, created_at: "2026-07-10T12:00:00.000Z" }];
    await selectFootage(["a"], "mind", 777, NUM_CLIPS, "k");
    const julgadas = juiz.mock.calls.map(([id]) => URL_POR_ID.get(id));
    expect(julgadas.filter((u) => u && usados.includes(u))).toEqual([]);
  });

  it("a linha do PRÓPRIO (tópico,dia) fica FORA do avoid (excludeKey): ES grava, PT reusa idêntico", async () => {
    indexarOferta(6);
    juizAprovaTudo();
    // ES roda primeiro (banco sem a vaga) e "grava" seus clipes na vaga do dia…
    const es = await selectFootage(["a"], "self", 12345, NUM_CLIPS, "self|2026-07-17");
    expect(es.every(éAoVivo)).toBe(true);
    linhasDoBanco = [{ cache_key: "self|2026-07-17", clips: es, created_at: "2026-07-17T09:00:00.000Z" }];
    // …e o PT, lendo o banco JÁ com a vaga gravada, escolhe os MESMOS clipes (não se auto-envenena)
    const pt = await selectFootage(["a"], "self", 12345, NUM_CLIPS, "self|2026-07-17");
    expect(pt).toEqual(es);
  });
});

// ── 8. Incidente "El sabio ausente" (1º Reel pós-100%-vivo, 2026-07-18) ──────
// Produção: cena 1 saiu ao vivo e as cenas 2–5 caíram na whitelist REPETIDA. Causa:
// vereditos de ERRO (custo US$0 — ex.: poster inválido da Pixabay → HTTP 400 no juiz)
// contavam contra o teto de 12 julgamentos PAGOS e não deixavam rastro no cache — 12
// falhas gratuitas matavam o harvest em silêncio. Estes testes reproduzem o cenário e
// travam o conserto: erro não come teto pago; tentativas têm teto próprio (tempo);
// rodada seca não encerra a colheita com termos por tentar.
describe("8. erro do juiz NÃO queima o teto pago (incidente El sabio ausente)", () => {
  // Juiz por FONTE: as 3 primeiras fontes só devolvem erro gratuito (como o poster .mp4
  // da Pixabay fazia); pexels-photo funciona. O harvest tem que ENCHER o Reel pela fonte sã.
  function juizQuebradoMenosPexelsPhoto() {
    juiz.mockImplementation(async (id) => {
      const url = URL_POR_ID.get(id);
      if (url && fonteDe(url) === "pexels-photo") {
        return { reject: false, reason: "clear scene", who: whoPorUrl.get(url) ?? "none", cached: false, paid: true };
      }
      // erro HTTP do juiz: fail-safe rejeita, NÃO cobra, NÃO cacheia
      return { reject: true, reason: "QA HTTP 400 → rejeitado (fail-safe)", who: undefined, cached: false, paid: false };
    });
  }

  it("3 fontes só dão erro gratuito → a fonte sã ainda enche as 5 cenas (antes: teto queimado, whitelist repetida)", async () => {
    indexarOferta(6);
    juizQuebradoMenosPexelsPhoto();
    const clips = await selectFootage(["a", "b", "c"], "self", 12345, NUM_CLIPS, "k");
    expect(clips).toHaveLength(NUM_CLIPS);
    expect(clips.every(éAoVivo)).toBe(true); // NADA de whitelist
    expect(clips.every((u) => fonteDe(u) === "pexels-photo")).toBe(true); // tudo da fonte sã
  });

  it("'sem poster — QA pulado' também não conta como pago (custou US$0)", async () => {
    indexarOferta(6);
    juiz.mockImplementation(async (id) => {
      const url = URL_POR_ID.get(id);
      if (url && fonteDe(url) === "pexels-video") {
        return { reject: false, reason: "clear scene", who: "none", cached: false, paid: true };
      }
      return { reject: false, reason: "sem poster — QA pulado", who: undefined, cached: false, paid: false };
    });
    // tema COM sujeito: o "QA pulado" (who desconhecido) é fail-closed → só a fonte com
    // veredito real entra; e os pulados não podem ter comido o teto no caminho.
    const clips = await selectFootage(["a"], "self", 999, NUM_CLIPS, "k", "man");
    expect(clips.filter(éAoVivo).length).toBeGreaterThan(0);
    expect(clips.filter(éAoVivo).every((u) => fonteDe(u) === "pexels-video")).toBe(true);
  });

  it("juiz TOTALMENTE fora: para no teto de tentativas (sem loop infinito) e a whitelist salva o Reel", async () => {
    indexarOferta(20);
    juiz.mockImplementation(async () => ({ reject: true, reason: "QA HTTP 529 → rejeitado (fail-safe)", cached: false, paid: false }));
    const clips = await selectFootage(["a", "b"], "mind", 4242, NUM_CLIPS, "k");
    expect(juiz.mock.calls.length).toBeLessThanOrEqual(40); // MAX_JUDGE_ATTEMPTS
    expect(clips).toHaveLength(NUM_CLIPS); // fail-open: whitelist completa
  });

  it("rodada com termo SECO não encerra o harvest — o termo seguinte ainda é tentado", async () => {
    // termo "dry" → 0 candidatos; termo "wet" → oferta normal. Antes, UMA rodada sem
    // progresso encerrava tudo (progressed=false) e o Reel caía na whitelist.
    const TAG: Record<FootageSourceKey, number> = {
      "pexels-video": 0, "pexels-photo": 1, "pixabay-video": 2, "pixabay-photo": 3,
    };
    buscaAoVivo.mockImplementation(async (k, term) => {
      if (term === "dry") return [];
      return Array.from({ length: 6 }, (_, i) => {
        const c = candidato(k, i + 1, "none");
        whoPorUrl.set(c.url, "none");
        URL_POR_ID.set(c.sourceId * 10 + TAG[k], c.url);
        return c;
      });
    });
    juizAprovaTudo();
    // seed PAR → rodada 0 usa terms[0] = "dry" (o caso que matava a colheita)
    const clips = await selectFootage(["dry", "wet"], "network", 2, NUM_CLIPS, "k");
    expect(clips).toHaveLength(NUM_CLIPS);
    expect(clips.every(éAoVivo)).toBe(true); // a rodada 1 ("wet") completou o Reel
  });
});

// ── 9. Incidente "La mujer no ama al hombre" (2ª regressão, 2026-07-18 16:13Z) ──
// Tema `who:"both"` com videoQueries masculinos: a busca só trazia candidato `man`, o
// juiz APROVAVA (pagando) e o filtro de sujeito descartava TUDO → teto de 12 esgotado →
// whitelist do combo justo `self|both` (5 clipes exatos) entregou clipe repetido 5×.
// O conserto: a busca passa a PROCURAR o sujeito (orientTermsToSubject). O filtro
// fail-closed NÃO relaxou — quem muda é o que a busca pede.
describe("9. tema com sujeito declarado: a busca PROCURA o sujeito (não só filtra depois)", () => {
  // Os videoQueries REAIS da rodada que falhou (reel_shared_cache 16:13Z).
  const TERMOS_DO_INCIDENTE = [
    "man staring thoughtfully out window alone",
    "two people sitting close but distant looking away",
    "man removing mask revealing vulnerable expression",
  ];
  const TAG: Record<FootageSourceKey, number> = {
    "pexels-video": 0, "pexels-photo": 1, "pixabay-video": 2, "pixabay-photo": 3,
  };

  // O "mundo" responde ao TERMO, como as APIs reais: buscar homem devolve homem;
  // buscar casal devolve casal. IDs distintos por sujeito (não colidem entre termos).
  function ofertaSensivelAoTermo() {
    buscaAoVivo.mockImplementation(async (k, term) => {
      const who = /\bcouple\b/i.test(term) ? "couple" : /\bwoman\b/i.test(term) ? "woman" : "man";
      const base = who === "couple" ? 100 : who === "woman" ? 200 : 300;
      return Array.from({ length: 6 }, (_, i) => {
        const c = candidato(k, base + i + 1, who);
        whoPorUrl.set(c.url, who);
        URL_POR_ID.set(c.sourceId * 10 + TAG[k], c.url);
        return c;
      });
    });
  }

  it("o CENÁRIO REAL consertado: tema `both` + termos masculinos → 5/5 cenas ao vivo de CASAL", async () => {
    ofertaSensivelAoTermo();
    juizAprovaTudo();
    const clips = await selectFootage(TERMOS_DO_INCIDENTE, "self", 12345, NUM_CLIPS, "k", "both");
    expect(clips).toHaveLength(NUM_CLIPS);
    expect(clips.every(éAoVivo)).toBe(true); // ANTES do fix: 0 ao vivo, 5 da whitelist repetida
    for (const u of clips) expect(whoPorUrl.get(u)).toBe("couple"); // sujeito CERTO em todas
  });

  it("TODAS as buscas do tema `both` pedem casal — nenhuma busca com o termo masculino cru", async () => {
    ofertaSensivelAoTermo();
    juizAprovaTudo();
    await selectFootage(TERMOS_DO_INCIDENTE, "self", 999, NUM_CLIPS, "k", "both");
    expect(buscaAoVivo).toHaveBeenCalled();
    for (const [, term] of buscaAoVivo.mock.calls) {
      expect(term).toMatch(/\bcouple\b/i);
      expect(term).not.toMatch(/\bman\b/i);
    }
  });

  it("tema `woman`: as buscas pedem mulher e o Reel sai com mulher", async () => {
    ofertaSensivelAoTermo();
    juizAprovaTudo();
    const clips = await selectFootage(TERMOS_DO_INCIDENTE, "self", 555, NUM_CLIPS, "k", "woman");
    for (const [, term] of buscaAoVivo.mock.calls) expect(term).toMatch(/\bwoman\b/i);
    expect(clips.filter(éAoVivo).length).toBeGreaterThan(0);
    for (const u of clips.filter(éAoVivo)) expect(whoPorUrl.get(u)).toBe("woman");
  });

  it("tema SEM sujeito: as buscas usam os termos ORIGINAIS, intactos (não-regressão)", async () => {
    ofertaSensivelAoTermo();
    juizAprovaTudo();
    await selectFootage(TERMOS_DO_INCIDENTE, "self", 777, NUM_CLIPS, "k", undefined);
    const termosUsados = new Set(buscaAoVivo.mock.calls.map(([, t]) => t));
    for (const t of termosUsados) expect(TERMOS_DO_INCIDENTE).toContain(t);
  });

  it("o filtro de sujeito NÃO relaxou: mundo só de `man` num tema `both` → zero ao vivo, Reel sai pela whitelist", async () => {
    // Mesmo com os termos orientados, se as fontes SÓ tiverem homem, nada entra —
    // a ed. 164 continua impossível. (O conserto muda a BUSCA, nunca a régua.)
    indexarOferta(6, () => "man");
    juizAprovaTudo();
    const clips = await selectFootage(TERMOS_DO_INCIDENTE, "self", 4242, NUM_CLIPS, "k", "both");
    expect(clips.filter(éAoVivo)).toEqual([]);
    expect(clips).toHaveLength(NUM_CLIPS); // whitelist (compatível) completa
  });
});
