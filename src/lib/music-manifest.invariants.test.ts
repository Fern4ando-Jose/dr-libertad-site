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
  it("resolve o tema pela entrada do manifest", () => {
    const [topic, file] = Object.entries(manifest)[0];
    expect(pickMusic({ topic, run: 0 })).toBe(file);
  });

  it("tema fora do manifest é fail-open (devolve string, nunca lança)", () => {
    const r = pickMusic({ topic: "Tema inexistente para teste", run: 1 });
    expect(typeof r).toBe("string");
  });
});
