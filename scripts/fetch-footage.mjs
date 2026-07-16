// ─── Busca de footage de banco (Pexels + Pixabay, vídeo + foto) ────────────────
// Escolhe 2-5 clipes/fotos de banco a partir do tema do dia e grava as URLs em
// props.clips dentro do reel-props.json. O Reel usa esses itens como fundo em
// movimento (vídeo graded, ou foto com Ken Burns — video/KenBurns.tsx) na paleta
// da marca (video/brand-grade.ts). Movimento real, custo ZERO (Pexels/Pixabay
// grátis pro volume da conta).
//
// CAMADA: criação (não automação). NÃO-FATAL: sem nenhuma chave, sem match ou
// erro de rede → sai 0 sem clips, e o Reel cai no fallback (ilustração estática).
//
// 2026-07-16: este é o FALLBACK de CI — a API (/api/publish?preview=1) já resolve
// o footage MISTURANDO 4 fontes via `selectFootage` (src/lib/reel-shared.ts +
// src/lib/footage-providers.ts) e entrega em props.clips; este script só roda
// quando ela devolveu 0 clipes. Espelha a MESMA mistura de fontes (Pexels
// vídeo/foto sempre; Pixabay vídeo/foto só com PIXABAY_API_KEY — fail-open, ainda
// não existe) pra não regredir o fallback a "só Pexels vídeo" enquanto o caminho
// primário já manda as 4. Manter os dois em sincronia.
//
// Uso:  PEXELS_API_KEY=... [PIXABAY_API_KEY=...] node scripts/fetch-footage.mjs --props=reel-props.json

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_API_KEY = process.env.PIXABAY_API_KEY; // fail-open: ausente → Pixabay pulado, sem quebrar nada
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY; // QA de conteúdo do footage (incidente 07-01)
const NUM_CLIPS = Math.max(1, Math.min(6, Number(process.env.FOOTAGE_NUM_CLIPS || "5")));
const PER_PAGE = 20;

// ─── QA de CONTEÚDO do footage — ESPELHA src/lib/footage-qa.ts ─────────────────
// Incidente 07-01: Reel saiu com macro de pele (aspecto de nudez). Este é o caminho
// de CI (fallback); o primário é selectFootage na API. Manter em sincronia com o TS.
// Visão barata (Haiku) no POSTER do clipe. FAIL-SAFE com chave (ilegível/erro →
// rejeita); FAIL-OPEN sem chave (aceita, p/ não degradar todo Reel — o CI só tem a
// chave se o secret ANTHROPIC_API_KEY estiver setado nos workflows de Reel).
const FOOTAGE_QA_PROMPT = `You review a single stock-video POSTER FRAME for a serious mental-health / psychology Instagram brand.
Answer ONLY with JSON: {"reject": boolean, "reason": "<=8 words"}.
Set reject=true if the frame is ANY of:
- an extreme close-up of bare skin or body parts (arm, leg, torso, lips, etc.) filling the frame;
- an abstract skin/flesh/body texture with no clear scene or subject;
- nudity, lingerie, or sexually suggestive content;
- a child or teenager (anyone who looks under ~18) as a subject in the frame;
- anything a psychology brand would be embarrassed to post.
Set reject=false only for a clear, tasteful scene with a discernible ADULT subject in context (a person doing something, a place, an object, nature).
When in doubt, reject=true.`;

// Parser fail-safe (ilegível → rejeita). Espelha parseFootageVerdict do TS.
function parseFootageVerdict(text) {
  const s = typeof text === "string" ? text : "";
  try {
    const start = s.indexOf("{");
    const end = s.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const o = JSON.parse(s.slice(start, end + 1));
      if (typeof o.reject === "boolean") return { reject: o.reject, reason: typeof o.reason === "string" ? o.reason : "" };
    }
  } catch { /* fail-safe */ }
  return { reject: true, reason: "veredito ilegível → rejeitado (fail-safe)" };
}

// Julga o poster. Sem chave → aceita (QA pulado). Erro/HTTP ruim → rejeita (fail-safe).
async function judgeFootagePoster(posterUrl) {
  if (!ANTHROPIC_API_KEY) return { reject: false, reason: "sem ANTHROPIC_API_KEY — QA pulado" };
  if (!posterUrl) return { reject: false, reason: "sem poster — QA pulado" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 100,
        messages: [{ role: "user", content: [
          { type: "image", source: { type: "url", url: posterUrl } },
          { type: "text", text: FOOTAGE_QA_PROMPT },
        ] }],
      }),
    });
    if (!res.ok) return { reject: true, reason: `QA HTTP ${res.status} → rejeitado (fail-safe)` };
    const data = await res.json();
    return parseFootageVerdict(data?.content?.[0]?.text);
  } catch (e) {
    return { reject: true, reason: `QA erro (${e?.message || e}) → rejeitado (fail-safe)` };
  }
}

const propsArg = process.argv.find((a) => a.startsWith("--props="));
const PROPS_PATH = resolve(process.cwd(), propsArg ? propsArg.slice("--props=".length) : "reel-props.json");

// FALLBACK por CATEGORIA — só usado se o Claude não mandar videoQueries no tema.
// Centrado em VIDA DIGITAL/pessoas/emoção (o assunto da marca), não cenas
// literais. Em inglês (Pexels/Pixabay indexam melhor assim).
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

// Hash estável (FNV-1a) — espelha src/lib/footage-media.ts (hashStr).
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Rotaciona um array por n posições (não-destrutivo).
function rotate(arr, n) {
  if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

// Embaralho determinístico por seed (LCG) — espelha seededShuffle do TS. Usado
// pra sortear a ORDEM das fontes a cada rodada (mix ponderado/aleatório).
function seededShuffle(arr, seed) {
  const a = arr.slice();
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Sempre 0: footage é opcional (fallback p/ ilustração estática).
function done(reason) {
  if (reason) log(reason);
  process.exit(0);
}

// ─── 4 fontes normalizadas — ESPELHA src/lib/footage-providers.ts ──────────────
// Cada candidato: { url, poster, id } — a URL final decide vídeo×foto por extensão
// no RENDER (isPhotoUrl), então este script não precisa marcar o tipo.

function pickPexelsVideoFile(video) {
  const files = (video.video_files || []).filter((f) => f.link && f.width && f.height);
  if (!files.length) return null;
  const portrait = files.filter((f) => f.height >= f.width);
  const pool = portrait.length ? portrait : files;
  pool.sort((a, b) => {
    const sa = (a.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(a.width - 1080);
    const sb = (b.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(b.width - 1080);
    return sa - sb;
  });
  return pool[0].link;
}

async function searchPexelsVideo(term) {
  if (!PEXELS_API_KEY) return [];
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&orientation=portrait&size=medium&per_page=${PER_PAGE}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  if (!res.ok) { log(`Pexels vídeo "${term}" HTTP ${res.status}`); return []; }
  const data = await res.json().catch(() => ({}));
  const vids = Array.isArray(data.videos) ? data.videos : [];
  return vids
    .filter((v) => v.height >= v.width && (v.duration || 0) >= 4)
    .map((v) => { const link = pickPexelsVideoFile(v); return link ? { id: v.id, url: link, poster: v.image } : null; })
    .filter(Boolean);
}

async function searchPexelsPhoto(term) {
  if (!PEXELS_API_KEY) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(term)}&orientation=portrait&size=large&per_page=${PER_PAGE}`;
  const res = await fetch(url, { headers: { Authorization: PEXELS_API_KEY } });
  if (!res.ok) { log(`Pexels foto "${term}" HTTP ${res.status}`); return []; }
  const data = await res.json().catch(() => ({}));
  const photos = Array.isArray(data.photos) ? data.photos : [];
  return photos
    .filter((p) => (p.height || 0) >= (p.width || 0))
    .map((p) => { const src = p.src?.large2x || p.src?.large || p.src?.original; return src ? { id: p.id, url: src, poster: src } : null; })
    .filter(Boolean);
}

async function searchPixabayVideo(term) {
  if (!PIXABAY_API_KEY) return []; // fail-open — dono ainda não criou a conta (2026-07-16)
  const url = `https://pixabay.com/api/videos/?key=${encodeURIComponent(PIXABAY_API_KEY)}&q=${encodeURIComponent(term)}&safesearch=true&per_page=${PER_PAGE}`;
  const res = await fetch(url);
  if (!res.ok) { log(`Pixabay vídeo "${term}" HTTP ${res.status}`); return []; }
  const data = await res.json().catch(() => ({}));
  const hits = Array.isArray(data.hits) ? data.hits : [];
  const out = [];
  for (const h of hits) {
    const sizes = h.videos || {};
    const candidates = [sizes.large, sizes.medium, sizes.small, sizes.tiny].filter((s) => s && s.url && s.width && s.height);
    const portrait = candidates.filter((s) => s.height >= s.width);
    const pool = portrait.length ? portrait : candidates;
    if (!pool.length) continue;
    pool.sort((a, b) => {
      const sa = (a.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(a.width - 1080);
      const sb = (b.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(b.width - 1080);
      return sa - sb;
    });
    const pick = pool[0];
    if (!(pick.height >= pick.width) || (h.duration || 0) < 4) continue;
    out.push({ id: h.id, url: pick.url, poster: h.picture_id ? `https://i.vimeocdn.com/video/${h.picture_id}_295x166.jpg` : pick.url });
  }
  return out;
}

async function searchPixabayPhoto(term) {
  if (!PIXABAY_API_KEY) return []; // fail-open
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(PIXABAY_API_KEY)}&q=${encodeURIComponent(term)}&image_type=photo&orientation=vertical&safesearch=true&per_page=${PER_PAGE}`;
  const res = await fetch(url);
  if (!res.ok) { log(`Pixabay foto "${term}" HTTP ${res.status}`); return []; }
  const data = await res.json().catch(() => ({}));
  const hits = Array.isArray(data.hits) ? data.hits : [];
  return hits
    .filter((h) => (h.imageHeight || 0) >= (h.imageWidth || 0))
    .map((h) => { const src = h.largeImageURL || h.webformatURL; return src ? { id: h.id, url: src, poster: src } : null; })
    .filter(Boolean);
}

const SOURCE_FNS = {
  "pexels-video": searchPexelsVideo,
  "pexels-photo": searchPexelsPhoto,
  "pixabay-video": searchPixabayVideo,
  "pixabay-photo": searchPixabayPhoto,
};

function availableSources() {
  const list = [];
  if (PEXELS_API_KEY) list.push("pexels-video", "pexels-photo");
  if (PIXABAY_API_KEY) list.push("pixabay-video", "pixabay-photo");
  return list;
}

async function main() {
  if (!existsSync(PROPS_PATH)) return done(`props ${PROPS_PATH} ausente — nada a buscar`);
  let props;
  try {
    props = JSON.parse(readFileSync(PROPS_PATH, "utf8"));
  } catch (e) {
    return done(`reel-props.json inválido (${e?.message || e}) — sem footage`);
  }
  // A API (/api/publish?preview=1) já resolve o footage COMPARTILHADO entre ES e
  // PT (mesmo vídeo, mistura de 4 fontes) e o entrega em props.clips. Se veio de
  // lá, não buscamos de novo — isto aqui vira só o FALLBACK de CI.
  if (Array.isArray(props.clips) && props.clips.length) {
    return done(`clips já vieram da API (base compartilhada, ${props.clips.length}) — pulando busca`);
  }

  const sources = availableSources();
  if (!sources.length) return done("nenhuma fonte disponível (sem PEXELS_API_KEY nem PIXABAY_API_KEY) — sem footage (fallback ilustração estática)");
  log(`fontes disponíveis: ${sources.join(", ")}${PIXABAY_API_KEY ? "" : " (Pixabay pulado — sem PIXABAY_API_KEY)"}`);

  const cat = props.cat || "freedom";
  const fromClaude = Array.isArray(props.videoQueries) ? props.videoQueries.filter((t) => typeof t === "string" && t.trim()) : [];
  const fallback = (CAT_TERMS[cat] || CAT_TERMS.freedom).slice();
  const terms = fromClaude.length ? fromClaude : fallback;
  log(fromClaude.length ? `videoQueries do Claude: ${fromClaude.join(" | ")}` : `(sem videoQueries) fallback cat "${cat}": ${fallback.join(" | ")}`);

  // Seed de DIVERSIFICAÇÃO por render — igual antes.
  const day = new Date().toISOString().slice(0, 10);
  const seed = hashStr(`${props.handle || ""}|${props.ed || ""}|${props.title || ""}|${day}`);
  log(`seed de diversificação=${seed} (handle=${props.handle || "?"} ed=${props.ed || "?"} dia=${day})`);

  try {
    const picked = [];
    const seenUrls = new Set();
    let qaAttempted = 0;
    let qaPassed = 0;

    // Round-robin FONTE×termo, ordem das fontes sorteada por rodada — mistura as
    // 4 fontes em vez de esgotar sempre Pexels-vídeo primeiro (espelha selectFootage).
    async function harvest() {
      let round = 0;
      let progressed = true;
      while (picked.length < NUM_CLIPS && progressed) {
        progressed = false;
        const orderedSources = seededShuffle(sources, seed + round * 13);
        for (const sourceKey of orderedSources) {
          if (picked.length >= NUM_CLIPS) break;
          const term = terms[(seed + round) % terms.length];
          let candidates = [];
          try {
            candidates = await SOURCE_FNS[sourceKey](term);
          } catch (e) {
            log(`- ${sourceKey} "${term}" exceção: ${e?.message || e}`);
            candidates = [];
          }
          for (const c of rotate(candidates, seed + round * 7)) {
            if (seenUrls.has(c.url)) continue;
            seenUrls.add(c.url);
            qaAttempted++;
            const verdict = await judgeFootagePoster(c.poster);
            if (verdict.reject) {
              log(`- ${sourceKey} (${term}) id=${c.id}: ${verdict.reason}`);
              continue;
            }
            qaPassed++;
            picked.push(c.url);
            progressed = true;
            log(`+ ${sourceKey} (${term}) id=${c.id}`);
            break; // 1 candidato aceito por fonte por rodada — mantém a mistura
          }
        }
        round++;
        if (round > 6) break; // trava de segurança
      }
    }

    await harvest();
    log(`QA: ${qaPassed}/${qaAttempted} candidatos aprovados`);

    if (!picked.length) return done("nenhum clipe/foto encontrado — fallback ilustração estática");

    props.clips = picked;
    writeFileSync(PROPS_PATH, JSON.stringify(props));
    log(`${picked.length} item(ns) gravados em props.clips`);

    // Writeback: ESTA conta achou footage no fallback do CI → grava na base
    // compartilhada pra a 2ª conta (PT dispara 5 min depois) REUSAR o MESMO
    // vídeo/foto. Sem isso, ES e PT divergiam (um com footage, outro preto). Só roda
    // quando há topic + CRON_SECRET; best-effort (falha não quebra o render).
    await shareClips(props, picked);
  } catch (e) {
    return done(`exceção: ${e?.message || e} — sem footage`);
  }
  return done();
}

// Compartilha o footage achado aqui com a outra conta (via /api/reel-share).
async function shareClips(props, clips) {
  const secret = process.env.CRON_SECRET;
  const topic = props.topic;
  if (!secret || !topic) {
    return log(`writeback pulado (${!secret ? "sem CRON_SECRET" : "sem topic nos props"}) — footage não compartilhado`);
  }
  const base = process.env.PRODUCTION_URL || "https://www.drlibertad.com";
  // Dia ancorado em BRASÍLIA (UTC-3), MESMA fonte de src/lib/day.ts (dayBRT) — que o
  // LEITOR (/api/publish → readReelShared) usa p/ chavear reel_shared_cache. Antes era
  // UTC: no slot 21h BRT (=00h UTC) o writeback gravava sob o dia UTC SEGUINTE enquanto
  // o leitor lia sob o dia BRT → chave `topic|day` não casava → PT não achava o footage
  // do ES → vídeos divergiam (um com footage, outro preto). Offset fixo -180min (BR sem DST).
  const day = new Date(Date.now() - 180 * 60_000).toISOString().slice(0, 10); // dayBRT
  try {
    const res = await fetch(`${base}/api/reel-share`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
      body: JSON.stringify({ topic, day, clips, videoQueries: props.videoQueries || [] }),
    });
    log(`writeback /api/reel-share → HTTP ${res.status} (footage compartilhado p/ a 2ª conta)`);
  } catch (e) {
    log(`writeback falhou (${e?.message || e}) — segue sem compartilhar`);
  }
}

main();
