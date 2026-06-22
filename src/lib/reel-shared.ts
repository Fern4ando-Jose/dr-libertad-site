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

export interface SearchResult { title: string; content: string; url: string }

export interface ReelSharedBundle {
  research: SearchResult[];   // resultados da Tavily (contexto p/ a copy)
  videoQueries: string[];     // termos de footage canônicos (inglês, do 1º idioma)
  clips: string[];            // URLs dos clipes Pexels escolhidos (footage idêntico)
}

// Dia UTC (YYYY-MM-DD) — entra na chave p/ haver variação diária e expiração natural.
export function dayUTC(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

// Chave do cache: (tópico, dia). NÃO inclui idioma — é o que garante ES e PT
// lerem/escreverem a MESMA base. (Invariante coberto por teste no CI.)
export function reelSharedKey(topic: string, day: string): string {
  return `${topic}|${day}`;
}

// Hash estável (FNV-1a) — seed de seleção do footage, derivado de (tópico, dia).
// Independente de conta/@handle → ES e PT escolhem o MESMO clipe.
export function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

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

// ─── Seleção de footage (Pexels) ──────────────────────────────────────────────
// Portado de scripts/fetch-footage.mjs, com UMA diferença: o seed de
// diversificação vem de (tópico, dia), NÃO do @handle/edição — assim ES e PT do
// mesmo run escolhem o MESMO clipe. A diversidade entre DIAS/tópicos é mantida.

const PER_PAGE = 20;

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

// Escolhe o melhor arquivo: retrato, ~1080p (evita 4K pesado no render do CI).
function pickFile(video: any): string | null {
  const files = (video.video_files || []).filter((f: any) => f.link && f.width && f.height);
  if (!files.length) return null;
  const portrait = files.filter((f: any) => f.height >= f.width);
  const pool = portrait.length ? portrait : files;
  pool.sort((a: any, b: any) => {
    const sa = (a.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(a.width - 1080);
    const sb = (b.width <= 1440 ? 0 : 1) * 1e6 + Math.abs(b.width - 1080);
    return sa - sb;
  });
  return pool[0].link;
}

async function searchTerm(term: string, key: string): Promise<any[]> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(term)}&orientation=portrait&size=medium&per_page=${PER_PAGE}`;
  const res = await fetch(url, { headers: { Authorization: key } });
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({} as any));
  const vids = Array.isArray(data.videos) ? data.videos : [];
  return vids.filter((v: any) => v.height >= v.width && (v.duration || 0) >= 4);
}

// Seleciona até numClips URLs de footage no tema. seed é (tópico,dia) → idêntico
// entre ES e PT. Retorna [] se Pexels indisponível (→ fallback no script de CI).
export async function selectFootage(
  videoQueries: string[],
  cat: string,
  seed: number,
  numClips = 5, // 5 cenas do Reel (capa + 3 insights + CTA) → 5 clipes distintos
): Promise<string[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return [];
  const fromClaude = (Array.isArray(videoQueries) ? videoQueries : []).filter((t) => typeof t === "string" && t.trim());
  const fallback = (CAT_TERMS[cat] || CAT_TERMS.freedom).slice();

  const picked: string[] = [];
  const seen = new Set<number>();

  // Round-robin entre os termos: 1 clipe de CADA termo por passada → diverso e no tema.
  async function harvest(termList: string[]) {
    const queues: { vids: any[]; i: number }[] = [];
    for (let t = 0; t < termList.length; t++) {
      if (picked.length >= numClips) break;
      const vids = rotate(await searchTerm(termList[t], key!), seed + t * 7);
      queues.push({ vids, i: 0 });
    }
    let progressed = true;
    while (picked.length < numClips && progressed) {
      progressed = false;
      for (const q of queues) {
        if (picked.length >= numClips) break;
        while (q.i < q.vids.length) {
          const v = q.vids[q.i++];
          if (seen.has(v.id)) continue;
          const link = pickFile(v);
          if (!link) continue;
          seen.add(v.id);
          picked.push(link);
          progressed = true;
          break;
        }
      }
    }
  }

  try {
    if (fromClaude.length) await harvest(fromClaude);
    if (!picked.length) await harvest(fallback);
  } catch {
    return picked; // o que deu pra pegar (pode ser [])
  }
  return picked;
}
