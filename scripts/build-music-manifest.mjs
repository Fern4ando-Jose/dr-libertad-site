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
const POOLS = path.join(MUSIC_DIR, "pools.json");
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
// Faixa de origem DESCONHECIDA não entra no sorteio (2026-07-26). A curadoria de 15/07
// dizia que as 92 vinham todas do incompetech; a leitura das tags ID3 mostrou 5 sem autor
// nenhum — duas delas nem cortadas (320 kbps, 2m45 e 3m48, uma com foto embutida), ou seja,
// de outro processo. Enquanto ninguém confirmar de onde vieram, elas ficam fora do ar:
// publicar trilha sem saber a licença é risco que não se assume por descuido.
// A lista sai de src/content/music-credits.json (campo `unverified`), gerado por
// scripts/build-music-credits.mjs — RODE-O ANTES deste script.
function lerNaoVerificadas() {
  const p = path.join(ROOT, "src/content/music-credits.json");
  if (!existsSync(p)) {
    console.warn("[manifest] ⚠️ music-credits.json ausente — rode build-music-credits.mjs;");
    console.warn("[manifest]    seguindo com o pool INTEIRO (fail-open, não trava a automação).");
    return new Set();
  }
  try {
    return new Set(JSON.parse(readFileSync(p, "utf8")).unverified || []);
  } catch {
    console.warn("[manifest] ⚠️ music-credits.json inválido — seguindo com o pool inteiro.");
    return new Set();
  }
}
const NAO_VERIFICADAS = lerNaoVerificadas();

function poolForPillar(cat) {
  let files;
  try { files = readdirSync(MUSIC_DIR); } catch { return [`bed-pilar-${cat}.mp3`]; }
  const re = new RegExp(`^bed-pilar-${cat}(-\\d+)?\\.mp3$`, "i");
  const pool = files.filter((f) => re.test(f) && !NAO_VERIFICADAS.has(f)).sort();
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

// ─── pools.json — o que faz a trilha GIRAR (2026-07-26, pedido do dono) ──────
// Problema que isto resolve: com uma faixa PRESA a cada tema, a mesma música voltava
// junto com o tema — e 17 faixas nunca tocavam (o pilar "anxiety" tem 13 temas p/ 16
// faixas: 3 jamais sairiam). Aqui gravamos, por tema, o POOL INTEIRO do seu pilar;
// o picker (pick-music.cjs) escolhe dentro dele girando por DIA, então a cada aparição
// do tema sai uma faixa diferente e a mesma só volta depois de percorrer o pool todo.
// O manifest.json acima continua igual (faixa âncora) — é o fallback de quem não
// conhece o pools.json, e mantém o comportamento antigo se este arquivo faltar.
// COBERTURA — por que o tamanho do pool importa (corrigido 2026-07-27, CI vermelho):
// o picker anda 1 casa por DIA, mas o tema só volta a cada k dias. Entre duas aparições
// o índice avança k, então o tema visita n/mdc(k,n) faixas. Quando n DIVIDE k a conta
// desaba para UMA faixa só: foi o que aconteceu com "anxiety" ao cair para 13 faixas
// (k era 26 = 2×13) depois de o dono reprovar 16 na escuta. Nenhum passo linear no dia
// salva esse caso — 26·p ≡ 0 (mod 13) para todo p. A saída é o TAMANHO: cada tema usa as
// primeiras n' faixas de um pool GIRADO a partir de um ponto só dele, com n' o maior
// tamanho coprimo com k. Girar é o detalhe que evita órfã: temas diferentes cortam faixas
// diferentes, então toda faixa continua alcançável por alguém.
//
// k é DERIVADO, não fixado (2026-07-27): quando o dono mudou a cadência de 7 para 4 posts
// por dia, um "26" escrito à mão aqui teria silenciosamente errado a conta de cobertura.
// k = nº de temas ÷ posts por dia. POSTS_PER_DAY espelha src/lib/day.ts (fonte única da
// cadência); este é um script .mjs e não importa TS — se mudar lá, muda aqui.
const POSTS_PER_DAY = 4;
const CICLO_DIAS = Math.max(2, Math.round(themes.length / POSTS_PER_DAY));
const mdc = (a, b) => (b ? mdc(b, a % b) : a);
function poolDoTema(pool, topic) {
  let n = pool.length;
  while (n > 1 && mdc(CICLO_DIAS, n) !== 1) n--;
  if (n >= pool.length) return pool;
  const off = hashStr(topic) % pool.length;
  return [...pool.slice(off), ...pool.slice(0, off)].slice(0, n);
}

const pools = {};
for (const { topic, cat } of themes) {
  if (overrides[topic]) { pools[topic] = [overrides[topic]]; continue; } // faixa final do dono manda
  pools[topic] = poolDoTema(poolForPillar(cat).map((f) => `music/${f}`), topic);
}
writeFileSync(POOLS, JSON.stringify(pools, null, 2) + "\n");
const tamanhos = [...new Set(Object.values(pools).map((p) => p.length))].sort((a, b) => a - b);
const todasNoPool = new Set(Object.values(pools).flat());
console.log(`[manifest] pools.json: ${Object.keys(pools).length} temas · pool de ${tamanhos[0]}–${tamanhos[tamanhos.length - 1]} faixas · ${todasNoPool.size} faixas alcançáveis`);
console.log(`[manifest] ${themes.length} temas → manifest.json`);
console.log(`[manifest] faixa FINAL (override): ${nFinal} · fallback de pilar: ${nFallback}`);
console.log(`[manifest] fallback por pilar:`, byPillar);
// avisa se algum arquivo referenciado não existe no disco
const reallyMissing = [...new Set(Object.values(manifest))].filter((f) => !existsSync(path.join(ROOT, "public", f)));
if (reallyMissing.length) console.warn(`[manifest] ⚠️ arquivos faltando no disco:`, reallyMissing);
else console.log(`[manifest] ✓ todos os arquivos referenciados existem em public/`);
