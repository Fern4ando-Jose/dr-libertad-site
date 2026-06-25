// ─── Livro-razão de publicações por (dia, run, idioma) ───────────────────────
// Registra CADA publicação (carrossel e reel) numa linha (day, run, lang). Serve
// a dois fins:
//   1) idempotência: o reel passa a ter dedup (antes não tinha) → re-disparo do
//      watchdog não republica o que já saiu.
//   2) o watchdog (catchup.yml) consulta o que faltou publicar hoje e só redispara
//      os runs ausentes — sobrevive ao atraso/derrubada de cron do GitHub.
// Tudo best-effort/fail-open: erro de banco nunca bloqueia/derruba a publicação.

// "Dia" da automação — ÂNCORA BRT (UTC-3), não UTC. Fonte única em `./day`.
// (Ver day.ts: por que BRT corrige o reel que renderizava-e-pulava.)
export { dayBRT } from "./day";

// ── Anti "post-fantasma" ──────────────────────────────────────────────────────
// A Graph API às vezes CONFIRMA o media_publish (HTTP 200) mas a resposta vem SEM o
// `id` do media. O post fica VIVO no feed, mas sem id o `recordRun` era pulado (ou
// gravava id nulo) → o livro-razão não enxergava a vaga → o watchdog REDISPARAVA a
// MESMA vaga → o mesmo tema/edição saía 2× no dia (bug "O amor que morre de tédio",
// ED 112, PT, 24/06). Como TODAS as travas filtram `instagram_post_id IS NOT NULL`,
// um post vivo sem id é invisível a elas. Regra: uma publicação CONFIRMADA sempre
// produz um id NÃO-NULO p/ gravar — o media id quando vem, senão o `creation_id`
// como SENTINELA (não-nulo e único por vaga). Pura + testável (run-ledger.invariants).
export function publishedId(mediaId: unknown, creationId: string): string {
  if (typeof mediaId === "string" && mediaId.trim() !== "") return mediaId;
  return creationId;
}

// Já existe publicação registrada para (dia, run, lang)? Fail-open: em erro de
// banco devolve false (NÃO bloqueia o publish — preferimos publicar a travar).
export async function runAlreadyPublished(day: string, run: number, lang: string): Promise<boolean> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql`
      SELECT 1 FROM published_runs
      WHERE day = ${day} AND run = ${run} AND lang = ${lang} AND instagram_post_id IS NOT NULL
      LIMIT 1
    `;
    return rows.rows.length > 0;
  } catch {
    return false;
  }
}

// Registra (ou atualiza) a publicação. Best-effort. Grava o `topic` (coluna nova)
// para a trava anti-dup CROSS-FORMATO: assim um Reel deixa rastro do tópico e o
// carrossel (e vice-versa) não repete o mesmo tema no dia seguinte.
export async function recordRun(
  day: string, run: number, lang: string, kind: string, instagramPostId: string | null,
  topic?: string | null,
): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO published_runs (day, run, lang, kind, instagram_post_id, topic, ts)
      VALUES (${day}, ${run}, ${lang}, ${kind}, ${instagramPostId}, ${topic ?? null}, NOW())
      ON CONFLICT (day, run, lang) DO UPDATE SET
        kind = ${kind}, instagram_post_id = ${instagramPostId},
        topic = COALESCE(${topic ?? null}, published_runs.topic), ts = NOW()
    `;
  } catch { /* livro-razão é best-effort — nunca quebra o pipeline */ }
}

// ── Disjuntor de publicação (anti-martelo) ────────────────────────────────────
// Uma vaga que FALHA a publicação era redisparada pelo watchdog (catchup) a cada
// 15min, pra SEMPRE — sem limite. Isso martelou a conta PT e o Instagram a BLOQUEOU
// ("Application request limit reached", code 4). Regra: conta as tentativas FALHAS por
// vaga/dia; depois de MAX, o catchup para de redisparar a vaga até o dia seguinte.
// Erro DURO do IG (limite/bloqueio/429) já estoura o contador na hora (insistir piora).
// Guardado na coluna published_runs.attempts. FAIL-OPEN: sem a coluna (pré-migrate) ou
// erro de banco → contador 0 → comportamento antigo (sem disjuntor), nunca quebra.
export const MAX_PUBLISH_ATTEMPTS = 3;

export function shouldStopRetrying(attempts: number): boolean {
  return attempts >= MAX_PUBLISH_ATTEMPTS;
}

// O erro de publicação é um bloqueio/limite DURO do Instagram? (não adianta insistir)
export function isHardPublishBlock(err: unknown): boolean {
  const s = String(err ?? "").toLowerCase();
  // "code":4 (limite) precisa do delimitador — senão casaria com 40x/46x e desistiria à toa.
  return s.includes("request limit") || s.includes("action is blocked")
    || s.includes('"code":4,') || s.includes("(#4)") || s.includes("2207051")
    || s.includes("429") || s.includes("rate limit") || s.includes("temporarily blocked");
}

// Registra uma tentativa FALHA da vaga. `hard` (bloqueio do IG) já leva ao teto.
export async function bumpAttempt(day: string, run: number, lang: string, hard = false): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    if (hard) {
      await sql`
        INSERT INTO published_runs (day, run, lang, ts, attempts)
        VALUES (${day}, ${run}, ${lang}, NOW(), ${MAX_PUBLISH_ATTEMPTS})
        ON CONFLICT (day, run, lang) DO UPDATE SET attempts = ${MAX_PUBLISH_ATTEMPTS}, ts = NOW()
      `;
    } else {
      await sql`
        INSERT INTO published_runs (day, run, lang, ts, attempts)
        VALUES (${day}, ${run}, ${lang}, NOW(), 1)
        ON CONFLICT (day, run, lang) DO UPDATE SET attempts = published_runs.attempts + 1, ts = NOW()
      `;
    }
  } catch { /* best-effort: pré-migrate (sem coluna) → no-op, sem disjuntor */ }
}

// Quantas tentativas FALHAS a vaga já teve hoje (0 se publicada/inexistente/erro).
export async function attemptsToday(day: string, run: number, lang: string): Promise<number> {
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql<{ attempts: number }>`
      SELECT attempts FROM published_runs WHERE day = ${day} AND run = ${run} AND lang = ${lang}
    `;
    return Number(r.rows[0]?.attempts ?? 0);
  } catch { return 0; }
}

// Tópicos publicados na conta (lang) nos últimos `days` dias, em QUALQUER formato:
// reels (livro-razão `published_runs.topic`) ∪ carrosséis (`posts.topic`). É a
// base da trava anti-dup REAL na seleção do tema. Fail-open: erro → conjunto vazio
// (não bloqueia; volta ao comportamento antigo).
export async function recentTopicsForLang(lang: string, days = 7): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const { sql } = await import("@vercel/postgres");
    const a = await sql<{ topic: string }>`
      SELECT DISTINCT topic FROM published_runs
      WHERE lang = ${lang} AND topic IS NOT NULL
        AND instagram_post_id IS NOT NULL
        AND ts > NOW() - (${days} || ' days')::interval
    `;
    for (const r of a.rows) if (r.topic) out.add(r.topic);
    const b = await sql<{ topic: string }>`
      SELECT DISTINCT topic FROM posts
      WHERE lang = ${lang} AND topic IS NOT NULL
        AND published_at > NOW() - (${days} || ' days')::interval
    `;
    for (const r of b.rows) if (r.topic) out.add(r.topic);
  } catch { /* fail-open */ }
  return out;
}

// Tópicos publicados em QUALQUER conta nos últimos `days` dias (reels ∪ carrosséis).
// Base UNIFICADA da seleção: ES e PT usam a MESMA base de recentes → escolhem o
// MESMO tema por vaga (vídeo compartilhado) E nenhum repete. Fail-open: vazio.
//
// TRÊS fontes (pra não ter ponto cego): (1) `published_runs.topic` — reels que
// gravaram o tópico (a coluna nasceu em 22/06, então reels ANTERIORES têm NULL);
// (2) `posts.topic` — carrosséis (sempre gravaram); (3) `reel_shared_cache.topic`
// — o tópico REAL de cada reel por dia (resolvido no preview do footage), que
// COBRE os reels antigos sem `published_runs.topic`. Sem (3), a trava era cega aos
// reels da semana e repetia o tema deles num carrossel dias depois.
export async function recentTopicsAllLangs(days = 7): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const { sql } = await import("@vercel/postgres");
    const a = await sql<{ topic: string }>`
      SELECT DISTINCT topic FROM published_runs
      WHERE topic IS NOT NULL AND instagram_post_id IS NOT NULL
        AND ts > NOW() - (${days} || ' days')::interval
    `;
    for (const r of a.rows) if (r.topic) out.add(r.topic);
    const b = await sql<{ topic: string }>`
      SELECT DISTINCT topic FROM posts
      WHERE topic IS NOT NULL
        AND published_at > NOW() - (${days} || ' days')::interval
    `;
    for (const r of b.rows) if (r.topic) out.add(r.topic);
    const c = await sql<{ topic: string }>`
      SELECT DISTINCT topic FROM reel_shared_cache
      WHERE topic IS NOT NULL
        AND created_at > NOW() - (${days} || ' days')::interval
    `;
    for (const r of c.rows) if (r.topic) out.add(r.topic);
  } catch { /* fail-open */ }
  return out;
}

// Livro-razão (dia,run)→tema: o 1º idioma a computar uma vaga GRAVA o tema; o 2º LÊ o
// MESMO (igual ao `editions`) → ES e PT pegam o MESMO tema/vídeo por vaga, mesmo que o
// publish do 1º já tenha entrado no `recent`. INSERT ON CONFLICT DO NOTHING + SELECT
// resolve a corrida (os dois convergem pro 1º gravado). FAIL-OPEN: erro/sem tabela →
// devolve `candidate` (que já NÃO repete, pois o recent inclui hoje). NÃO substitui a
// trava anti-dup — é só pra ES e PT baterem na MESMA vaga sem tirar "hoje" do recent.
export async function getOrSetRunTopic(day: string, run: number, candidate: string): Promise<string> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO run_topics (day, run, topic) VALUES (${day}, ${run}, ${candidate})
      ON CONFLICT (day, run) DO NOTHING
    `;
    const r = await sql<{ topic: string }>`SELECT topic FROM run_topics WHERE day = ${day} AND run = ${run}`;
    return r.rows[0]?.topic ?? candidate;
  } catch {
    return candidate;
  }
}

// ── TRAVA DE PUBLICAÇÃO (rede de segurança INDEPENDENTE da seleção) ────────────
// O tema já saiu em OUTRA vaga (dia,run) nos últimos `days`? Consulta published_runs,
// que UNIFICA reel + carrossel + os 2 idiomas (cada um grava sua vaga lá). EXCLUI a
// própria vaga (dia,run) → o par ES/PT do MESMO (dia,run) é permitido (mesmo vídeo, 2
// idiomas). Pega repetição cross-formato/cross-dia/cross-idioma MESMO se a seleção
// errar — é o que faltava: a garantia mora no PUBLISH, não só na escolha do tema.
// FAIL-OPEN: erro de banco → false (não bloqueia; pior caso volta ao estado anterior).
// PURE (testável): entre as vagas (dia,run) em que o tema já saiu, existe ALGUMA que
// NÃO seja a própria (day,run)? Se sim, é repetição real → bloqueia. A MESMA vaga (par
// ES/PT do mesmo dia,run = mesmo vídeo) é permitida. É a regra que faltava ser testada.
export function hasOtherVaga(vagas: { day: string; run: number }[], day: string, run: number): boolean {
  return vagas.some((v) => !(v.day === day && v.run === run));
}

export async function topicUsedInOtherVaga(day: string, run: number, topic: string, days = 7): Promise<boolean> {
  if (!topic) return false;
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql<{ day: string; run: number }>`
      SELECT day, run FROM published_runs
      WHERE topic = ${topic} AND instagram_post_id IS NOT NULL
        AND ts > NOW() - (${days} || ' days')::interval
    `;
    return hasOtherVaga(r.rows.map((x) => ({ day: x.day, run: Number(x.run) })), day, run);
  } catch {
    return false;
  }
}

// DETECÇÃO: temas que saíram em 2+ vagas DISTINTAS (dia,run) nos últimos `days` — i.e.
// repetição REAL. Alimenta o /api/runs-status pra a gente CAPTAR um repeat antes do dono.
// Vazio = saudável. FAIL-OPEN: erro → [].
export async function recentDuplicateTopics(days = 7): Promise<{ topic: string; vagas: number }[]> {
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql<{ topic: string; vagas: number }>`
      SELECT topic, COUNT(DISTINCT day || ':' || run) AS vagas
      FROM published_runs
      WHERE topic IS NOT NULL AND instagram_post_id IS NOT NULL
        AND ts > NOW() - (${days} || ' days')::interval
      GROUP BY topic
      HAVING COUNT(DISTINCT day || ':' || run) > 1
      ORDER BY vagas DESC
    `;
    return r.rows.map((x) => ({ topic: x.topic, vagas: Number(x.vagas) }));
  } catch {
    return [];
  }
}

// Quais runs do dia já têm publicação, por idioma. Usado pelo watchdog (via
// /api/runs-status) para decidir o que falta. Retorna ex.: { es: [4], pt: [] }.
export async function publishedRunsToday(day: string): Promise<Record<string, number[]>> {
  const out: Record<string, number[]> = {};
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql<{ run: number; lang: string }>`
      SELECT run, lang FROM published_runs
      WHERE day = ${day} AND instagram_post_id IS NOT NULL
    `;
    for (const r of rows.rows) {
      (out[r.lang] ??= []).push(r.run);
    }
  } catch { /* fail-open: devolve o que tiver */ }
  return out;
}
