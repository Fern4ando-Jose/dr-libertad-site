// ─── Busca de footage de banco (Pexels) ───────────────────────────────────────
// Escolhe 2-3 clipes de VÍDEO REAL (filmado) na Pexels a partir do tema do dia e
// grava as URLs em props.clips dentro do reel-props.json. O Reel usa esses
// clipes como fundo em movimento (graded p/ a paleta da marca). Movimento real,
// custo ZERO (Pexels é grátis).
//
// CAMADA: criação (não automação). NÃO-FATAL: sem PEXELS_API_KEY, sem match ou
// erro de rede → sai 0 sem clips, e o Reel cai no fallback (ilustração estática).
//
// Uso:  PEXELS_API_KEY=... node scripts/fetch-footage.mjs --props=reel-props.json

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const NUM_CLIPS = Math.max(1, Math.min(4, Number(process.env.FOOTAGE_NUM_CLIPS || "3")));
const PER_PAGE = 20;

const propsArg = process.argv.find((a) => a.startsWith("--props="));
const PROPS_PATH = resolve(process.cwd(), propsArg ? propsArg.slice("--props=".length) : "reel-props.json");

// Termos de busca (em inglês — a Pexels indexa melhor assim) por CATEGORIA da
// marca. Mood cinematográfico, sóbrio, abstrato — combina com o grade ink/paper.
const CAT_TERMS = {
  freedom: ["open sky horizon", "bird flying silhouette", "ocean horizon calm", "walking open field"],
  dopamine: ["city lights bokeh night", "neon lights motion", "abstract glowing particles", "fast city timelapse"],
  anxiety: ["storm clouds moody", "rain on window", "blurred crowd walking", "dark waves ocean"],
  network: ["city traffic timelapse night", "abstract network lines", "crowd street aerial", "data lights motion"],
  self: ["silhouette window light", "lonely figure shadow", "portrait soft shadow", "candle flame dark"],
  mind: ["fog forest morning", "ink in water abstract", "slow clouds timelapse", "smoke abstract dark"],
};

function log(m) {
  console.log(`[footage] ${m}`);
}
// Sempre 0: footage é opcional (fallback p/ ilustração estática).
function done(reason) {
  if (reason) log(reason);
  process.exit(0);
}

// Escolhe o melhor arquivo de vídeo de um item Pexels: retrato, ~1080p (evita 4K
// pesado no render do CI). Prefere altura >= largura e largura <= 1440.
function pickFile(video) {
  const files = (video.video_files || []).filter((f) => f.link && f.width && f.height);
  if (!files.length) return null;
  const portrait = files.filter((f) => f.height >= f.width);
  const pool = portrait.length ? portrait : files;
  // ordena por proximidade de 1080 de largura, preferindo <= 1440
  pool.sort((a, b) => {
    const sa = (a.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(a.width - 1080);
    const sb = (b.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(b.width - 1080);
    return sa - sb;
  });
  return pool[0].link;
}

async function searchTerm(term) {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&orientation=portrait&size=medium&per_page=${PER_PAGE}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  if (!res.ok) {
    log(`busca "${term}" HTTP ${res.status}`);
    return [];
  }
  const data = await res.json().catch(() => ({}));
  const vids = Array.isArray(data.videos) ? data.videos : [];
  // só retrato com duração decente (>=4s)
  return vids.filter((v) => v.height >= v.width && (v.duration || 0) >= 4);
}

async function main() {
  if (!existsSync(PROPS_PATH)) return done(`props ${PROPS_PATH} ausente — nada a buscar`);
  let props;
  try {
    props = JSON.parse(readFileSync(PROPS_PATH, "utf8"));
  } catch (e) {
    return done(`reel-props.json inválido (${e?.message || e}) — sem footage`);
  }
  if (!PEXELS_API_KEY) return done("PEXELS_API_KEY ausente — sem footage (fallback ilustração estática)");

  const cat = props.cat || "freedom";
  const terms = (CAT_TERMS[cat] || CAT_TERMS.freedom).slice();
  log(`categoria "${cat}" → termos: ${terms.join(" | ")}`);

  try {
    const picked = [];
    const seenVideoIds = new Set();
    // varre termos até juntar NUM_CLIPS clipes distintos
    for (const term of terms) {
      if (picked.length >= NUM_CLIPS) break;
      const vids = await searchTerm(term);
      for (const v of vids) {
        if (picked.length >= NUM_CLIPS) break;
        if (seenVideoIds.has(v.id)) continue;
        const link = pickFile(v);
        if (!link) continue;
        seenVideoIds.add(v.id);
        picked.push(link);
        log(`+ clipe (${term}) id=${v.id} ${v.width}x${v.height} ${v.duration}s`);
      }
    }

    if (!picked.length) return done("nenhum clipe encontrado na Pexels — fallback ilustração estática");

    props.clips = picked;
    writeFileSync(PROPS_PATH, JSON.stringify(props));
    log(`${picked.length} clipe(s) gravados em props.clips`);
  } catch (e) {
    return done(`exceção: ${e?.message || e} — sem footage`);
  }
  return done();
}

main();
