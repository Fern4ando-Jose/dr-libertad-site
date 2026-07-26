import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import pickMusicMod from "../../scripts/pick-music.cjs";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE — A TRILHA GIRA (pedido do dono 2026-07-26: "não devem ficar repetindo
// músicas todo dia"). Antes, cada tema tinha UMA faixa presa a ele: quando o tema
// voltava na rotação, voltava a mesma música — e 17 faixas nunca tocavam (o pilar
// "anxiety" tinha 13 temas para 16 faixas).
//
// Agora `public/music/pools.json` (gerado por build-music-manifest.mjs) dá o POOL do
// pilar de cada tema e o picker gira por DIA. Este teste garante:
//   (1) todo tema tem pool, e toda faixa do pool existe no disco;
//   (2) faixa de origem NÃO confirmada não entra em pool nenhum;
//   (3) NÃO REPETE CEDO — em N dias consecutivos, um tema com pool de N dá N faixas
//       distintas (a mesma só volta depois de percorrer o pool inteiro);
//   (4) o picker continua fail-open (tema desconhecido devolve string, nunca lança).
// ─────────────────────────────────────────────────────────────────────────────

const { pickMusic } = pickMusicMod as unknown as {
  pickMusic: (a: unknown) => string;
};
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."); // src/lib → raiz
const MUSIC_DIR = resolve(ROOT, "public/music");

const pools = JSON.parse(readFileSync(resolve(MUSIC_DIR, "pools.json"), "utf8")) as Record<
  string,
  string[]
>;
const credits = JSON.parse(
  readFileSync(resolve(ROOT, "src/content/music-credits.json"), "utf8"),
) as { unverified: string[] };

function readThemes(): string[] {
  const src = readFileSync(resolve(ROOT, "src/app/api/publish/route.ts"), "utf8");
  const topics: string[] = [];
  for (const line of src.split("\n")) {
    const t = line.match(/topic:\s*"([^"]+)"/);
    const c = line.match(/cat:\s*"([a-z]+)"/);
    if (t && c) topics.push(t[1]);
  }
  return topics;
}

// Roda o picker fingindo um dia específico (TRILHA_DIA), sem depender do relógio.
function noDia(dia: number, topic: string): string {
  const antes = process.env.TRILHA_DIA;
  process.env.TRILHA_DIA = String(dia);
  try {
    return pickMusic({ topic, run: 0 });
  } finally {
    if (antes === undefined) delete process.env.TRILHA_DIA;
    else process.env.TRILHA_DIA = antes;
  }
}

describe("trilha que gira — pools", () => {
  it("todo tema dos THEMES tem pool e nenhum pool é vazio", () => {
    const topics = readThemes();
    expect(topics.length).toBeGreaterThan(50);
    for (const t of topics) {
      expect(pools[t], `tema sem pool: ${t}`).toBeTruthy();
      expect(pools[t].length, `pool vazio: ${t}`).toBeGreaterThan(0);
    }
  });

  it("toda faixa de todo pool existe em public/", () => {
    const faltando = [...new Set(Object.values(pools).flat())].filter(
      (f) => !existsSync(resolve(ROOT, "public", f)),
    );
    expect(faltando, `pool aponta p/ arquivo inexistente: ${faltando.join(", ")}`).toEqual([]);
  });

  it("faixa de origem não confirmada não entra em pool nenhum", () => {
    const noPool = new Set([...new Set(Object.values(pools).flat())].map((f) => f.split("/").pop()!));
    const vazou = credits.unverified.filter((f) => noPool.has(f));
    expect(vazou, `faixa sem licença confirmada dentro de um pool: ${vazou.join(", ")}`).toEqual([]);
  });
});

describe("trilha que gira — não repete cedo", () => {
  it("em N dias seguidos, um tema com pool de N dá N faixas distintas", () => {
    // um tema representativo de cada tamanho de pool existente
    const porTamanho = new Map<number, string>();
    for (const [t, p] of Object.entries(pools)) if (!porTamanho.has(p.length)) porTamanho.set(p.length, t);
    expect(porTamanho.size).toBeGreaterThan(0);

    for (const [n, topic] of porTamanho) {
      const saidas = new Set<string>();
      for (let d = 20000; d < 20000 + n; d++) saidas.add(noDia(d, topic));
      expect(
        saidas.size,
        `pool de ${n} repetiu antes de percorrer tudo (tema "${topic}"): só ${saidas.size} distintas`,
      ).toBe(n);
    }
  });

  it("o conjunto alcança MUITO mais faixas que uma-por-tema (nada encalhado)", () => {
    const temas = Object.keys(pools);
    const alcancadas = new Set<string>();
    for (let d = 20000; d < 20030; d++) for (const t of temas) alcancadas.add(noDia(d, t));
    // antes da rotação eram 76; o pool inteiro (fora as não-confirmadas) é o teto
    const teto = new Set(Object.values(pools).flat()).size;
    expect(alcancadas.size).toBeGreaterThan(80);
    expect(alcancadas.size).toBeLessThanOrEqual(teto);
  });

  it("mesma pergunta, mesmo dia → mesma resposta (render e publish não divergem)", () => {
    const t = Object.keys(pools)[0];
    expect(noDia(20123, t)).toBe(noDia(20123, t));
  });

  it("tema desconhecido é fail-open (devolve string, nunca lança)", () => {
    const r = pickMusic({ topic: "Tema que não existe para teste", run: 1 });
    expect(typeof r).toBe("string");
  });
});

describe("trilha que gira — sanidade do disco", () => {
  it("nenhum mp3 do pool ficou órfão de todos os pools sem motivo", () => {
    const noDisco = readdirSync(MUSIC_DIR).filter((f) => /^bed-pilar-[a-z]+(-\d+)?\.mp3$/i.test(f));
    const emPool = new Set([...new Set(Object.values(pools).flat())].map((f) => f.split("/").pop()!));
    const fora = noDisco.filter((f) => !emPool.has(f));
    // só as de origem não confirmada podem estar fora
    expect(fora.sort()).toEqual([...credits.unverified].sort());
  });
});
