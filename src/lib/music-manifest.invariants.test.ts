import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import pickMusicMod from "../../scripts/pick-music.cjs";

// ─────────────────────────────────────────────────────────────────────────────
// INVARIANTE — MÚSICA POR TEMA. Cada tema tem faixa própria; pick-music.cjs escolhe
// pelo `topic` via public/music/manifest.json (reconstruído por
// scripts/build-music-manifest.mjs a partir dos THEMES + overrides.json).
// Garante: (1) todo arquivo do manifest é um mp3 de public/music QUE EXISTE;
// (2) COBERTURA — todo tema dos THEMES tem entrada no manifest (nenhum tema fica sem
// trilha; cai no fallback do pilar até ganhar a faixa final via overrides);
// (3) o picker resolve o tema pelo manifest; (4) tema fora do manifest NÃO quebra
// (fail-open). Ver CLAUDE.md (pipeline do Reel).
// ─────────────────────────────────────────────────────────────────────────────

const { pickMusic } = pickMusicMod as unknown as { pickMusic: (a: unknown) => string };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", ".."); // src/lib → raiz
const manifest = JSON.parse(
  readFileSync(resolve(ROOT, "public/music/manifest.json"), "utf8"),
) as Record<string, string>;

// temas reais (fonte única THEMES em api/publish/route.ts) — uma entrada por linha;
// `cat` pode vir após `literal: true`, então casa topic e cat separadamente.
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

describe("música por tema — manifest", () => {
  it("não está vazio e todo arquivo é um mp3 de music/ que existe", () => {
    const entries = Object.entries(manifest);
    expect(entries.length).toBeGreaterThan(0);
    for (const [, file] of entries) {
      expect(file).toMatch(/^music\/[a-z0-9._-]+\.mp3$/i);
      expect(existsSync(resolve(ROOT, "public", file))).toBe(true);
    }
  });

  it("COBERTURA — todo tema dos THEMES tem trilha no manifest", () => {
    const topics = readThemes();
    expect(topics.length).toBeGreaterThan(50); // ~61
    for (const topic of topics) {
      expect(manifest[topic], `tema sem trilha: ${topic}`).toBeTruthy();
    }
  });
});

describe("música por tema — picker", () => {
  // Desde 2026-07-26 a faixa NÃO é mais presa ao tema: o picker gira dentro do pool do
  // pilar (public/music/pools.json) para nenhuma faixa encalhar e nenhuma repetir cedo —
  // ver src/lib/music-rotation.invariants.test.ts. O manifest continua sendo a âncora e o
  // FALLBACK (vale quando pools.json falta), então o que se garante aqui é: o picker
  // devolve uma faixa do POOL daquele tema, e o manifest é uma delas.
  // ⛔ 30/08/2026: a faixa entregue NÃO vem mais do pool do tema quando o pool não tem faixa
  // permitida. O TikTok silenciou 82 dos 84 vídeos por "sons não autorizados" — 132 das 143 faixas
  // deste acervo têm autor (Kevin MacLeod, CC BY) e são reconhecidas pelo banco de áudio da
  // plataforma —, então o picker só sorteia o que está em `public/music/livres.json`. O manifest e
  // os pools continuam íntegros (nada foi apagado); o que mudou é QUEM pode ir ao ar.
  it("resolve o tema para uma faixa PERMITIDA — e o pool do tema segue íntegro", () => {
    const pools = JSON.parse(
      readFileSync(resolve(ROOT, "public/music/pools.json"), "utf8"),
    ) as Record<string, string[]>;
    const livres: string[] = JSON.parse(
      readFileSync(resolve(ROOT, "public/music/livres.json"), "utf8"),
    ).livres;
    const [topic, file] = Object.entries(manifest)[0];
    const pool = pools[topic];
    expect(pool, `tema sem pool: ${topic}`).toBeTruthy();
    expect(pool).toContain(file);
    expect(livres).toContain(pickMusic({ topic, run: 0 }));
  });

  it("tema fora do manifest é fail-open (devolve string, nunca lança)", () => {
    const r = pickMusic({ topic: "Tema inexistente para teste", run: 1 });
    expect(typeof r).toBe("string");
  });
});
