// Reconstrói public/music/manifest.json (tema → faixa) a partir de:
//   1. THEMES (fonte única em src/app/api/publish/route.ts) — dá o tema + o PILAR (cat);
//   2. public/music/overrides.json — { "tema exato": "music/arquivo.mp3" } com a faixa
//      FINAL e ÚNICA de um tema (entregue pelo dono); tem prioridade.
//
// Sem override, o tema cai no FALLBACK do seu pilar (`music/bed-pilar-<cat>.mp3`) —
// um instrumental de marca por pilar, no lugar das faixas geradas por IA (que o dono
// rejeitou). À medida que o dono entrega as faixas por tema, elas entram em overrides.json
// e cada tema ganha o seu som único (rumo a 1-por-tema nos 61).
//
// Uso: node scripts/build-music-manifest.mjs
// Fail-safe: o picker (pick-music.cjs) já é fail-open — tema sem arquivo no disco cai
// na rotação legado/mudo, então um override apontando p/ arquivo inexistente não quebra.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const ROUTE = path.join(ROOT, "src/app/api/publish/route.ts");
const MUSIC_DIR = path.join(ROOT, "public/music");
const MANIFEST = path.join(MUSIC_DIR, "manifest.json");
const OVERRIDES = path.join(MUSIC_DIR, "overrides.json");

// hash determinístico (mesmo topic → sempre o mesmo índice, reprodutível entre builds)
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

// Pool por pilar: além do bed-pilar-<cat>.mp3 legado, aceita bed-pilar-<cat>-NN.mp3
// (curadoria YouTube Audio Library, "sem atribuição"). Cada tema pega 1 faixa fixa do
// pool do seu pilar via hash do topic — reprodutível, sem regenerar a cada build.
function poolForPillar(cat) {
  let files;
  try { files = readdirSync(MUSIC_DIR); } catch { return [`bed-pilar-${cat}.mp3`]; }
  const re = new RegExp(`^bed-pilar-${cat}(-\\d+)?\\.mp3$`, "i");
  const pool = files.filter((f) => re.test(f)).sort();
  return pool.length ? pool : [`bed-pilar-${cat}.mp3`];
}

// 1. extrai {topic, cat} dos THEMES (uma entrada por linha; cat pode vir após `literal: true`)
const src = readFileSync(ROUTE, "utf8");
const themes = [];
for (const line of src.split("\n")) {
  const t = line.match(/topic:\s*"([^"]+)"/);
  const c = line.match(/cat:\s*"([a-z]+)"/);
  if (t && c) themes.push({ topic: t[1], cat: c[1] });
}
if (themes.length < 50) {
  console.error(`[manifest] só achei ${themes.length} temas — abortando (esperado ~61).`);
  process.exit(1);
}

// 2. overrides (faixas finais por tema) — opcional
let overrides = {};
if (existsSync(OVERRIDES)) {
  try { overrides = JSON.parse(readFileSync(OVERRIDES, "utf8")); }
  catch { console.error("[manifest] overrides.json inválido — ignorando."); }
}

const manifest = {};
let nFinal = 0, nFallback = 0;
const byPillar = {};
for (const { topic, cat } of themes) {
  if (overrides[topic]) {
    manifest[topic] = overrides[topic];
    nFinal++;
    continue;
  }
  const pool = poolForPillar(cat);
  const file = `music/${pool[hashStr(topic) % pool.length]}`;
  manifest[topic] = file;
  nFallback++;
  (byPillar[cat] ??= 0);
  byPillar[cat]++;
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log(`[manifest] ${themes.length} temas → manifest.json`);
console.log(`[manifest] faixa FINAL (override): ${nFinal} · fallback de pilar: ${nFallback}`);
console.log(`[manifest] fallback por pilar:`, byPillar);
// avisa se algum arquivo referenciado não existe no disco
const reallyMissing = [...new Set(Object.values(manifest))].filter((f) => !existsSync(path.join(ROOT, "public", f)));
if (reallyMissing.length) console.warn(`[manifest] ⚠️ arquivos faltando no disco:`, reallyMissing);
else console.log(`[manifest] ✓ todos os arquivos referenciados existem em public/`);
