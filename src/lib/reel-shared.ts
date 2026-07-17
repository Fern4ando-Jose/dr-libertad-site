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
import { filterClipsByTheme, liveClipMatchesTheme, type ThemeWho } from "@/lib/footage-subject";
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

// RECÊNCIA do footage usado em Reels recentes (últimos 14 dias) — lida da própria
// reel_shared_cache. Serve p/ NÃO repetir o mesmo clipe/foto entre Reels/dias (o
// dono pegou o "mão+celular" aparecendo em vários). Fail-open: erro de banco →
// mapa vazio. `excludeKey`: cache_key do PRÓPRIO (tópico,dia) — sem excluí-lo,
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
//
// 2026-07-17: era `recentClipUrls` (Set<string> = só PERTINÊNCIA "usou nos 14d?").
// Agora devolve RECÊNCIA (url → ms do uso MAIS RECENTE), porque o relaxamento de
// pickFromWhitelist precisa saber QUÃO recente (LRU) e não só SE — ver lá. O `Map`
// tem `.has()` igual ao `Set`, então o 1º estágio (exclusão) não muda em nada.
// O timestamp é o `created_at` da LINHA do (tópico,dia) — o MESMO para ES e PT (as
// duas contas leem a mesma tabela), então a recência não quebra o determinismo.
export type ClipRecency = ReadonlyMap<string, number>;

// Sentinela p/ "sem registro de uso" (nunca usado / fora da janela). Negativo → ordena
// ANTES de qualquer timestamp real (ms desde 1970 é sempre > 0). NÃO usar -Infinity:
// (-Infinity) - (-Infinity) = NaN e um comparador que devolve NaN corrompe o sort.
const NEVER_USED = -1;

// `ok` (2026-07-17) = a leitura do banco DEU CERTO. Não é firula: é o sinal de que a
// `reel_shared_cache` — o ÚNICO mecanismo que faz ES e PT terem o MESMO vídeo quando entra
// material NÃO-determinístico (busca ao vivo) — está de pé. Banco fora → `ok:false` → o
// chamador desliga as cenas ao vivo e volta a sortear SÓ da whitelist, que é determinística
// por (tópico,dia) e portanto idêntica nos 2 idiomas mesmo sem cache nenhum. Sem este
// sinal, "banco fora" viraria "ES e PT buscam ao vivo cada um por si" = vídeos diferentes.
// (Um `Map` vazio não distingue "erro de banco" de "nenhum uso nos 14 dias" — daí o campo.)
async function recentClipUses(excludeKey?: string): Promise<{ uses: Map<string, number>; ok: boolean }> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql<{ cache_key: string; clips: unknown; created_at: unknown }>`
      SELECT cache_key, clips, created_at FROM reel_shared_cache WHERE created_at > now() - interval '14 days'`;
    const uses = new Map<string, number>();
    for (const r of rows.rows) {
      if (excludeKey && r.cache_key === excludeKey) continue;
      const arr = Array.isArray(r.clips) ? (r.clips as string[]) : [];
      const t = new Date(r.created_at as string | number | Date).getTime();
      const usedAt = Number.isFinite(t) ? t : NEVER_USED; // data ilegível → trata como antiga
      for (const u of arr) {
        const url = String(u);
        const prev = uses.get(url);
        if (prev === undefined || usedAt > prev) uses.set(url, usedAt); // fica o uso MAIS RECENTE
      }
    }
    return { uses, ok: true };
  } catch {
    return { uses: new Map<string, number>(), ok: false }; // fail-open: sem recência → comportamento de sempre
  }
}

// ─── Cenas reservadas ao material AO VIVO ────────────────────────────────────
// Ordem do dono (2026-07-17): "foram apresentadas 4 fontes e estamos usando só uma — as
// que constam no código devem funcionar". Diagnóstico: a whitelist curada (69 clipes,
// 100% videos.pexels.com) SEMPRE entregava as 5 cenas → o `if (picked.length < numClips)`
// nunca era verdade → Pexels-FOTO e Pixabay (vídeo/foto), que só existem na busca ao vivo,
// eram INALCANÇÁVEIS mesmo com PIXABAY_API_KEY posta. Não era a chave que faltava: era o
// caminho. Agora a whitelist entrega `numClips - LIVE_SLOTS` cenas e as demais vêm da
// busca ao vivo — as 4 fontes trabalham no caminho NORMAL, sem depender de a whitelist falhar.
//
// Regulável SEM deploy (decisão do dono, P7): env FOOTAGE_LIVE_SLOTS.
//   0  = botão de pânico: comportamento IDÊNTICO ao de antes desta mudança (whitelist
//        entrega as 5, o harvest nem é chamado — provado por invariante).
//   2  = default: 3 cenas curadas (a CAPA entre elas) + 2 ao vivo.
// Clampado em [0, numClips-1]: nunca deixa a whitelist de fora por completo — ela é a
// única base determinística e é o colchão do fail-open.
const DEFAULT_LIVE_SLOTS = 2;

export function liveSlotsFor(numClips: number, raw = process.env.FOOTAGE_LIVE_SLOTS): number {
  const n = raw == null || raw.trim() === "" ? DEFAULT_LIVE_SLOTS : Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_LIVE_SLOTS; // env com lixo → default (fail-open)
  return Math.max(0, Math.min(Math.floor(n), Math.max(0, numClips - 1)));
}

// Teto de vereditos PAGOS do juiz de footage por chamada de selectFootage. O harvest
// julga candidato por candidato até um passar; num pilar/termo ruim isso poderia varrer
// 4 fontes × 20 candidatos × 7 rodadas = centenas de chamadas pagas e sozinho estourar o
// balde `ig-reels` (US$0,30/dia) — risco que só era teórico enquanto o harvest estava
// morto. Com o teto, o pior caso por Reel é 12 × ~US$0,0015 ≈ US$0,018. Cache HIT não
// conta (é grátis). Batendo o teto, o harvest para e a whitelist completa as cenas.
const MAX_PAID_JUDGMENTS = 12;

// Estágio PRIMÁRIO da seleção, PURO (sem I/O) — a whitelist curada do pilar. Vive
// separado do selectFootage só para ser testável seed a seed (footage-subject.invariants).
// `avoid` = URLs usadas recentemente (vem do banco no chamador; vazio = fail-open).
// Aceita `Set` (só pertinência — comportamento legado) OU `Map` url→ms do último uso
// (recência, o que o banco passa hoje): o 1º estágio só chama `.has()`, idêntico nos dois.
export function pickFromWhitelist(
  cat: string,
  seed: number,
  numClips: number,
  avoid: ReadonlySet<string> | ClipRecency = new Set(),
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

  // ── RELAXAMENTO (pilar SATURADO: o `avoid` comeu a whitelist inteira) ──
  // Bug do dono (17/07): dois Reels seguidos de @dr.liberdade.br saíram com a MESMA
  // CAPA. Raiz: o pilar `self` tem 12 clipes e os 12 estavam no `avoid` (14d) → `fresh`
  // = [] e ESTA passada repunha a whitelist INTEIRA por `seededShuffle(seed+1)` — sorteio
  // CEGO. Ou seja: a anti-repetição se DESLIGAVA sozinha, em silêncio, justo quando era
  // mais necessária, e dois temas do mesmo pilar podiam cair no mesmo 1º clipe (= a capa,
  // o que o dono vê no grid).
  //
  // Agora completa por RECÊNCIA (LRU): o usado HÁ MAIS TEMPO volta primeiro; o que ACABOU
  // de sair é o ÚLTIMO a voltar. Mesma ideia da janela LRU do shuffle-bag dos TEMAS
  // (`selectThemeIndex` em src/lib/rotation.ts). Como o Reel anterior JÁ gravou seus clipes
  // na reel_shared_cache antes do próximo rodar, os clipes dele afundam para o fim da fila
  // → a repetição vira "daqui a ~12 posts" em vez de "no próximo".
  // Empate (mesmo `created_at`, ou `avoid` sem recência = Set legado) → desempate
  // DETERMINÍSTICO por seededShuffle(seed+1), NUNCA pela ordem do array. Com Set (ou mapa
  // vazio) tudo empata → ordem = seed+1 = comportamento IDÊNTICO ao de antes (não-regressão).
  if (picked.length < numClips) {
    const recency = avoid instanceof Map ? (avoid as ClipRecency) : null;
    const lastUse = (u: string): number => recency?.get(u) ?? NEVER_USED;
    const tie = seededShuffle(libUrls.filter((u) => !picked.includes(u)), seed + 1);
    const tieRank = new Map(tie.map((u, i) => [u, i] as const));
    const rest = tie
      .slice()
      .sort((a, b) => lastUse(a) - lastUse(b) || tieRank.get(a)! - tieRank.get(b)!);
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
  const { uses: avoid, ok: dbOk } = await recentClipUses(excludeKey); // Map url→ms do último uso (LRU); vazio = fail-open

  // Cenas reservadas à busca AO VIVO. Banco fora (`!dbOk`) → ZERO cenas ao vivo: sem a
  // reel_shared_cache de pé não há como o 2º idioma REUSAR o que o 1º achou ao vivo, e
  // dois harvests independentes dariam vídeos diferentes. Nesse caso a whitelist (pura,
  // determinística por (tópico,dia)) sustenta o Reel inteiro e ES=PT continua garantido —
  // exatamente o comportamento de hoje. Determinismo > variedade.
  const liveSlots = dbOk ? liveSlotsFor(numClips) : 0;

  // ── PRIMÁRIO: biblioteca CURADA por pilar (whitelist — 4 fontes já vetadas) ──
  // Sorteia clipes DISTINTOS do pilar, determinístico por (tópico,dia) → footage
  // idêntico entre ES e PT, sem repetir clipe no mesmo reel. A whitelist MISTURA
  // Pexels vídeo/foto + Pixabay vídeo/foto (metadado `source`/`mediaType` em cada
  // entrada) — o shuffle já embaralha as 4 fontes entre si, sem lógica extra aqui.
  // Exclui o usado recentemente (CROSS-fonte, ver recentClipUses); se sobrar pouco
  // após excluir, completa com o restante da whitelist pelo MENOS RECENTE primeiro
  // (LRU — melhor repetir o clipe mais antigo que publicar sem footage, e nunca o que
  // acabou de sair). Filtro por sujeito do tema (`themeWho`) e sorteio moram em
  // pickFromWhitelist (puro, com invariantes).
  //
  // Agora pede `numClips - liveSlots`, deixando as últimas cenas para a busca ao vivo.
  // `pickFromWhitelist(…, k)` é PREFIXO de `pickFromWhitelist(…, K)` para k<K (o
  // sorteio é o mesmo, só a fatia muda) → reservar cenas NÃO reembaralha o que a
  // whitelist já dava, e a CAPA (cena 1) continua vindo do acervo curado.
  const picked = pickFromWhitelist(cat, seed, numClips - liveSlots, avoid, themeWho);
  if (picked.length >= numClips) return picked.slice(0, numClips); // liveSlots=0 → sai aqui, como antes

  // ── AO VIVO: busca MISTURANDO as 4 fontes — Pexels vídeo/foto sempre; Pixabay
  // vídeo/foto só com PIXABAY_API_KEY (fail-open). O SORTEIO entre fontes é
  // ponderado/aleatório por seed (não sempre a mesma ordem Pexels-vídeo primeiro),
  // via seededShuffle da lista de fontes disponíveis a cada rodada.
  //
  // Isto deixou de ser um FALLBACK (que nunca disparava, porque a whitelist sempre
  // enchia as 5 cenas) e virou parte do caminho NORMAL — é o que torna as 4 fontes
  // realmente alcançáveis. Continua 100% fail-open: tudo que der errado daqui pra
  // baixo cai no `completarComWhitelist()` do fim e o Reel sai igual.
  const pexelsKey = process.env.PEXELS_API_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY;
  const sources = availableSources({ pexels: pexelsKey, pixabay: pixabayKey });

  // Fail-open do RESULTADO: completa as cenas que faltarem com a whitelist (o mesmo
  // sorteio determinístico, agora pedindo as numClips). Chamado em TODA saída daqui pra
  // frente — sem chave, sem fonte, busca morta, QA rejeitando tudo, teto de julgamentos
  // batido: o Reel NUNCA sai sem footage por causa das cenas ao vivo.
  const completarComWhitelist = (): string[] => {
    if (picked.length >= numClips) return picked.slice(0, numClips);
    for (const u of pickFromWhitelist(cat, seed, numClips, avoid, themeWho)) {
      if (picked.length >= numClips) break;
      if (!picked.includes(u)) picked.push(u);
    }
    return picked.slice(0, numClips);
  };

  if (!sources.length) return completarComWhitelist(); // nenhuma fonte disponível

  const anthropicKey = process.env.ANTHROPIC_API_KEY; // QA de conteúdo do footage (incidente 07-01)
  const fromClaude = (Array.isArray(videoQueries) ? videoQueries : []).filter((t) => typeof t === "string" && t.trim());
  const fallbackTerms = (CAT_TERMS[cat] || CAT_TERMS.freedom).slice();
  const terms = fromClaude.length ? fromClaude : fallbackTerms;

  const seenUrls = new Set<string>(picked);
  let paidJudgments = 0; // vereditos COBRADOS nesta chamada (cache hit não conta) — teto de custo

  // Round-robin fonte×termo, na ORDEM sorteada por seed a cada rodada — mistura as
  // 4 fontes em vez de esgotar sempre a mesma primeiro. `avoidSet`= URLs recentes
  // (cross-fonte; o Map de recência responde `.has()` igual ao Set) OU vazio na
  // passada de relaxamento.
  async function harvest(termList: string[], avoidSet: ReadonlySet<string> | ClipRecency) {
    let round = 0;
    let progressed = true;
    while (picked.length < numClips && progressed && paidJudgments < MAX_PAID_JUDGMENTS) {
      progressed = false;
      const orderedSources = seededShuffle(sources, seed + round * 13);
      for (const sourceKey of orderedSources) {
        if (picked.length >= numClips || paidJudgments >= MAX_PAID_JUDGMENTS) break;
        const term = termList[(seed + round) % termList.length];
        let candidates: Awaited<ReturnType<typeof searchBySourceKey>> = [];
        try {
          candidates = await searchBySourceKey(sourceKey, term, { pexels: pexelsKey, pixabay: pixabayKey });
        } catch {
          candidates = [];
        }
        for (const c of rotate(candidates, seed + round * 7)) {
          if (seenUrls.has(c.url) || avoidSet.has(c.url)) continue;
          if (paidJudgments >= MAX_PAID_JUDGMENTS) break; // teto de custo — para de julgar
          seenUrls.add(c.url); // considerado — não re-julgar o mesmo candidato
          const verdict = await judgeFootagePosterCached(qaCacheId(sourceKey, c.sourceId), c.poster, anthropicKey, "ig-reels");
          if (!verdict.cached) paidJudgments++;
          if (verdict.reject) continue;
          // SUJEITO (2026-07-17): "o sujeito da imagem tem que ser o sujeito da frase"
          // vale também aqui, senão um tema `man` receberia mulher da busca ao vivo e o
          // defeito da ed. 164 voltava pela porta dos fundos. O `who` vem do MESMO
          // veredito do juiz (custo zero) e é fail-CLOSED: sujeito desconhecido (veredito
          // antigo do cache, ou QA pulado por falta de chave) NÃO entra em tema com
          // sujeito declarado — a whitelist completa a cena. Ver footage-subject.ts.
          if (!liveClipMatchesTheme(verdict.who, themeWho)) continue;
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
    return completarComWhitelist(); // busca ao vivo explodiu → whitelist enche o Reel
  }
  return completarComWhitelist();
}
