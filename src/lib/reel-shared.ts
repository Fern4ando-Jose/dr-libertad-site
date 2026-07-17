// ─── Base do Reel COMPARTILHADA entre idiomas ────────────────────────────────
// O Reel ES e o PT do MESMO tópico/dia devem ser o MESMO vídeo: mesmo footage
// (Pexels) e mesma pesquisa (Tavily) — só a COPY muda por idioma (regenerada
// pelo marketBrief, não traduzida). Antes, cada idioma refazia a busca (Tavily
// pago 2×) e escolhia footage próprio (o seed incluía o @handle DE PROPÓSITO) →
// dois vídeos visualmente diferentes. Aqui a parte LÍNGUA-INDEPENDENTE (pesquisa
// + videoQueries + clipes do footage) é resolvida UMA vez por (tópico, dia) e
// cacheada; o 2º idioma reusa tudo. Espelha o padrão de `illustration.ts`.
//
// TUDO best-effort/fail-open: qualquer falha de banco/Pexels devolve null e o
// pipeline segue como antes (cada idioma busca o seu). Nunca quebra a publicação.

import { judgeFootagePosterCached } from "@/lib/footage-qa";
import { FOOTAGE_LIBRARY } from "@/lib/footage-library";
import { searchBySourceKey, availableSources, qaCacheId } from "@/lib/footage-providers";
import { filterClipsByTheme, type ThemeWho } from "@/lib/footage-subject";
import { hashStr as hashStrPure } from "@/lib/footage-media";

export interface SearchResult { title: string; content: string; url: string }

export interface ReelSharedBundle {
  research: SearchResult[];   // resultados da Tavily (contexto p/ a copy)
  videoQueries: string[];     // termos de footage canônicos (inglês, do 1º idioma)
  clips: string[];            // URLs dos clipes Pexels escolhidos (footage idêntico)
}

// Dia (YYYY-MM-DD) ancorado em BRT — entra na chave p/ variação diária e expiração
// natural. Fonte única em `./day` (ES e PT compartilham o MESMO dia BRT → mesma base).
export { dayBRT } from "./day";

// Chave do cache: (tópico, dia). NÃO inclui idioma — é o que garante ES e PT
// lerem/escreverem a MESMA base. (Invariante coberto por teste no CI.)
export function reelSharedKey(topic: string, day: string): string {
  return `${topic}|${day}`;
}

// Hash estável (FNV-1a) — seed de seleção do footage, derivado de (tópico, dia).
// Independente de conta/@handle → ES e PT escolhem o MESMO clipe. FONTE ÚNICA em
// src/lib/footage-media.ts (2026-07-16) — reexportado aqui pra não quebrar os
// imports existentes (`import { hashStr } from "@/lib/reel-shared"`).
export const hashStr = hashStrPure;

// ─── Cache (Postgres) ─────────────────────────────────────────────────────────

export async function readReelShared(topic: string, day: string): Promise<ReelSharedBundle | null> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = reelSharedKey(topic, day);
    const rows = await sql<{ research: unknown; video_queries: unknown; clips: unknown }>`
      SELECT research, video_queries, clips FROM reel_shared_cache
      WHERE cache_key = ${key} AND created_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `;
    const r = rows.rows[0];
    if (!r) return null;
    const research = Array.isArray(r.research) ? (r.research as SearchResult[]) : [];
    const videoQueries = Array.isArray(r.video_queries) ? (r.video_queries as string[]) : [];
    const clips = Array.isArray(r.clips) ? (r.clips as string[]) : [];
    // Só serve de fonte compartilhada se tiver clipes (o que torna o vídeo idêntico).
    if (!clips.length) return null;
    return { research, videoQueries, clips };
  } catch {
    return null; // sem cache → cada idioma resolve o seu (comportamento antigo)
  }
}

export async function writeReelShared(topic: string, day: string, bundle: ReelSharedBundle): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = reelSharedKey(topic, day);
    await sql`
      INSERT INTO reel_shared_cache (cache_key, topic, research, video_queries, clips, created_at)
      VALUES (
        ${key}, ${topic},
        ${JSON.stringify(bundle.research)}::jsonb,
        ${JSON.stringify(bundle.videoQueries)}::jsonb,
        ${JSON.stringify(bundle.clips)}::jsonb,
        NOW()
      )
      ON CONFLICT (cache_key) DO UPDATE SET
        research = ${JSON.stringify(bundle.research)}::jsonb,
        video_queries = ${JSON.stringify(bundle.videoQueries)}::jsonb,
        clips = ${JSON.stringify(bundle.clips)}::jsonb,
        created_at = NOW()
    `;
  } catch { /* cache é best-effort — nunca quebra o pipeline */ }
}

// ─── Writeback do footage achado no CI (fallback) ─────────────────────────────
// Quando a API devolve 0 clipes (Pexels falhou naquele instante), cada conta cai
// no fallback do CI (fetch-footage.mjs) e busca sozinha — com videoQueries por
// IDIOMA → ES e PT podiam achar footage DIFERENTE (ou um achava e o outro saía
// preto). Para garantir o MESMO vídeo, a 1ª conta que achar footage no CI grava
// aqui; a 2ª conta (dispara 5 min depois) lê pelo readReelShared e REUSA.
// NÃO sobrescreve a pesquisa (research) já cacheada — só footage/videoQueries.

export interface ShareClipsInput { topic: string; day: string; clips: string[]; videoQueries: string[] }

// Validador PURO (testável): normaliza o corpo do POST /api/reel-share. Retorna
// null se inválido (sem tópico/dia válido ou sem nenhum clipe utilizável).
export function normalizeShareInput(body: unknown): ShareClipsInput | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const topic = typeof b.topic === "string" ? b.topic.trim() : "";
  const day = typeof b.day === "string" ? b.day.trim() : "";
  if (!topic || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const clips = Array.isArray(b.clips) ? b.clips.filter((c): c is string => typeof c === "string" && c.trim() !== "") : [];
  if (!clips.length) return null; // só compartilha quando há footage de verdade
  const videoQueries = Array.isArray(b.videoQueries) ? b.videoQueries.filter((q): q is string => typeof q === "string" && q.trim() !== "") : [];
  return { topic, day, clips, videoQueries };
}

// Grava SÓ o footage (e videoQueries) na base compartilhada, preservando a
// pesquisa já existente (ON CONFLICT não toca em research). Best-effort.
export async function writeReelSharedClips(input: ShareClipsInput): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const key = reelSharedKey(input.topic, input.day);
    await sql`
      INSERT INTO reel_shared_cache (cache_key, topic, research, video_queries, clips, created_at)
      VALUES (
        ${key}, ${input.topic},
        '[]'::jsonb,
        ${JSON.stringify(input.videoQueries)}::jsonb,
        ${JSON.stringify(input.clips)}::jsonb,
        NOW()
      )
      ON CONFLICT (cache_key) DO UPDATE SET
        video_queries = ${JSON.stringify(input.videoQueries)}::jsonb,
        clips = ${JSON.stringify(input.clips)}::jsonb,
        created_at = NOW()
    `;
  } catch { /* best-effort — nunca quebra o pipeline do CI */ }
}

// ─── Seleção de footage (Pexels) ──────────────────────────────────────────────
// Portado de scripts/fetch-footage.mjs, com UMA diferença: o seed de
// diversificação vem de (tópico, dia), NÃO do @handle/edição — assim ES e PT do
// mesmo run escolhem o MESMO clipe. A diversidade entre DIAS/tópicos é mantida.

// Fallback por categoria — só usado se não houver videoQueries no tema.
const CAT_TERMS: Record<string, string[]> = {
  freedom: ["person arms open nature", "walking free open road", "person breathing calm outdoors", "putting phone away relief"],
  dopamine: ["person scrolling phone in bed", "hand swiping smartphone screen", "phone notifications close up", "person addicted to phone night"],
  anxiety: ["anxious person looking at phone", "stressed person screen night", "overwhelmed person dark room", "rain window sad mood"],
  network: ["people on phones ignoring each other", "lonely person in crowd", "couple distracted by phones", "person alone looking at screen"],
  self: ["person reflection window thinking", "alone silhouette window light", "thoughtful person low light", "person looking in mirror"],
  mind: ["calm person meditating", "person thinking by window", "slow breathing calm light", "quiet moment without phone"],
};

function rotate<T>(arr: T[], n: number): T[] {
  if (!Array.isArray(arr) || arr.length <= 1) return arr || [];
  const k = ((n % arr.length) + arr.length) % arr.length;
  return arr.slice(k).concat(arr.slice(0, k));
}

// Embaralho determinístico por seed (LCG). MESMO seed → MESMA ordem → footage
// idêntico entre ES e PT do mesmo (tópico,dia). Espelha o da UPM.
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = arr.slice();
  let s = seed >>> 0 || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// URLs de footage usadas em Reels recentes (últimos 14 dias) — lidas da própria
// reel_shared_cache. Servem p/ NÃO repetir o mesmo clipe/foto entre Reels/dias (o
// dono pegou o "mão+celular" aparecendo em vários). Fail-open: erro de banco →
// conjunto vazio. `excludeKey`: cache_key do PRÓPRIO (tópico,dia) — sem excluí-lo,
// os clipes que o 1º idioma acabou de gravar entram no "avoid" do 2º (se o shared
// expirar entre eles) e o footage ES/PT diverge (achado #126 da auditoria 29/06).
//
// 2026-07-16: era `recentClipIds` (Set<number>, só extraía o ID numérico de URL
// de VÍDEO Pexels via regex `video-files/(\d+)`) — com 4 fontes (Pexels/Pixabay ×
// vídeo/foto, formatos de URL diferentes), a exclusão agora é pela URL EXATA:
// generaliza sozinha pras 4 fontes (a whitelist/fallback sempre serve a MESMA
// string de URL pro mesmo clipe/foto, então URL é uma chave de recência válida e
// muito mais simples que parsear ID por formato de CDN) — "um clipe/foto já usado
// recentemente em QUALQUER uma das 4 fontes fica de fora", não só dentro da
// própria fonte.
async function recentClipUrls(excludeKey?: string): Promise<Set<string>> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql<{ cache_key: string; clips: unknown }>`
      SELECT cache_key, clips FROM reel_shared_cache WHERE created_at > now() - interval '14 days'`;
    const urls = new Set<string>();
    for (const r of rows.rows) {
      if (excludeKey && r.cache_key === excludeKey) continue;
      const arr = Array.isArray(r.clips) ? (r.clips as string[]) : [];
      for (const u of arr) urls.add(String(u));
    }
    return urls;
  } catch {
    return new Set<string>();
  }
}

// Estágio PRIMÁRIO da seleção, PURO (sem I/O) — a whitelist curada do pilar. Vive
// separado do selectFootage só para ser testável seed a seed (footage-subject.invariants).
// `avoid` = URLs usadas recentemente (vem do banco no chamador; vazio = fail-open).
export function pickFromWhitelist(
  cat: string,
  seed: number,
  numClips: number,
  avoid: ReadonlySet<string> = new Set(),
  themeWho?: ThemeWho,
): string[] {
  // 2026-07-17: antes do sorteio, a whitelist passa pelo SUJEITO do tema (`who` do
  // THEMES × `who` do clipe) — "o sujeito da imagem tem que ser o sujeito da frase".
  // Tema sem `who` → filtro devolve a lista inteira = seleção IDÊNTICA à de antes
  // (fail-open, ver footage-subject.ts). Como o filtro age AQUI, a passada de
  // "relaxamento" (que completa com o resto da whitelist quando o `avoid` seca a
  // lista) também só enxerga clipes compatíveis — nunca repõe o gênero errado.
  const lib = filterClipsByTheme(FOOTAGE_LIBRARY[cat] || [], themeWho);
  const libUrls = lib.map((c) => c.url);
  const fresh = seededShuffle(libUrls.filter((u) => !avoid.has(u)), seed);
  const picked = fresh.slice(0, numClips);
  if (picked.length < numClips) {
    const rest = seededShuffle(libUrls.filter((u) => !picked.includes(u)), seed + 1);
    for (const u of rest) {
      if (picked.length >= numClips) break;
      picked.push(u);
    }
  }
  return picked.slice(0, numClips);
}

// Seleciona até numClips URLs de footage no tema. seed é (tópico,dia) → idêntico
// entre ES e PT. Retorna [] se nenhuma fonte disponível (→ fallback no script de CI).
export async function selectFootage(
  videoQueries: string[],
  cat: string,
  seed: number,
  numClips = 5, // 5 cenas do Reel (capa + 3 insights + CTA) → 5 clipes distintos
  excludeKey?: string, // cache_key do PRÓPRIO (tópico,dia) — fora do "avoid" (#126)
  themeWho?: ThemeWho, // sujeito do TEMA (THEMES.who) — ausente = fail-open, como antes
): Promise<string[]> {
  const avoid = await recentClipUrls(excludeKey);

  // ── PRIMÁRIO: biblioteca CURADA por pilar (whitelist — 4 fontes já vetadas) ──
  // Sorteia numClips clipes DISTINTOS do pilar, determinístico por (tópico,dia) →
  // footage idêntico entre ES e PT, sem repetir clipe no mesmo reel. A whitelist
  // MISTURA Pexels vídeo/foto + Pixabay vídeo/foto (metadado `source`/`mediaType`
  // em cada entrada) — o shuffle já embaralha as 4 fontes entre si, sem lógica
  // extra aqui. Exclui o usado recentemente (CROSS-fonte, ver recentClipUrls);
  // se sobrar pouco após excluir, completa com o restante da whitelist (melhor
  // repetir 1 clipe recente que publicar sem footage). Filtro por sujeito do tema
  // (`themeWho`) e sorteio moram em pickFromWhitelist (puro, com invariantes).
  const picked = pickFromWhitelist(cat, seed, numClips, avoid, themeWho);
  if (picked.length >= numClips) return picked.slice(0, numClips);

  // ── FALLBACK: busca ao vivo, MISTURANDO as 4 fontes (pilar sem biblioteca
  // curada cheia) — Pexels vídeo/foto sempre; Pixabay vídeo/foto só com
  // PIXABAY_API_KEY (fail-open, ainda não existe — 2026-07-16). O SORTEIO entre
  // fontes é ponderado/aleatório por seed (não sempre a mesma ordem Pexels-vídeo
  // primeiro), via seededShuffle da lista de fontes disponíveis a cada rodada.
  const pexelsKey = process.env.PEXELS_API_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY;
  const sources = availableSources({ pexels: pexelsKey, pixabay: pixabayKey });
  if (!sources.length) return picked; // nenhuma fonte disponível — usa o que a whitelist deu

  const anthropicKey = process.env.ANTHROPIC_API_KEY; // QA de conteúdo do footage (incidente 07-01)
  const fromClaude = (Array.isArray(videoQueries) ? videoQueries : []).filter((t) => typeof t === "string" && t.trim());
  const fallbackTerms = (CAT_TERMS[cat] || CAT_TERMS.freedom).slice();
  const terms = fromClaude.length ? fromClaude : fallbackTerms;

  const seenUrls = new Set<string>(picked);

  // Round-robin fonte×termo, na ORDEM sorteada por seed a cada rodada — mistura as
  // 4 fontes em vez de esgotar sempre a mesma primeiro. `avoidSet`= URLs recentes
  // (cross-fonte) OU vazio na passada de relaxamento.
  async function harvest(termList: string[], avoidSet: Set<string>) {
    let round = 0;
    let progressed = true;
    while (picked.length < numClips && progressed) {
      progressed = false;
      const orderedSources = seededShuffle(sources, seed + round * 13);
      for (const sourceKey of orderedSources) {
        if (picked.length >= numClips) break;
        const term = termList[(seed + round) % termList.length];
        let candidates: Awaited<ReturnType<typeof searchBySourceKey>> = [];
        try {
          candidates = await searchBySourceKey(sourceKey, term, { pexels: pexelsKey, pixabay: pixabayKey });
        } catch {
          candidates = [];
        }
        for (const c of rotate(candidates, seed + round * 7)) {
          if (seenUrls.has(c.url) || avoidSet.has(c.url)) continue;
          seenUrls.add(c.url); // considerado — não re-julgar o mesmo candidato
          const verdict = await judgeFootagePosterCached(qaCacheId(sourceKey, c.sourceId), c.poster, anthropicKey, "ig-reels");
          if (verdict.reject) continue;
          picked.push(c.url);
          progressed = true;
          break; // 1 candidato aceito por fonte por rodada — mantém a mistura
        }
      }
      round++;
      if (round > 6) break; // trava de segurança (evita loop infinito se as buscas secarem)
    }
  }

  try {
    if (terms.length) await harvest(terms, avoid);
    // Relaxa: se excluir os recentes deixou poucos clipes, completa permitindo repetir
    // (melhor 1 clipe repetido que Reel sem footage). O dedup DENTRO do Reel (`seenUrls`) fica.
    if (picked.length < numClips && terms.length) await harvest(terms, new Set<string>());
  } catch {
    return picked; // o que deu pra pegar (pode ser [] + o que a whitelist já tinha)
  }
  return picked;
}
