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

// FALLBACK por CATEGORIA — só usado se o Claude não mandar videoQueries no tema.
// Centrado em VIDA DIGITAL/pessoas/emoção (o assunto da marca), não cenas
// literais. Em inglês (Pexels indexa melhor assim).
const CAT_TERMS = {
  freedom: ["person arms open nature", "walking free open road", "person breathing calm outdoors", "putting phone away relief"],
  dopamine: ["person scrolling phone in bed", "hand swiping smartphone screen", "phone notifications close up", "person addicted to phone night"],
  anxiety: ["anxious person looking at phone", "stressed person screen night", "overwhelmed person dark room", "rain window sad mood"],
  network: ["people on phones ignoring each other", "lonely person in crowd", "couple distracted by phones", "person alone looking at screen"],
  self: ["person reflection window thinking", "alone silhouette window light", "thoughtful person low light", "person looking in mirror"],
  mind: ["calm person meditating", "person thinking by window", "slow breathing calm light", "quiet moment without phone"],
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

  // Prioridade: termos no tema gerados pelo Claude (videoQueries) → fallback cat.
  const cat = props.cat || "freedom";
  const fromClaude = Array.isArray(props.videoQueries) ? props.videoQueries.filter((t) => typeof t === "string" && t.trim()) : [];
  const fallback = (CAT_TERMS[cat] || CAT_TERMS.freedom).slice();
  log(fromClaude.length ? `videoQueries do Claude: ${fromClaude.join(" | ")}` : `(sem videoQueries) fallback cat "${cat}": ${fallback.join(" | ")}`);

  try {
    const picked = [];
    const seenVideoIds = new Set();

    // Round-robin entre os termos: pega 1 clipe de CADA termo por passada, depois
    // volta ao 1º para a 2ª passada, etc. Mantém os clipes NO TEMA e DIVERSOS —
    // em vez de esvaziar o 1º termo (4 clipes da mesma busca) ou cair no fallback
    // genérico (o "último clipe fora de contexto"). Só usa o fallback de categoria
    // depois de esgotar as queries do Claude.
    async function harvest(termList) {
      // Pré-carrega as buscas e mantém um cursor por termo (fila de candidatos).
      const queues = [];
      for (const term of termList) {
        if (picked.length >= NUM_CLIPS) break;
        queues.push({ term, vids: await searchTerm(term), i: 0 });
      }
      let progressed = true;
      while (picked.length < NUM_CLIPS && progressed) {
        progressed = false;
        for (const q of queues) {
          if (picked.length >= NUM_CLIPS) break;
          // avança no termo até achar um vídeo novo com arquivo utilizável
          while (q.i < q.vids.length) {
            const v = q.vids[q.i++];
            if (seenVideoIds.has(v.id)) continue;
            const link = pickFile(v);
            if (!link) continue;
            seenVideoIds.add(v.id);
            picked.push(link);
            progressed = true;
            log(`+ clipe (${q.term}) id=${v.id} ${v.width}x${v.height} ${v.duration}s`);
            break;
          }
        }
      }
    }

    // 1ª escolha: só as queries do Claude (no tema). Pode render < NUM_CLIPS.
    if (fromClaude.length) await harvest(fromClaude);
    // Fallback de categoria (genérico) só entra se o Claude rendeu ZERO clipes.
    // Se rendeu >=1, NÃO misturamos clipe genérico: o Reel.tsx cicla os clipes no
    // tema (a cena final reusa um deles), evitando o "último clipe fora de contexto".
    if (!picked.length) {
      if (fromClaude.length) log(`Claude rendeu 0 clipes — caindo no fallback cat "${cat}"`);
      await harvest(fallback);
    } else if (picked.length < NUM_CLIPS) {
      log(`Claude rendeu ${picked.length} clipe(s) no tema (< ${NUM_CLIPS}) — Reel cicla os do tema, sem fallback genérico`);
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
