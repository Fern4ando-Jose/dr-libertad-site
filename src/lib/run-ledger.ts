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
  // ZERA o disjuntor numa publicação CONFIRMADA (id não-nulo): sem isto a vaga ficava
  // "publicada" E com attempts>0 — estado contraditório que só não mordia porque o gate
  // checa runAlreadyPublished ANTES de shouldStopRetrying (ordem load-bearing, ver
  // slotSkipGate). Query SEPARADA e best-effort de propósito: se a coluna `attempts` não
  // existir (pré-migrate), só ela falha — o registro de idempotência acima NUNCA depende
  // dela (acoplar quebraria a dedup e reabriria a duplicata). (Auditoria 30/06.)
  if (instagramPostId != null) {
    try {
      const { sql } = await import("@vercel/postgres");
      await sql`UPDATE published_runs SET attempts = 0 WHERE day = ${day} AND run = ${run} AND lang = ${lang}`;
    } catch { /* sem coluna attempts (pré-migrate) → no-op */ }
  }
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

// As DUAS primeiras portas da vaga, na ORDEM correta (load-bearing). A regra "publicada
// ANTES de desistiu" é o que impede o post-fantasma de reabrir: uma vaga publicada NUNCA
// pode ser tratada como "desistiu" pelo disjuntor (mascararia uma publicação real e o
// catchup poderia republicar). Antes a ordem morava solta em dois `if` no /api/publish, sem
// teste; aqui ela é PURA e coberta por invariante. `force=1` (backfill manual) burla as duas.
// Retorna a 1ª porta que BARRA, ou null (a vaga segue para a trava de tema + publish).
export function slotSkipGate(
  alreadyPublished: boolean, attempts: number, force: boolean,
): "published" | "circuit-open" | null {
  if (force) return null;
  if (alreadyPublished) return "published";        // SEMPRE antes do disjuntor
  if (shouldStopRetrying(attempts)) return "circuit-open";
  return null;
}

// O erro de publicação é um bloqueio/limite DURO do Instagram? (não adianta insistir)
export function isHardPublishBlock(err: unknown): boolean {
  const s = String(err ?? "").toLowerCase();
  // "code":4 (limite) precisa do delimitador — senão casaria com 40x/46x e desistiria à toa.
  return s.includes("request limit") || s.includes("action is blocked")
    || s.includes('"code":4,') || s.includes("(#4)") || s.includes("2207051")
    || s.includes("429") || s.includes("rate limit") || s.includes("temporarily blocked");
}

// Decisão pós-`media_publish` que volta com ERRO (HTTP !ok). O action-block/limite DURO
// do IG ("Application request limit reached", code 4 / 2207051) responde ERRO mas PUBLICA
// o post no feed assim mesmo (observado: carrossel PT "O casal fake…", 26/06). Se a gente
// LANÇA, o chamador grava id NULL → a vaga fica invisível ao runAlreadyPublished → o
// catchup REPUBLICA → DUPLICATA. Como o post provavelmente está VIVO num bloqueio duro,
// devolve "sentinel" (gravar a vaga com o creation_id e NÃO republicar). Erro NÃO-duro
// (ex.: "media not ready", transitório, post NÃO vivo) → "throw" (falha real; o disjuntor
// conta a tentativa e o catchup pode tentar de novo). PURE/testável. Doutrina "tem de ser
// ÚNICA": melhor uma vaga marcada-publicada que uma duplicata no feed.
export function publishFailureMode(errText: unknown): "sentinel" | "throw" {
  return isHardPublishBlock(errText) ? "sentinel" : "throw";
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

// ── Reabertura do disjuntor ao LIBERAR orçamento (C2, auditoria 30/06) ─────────
// Um 402 de orçamento marca a vaga como circuit-open (attempts=MAX) e o balde é
// DIÁRIO → nada reabre a vaga no mesmo dia, MESMO que o dono suba o teto ("liberar
// gasto"). Resultado: vaga perdida o dia inteiro apesar do gasto liberado. Estas
// funções deixam o POST /api/spend REABRIR o disjuntor quando o teto SOBE.
//
// Vagas (runs) de cada automação — reels 0..3, carrosséis 4..5 (ver CLAUDE.md /
// workflows). PURA/testável. Automação sem vagas de publicação (manual/engagement/
// newsletter) → [] (nada a reabrir).
export function runsForAutomation(automation: string): number[] {
  if (automation === "ig-reels") return [0, 1, 2, 3];
  if (automation === "ig-posts") return [4, 5];
  return [];
}

// Só REABRE quando o teto SOBE (o dono liberou gasto). Baixar/manter o teto NÃO
// reabre (evita mexer no disjuntor à toa). PURA/testável.
export function shouldReopenOnBudgetChange(oldBudget: number, newBudget: number): boolean {
  return newBudget > oldBudget;
}

// ZERA o disjuntor das vagas NÃO publicadas do dia (dayBRT) daquela automação — para o
// catchup poder tentar de novo AGORA que o gasto foi liberado. SÓ é chamada num aumento
// MANUAL de teto (não automático) → NÃO reabre a "tempestade" de catchup: a causa-raiz
// (o teto baixo) já foi corrigida, então a retentativa PASSA em vez de falhar em loop.
// Nunca toca vaga publicada (instagram_post_id NOT NULL). Só reabre as que DESISTIRAM
// (attempts>=MAX) — inclui a rara vaga travada por bloqueio-duro do IG, que re-arma
// sozinha se ainda estiver bloqueada. Devolve quantas vagas reabriu. FAIL-OPEN → 0.
export async function reopenCircuitForAutomation(day: string, automation: string): Promise<number> {
  const runs = runsForAutomation(automation);
  if (runs.length === 0) return 0;
  try {
    const { sql } = await import("@vercel/postgres");
    // sql.query (parametrizado): o tagged template não aceita array como param; aqui o
    // driver converte o array JS de `runs` no array Postgres de $2::int[].
    const r = await sql.query(
      `UPDATE published_runs SET attempts = 0
       WHERE day = $1 AND run = ANY($2::int[])
         AND instagram_post_id IS NULL
         AND attempts >= $3`,
      [day, runs, MAX_PUBLISH_ATTEMPTS],
    );
    return r.rowCount ?? 0;
  } catch {
    return 0; // best-effort: pré-migrate/erro → não reabre, nunca quebra o endpoint
  }
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

// Vagas PUBLICADAS (topic, day, run) nos últimos `days` dias — base do SHUFFLE BAG
// (rotação balanceada sem repetir até esgotar). Diferente do `recentTopicsAllLangs`
// (que só dá o conjunto de tópicos): aqui devolve o (day,run) de cada um pra mapear a
// vaga no CICLO certo. published_runs UNIFICA reel + carrossel + ES/PT (todo formato
// grava via recordRun), então é a fonte completa por vaga. `days` cobre ≥ 1 ciclo
// (61 temas a 6/dia ≈ 10,2 dias → 16 por folga). FAIL-OPEN: erro → [] (cai no legado).
export async function recentPublishedSlots(days = 16): Promise<{ topic: string; day: string; run: number }[]> {
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql<{ topic: string; day: string; run: number }>`
      SELECT DISTINCT topic, day, run FROM published_runs
      WHERE topic IS NOT NULL AND instagram_post_id IS NOT NULL
        AND ts > NOW() - (${days} || ' days')::interval
    `;
    return r.rows.map((x) => ({ topic: x.topic, day: String(x.day).slice(0, 10), run: Number(x.run) }));
  } catch {
    return [];
  }
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

// Libera o pin (dia,run)→tema. Chamado quando a TRAVA DE PUBLICAÇÃO bloqueia o tema da
// vaga: sem isto o `run_topics` congelava o tema BLOQUEADO e toda retentativa do dia relia
// o mesmo → vaga presa, nunca publica (regressão do sub-uso que o shuffle bag corrigiu). Ao
// limpar, a próxima retentativa recomputa um candidato fresco — e como o `publishedIdxSlots`
// cresce ao longo do dia, o `selectThemeIndex` tende a dar um tema NÃO bloqueado → a vaga
// recupera. O caminho feliz (tema não bloqueado) NÃO chama isto: o pin persiste e ES/PT
// seguem no mesmo tema/vídeo. Best-effort/fail-open. (Auditoria 30/06.)
export async function clearRunTopic(day: string, run: number): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`DELETE FROM run_topics WHERE day = ${day} AND run = ${run}`;
  } catch { /* best-effort — sem tabela/erro → no-op */ }
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

// ── ATOMICIDADE ES+PT por vaga ────────────────────────────────────────────────
// A vaga (dia,run) é UMA unidade lógica: tem de sair nas DUAS contas (ES e PT) ou em
// NENHUMA — "publicou numa, tem de sair na outra; tem de ser única" (regra do dono). A
// causa nº1 de ÓRFÃO (uma língua sai, a irmã não) é o balde de orçamento COMPARTILHADO
// ig-posts: o 1º idioma gasta e o 2º bate no teto → 402 → órfão ES-only (documentado em
// posting-stalls-cron-and-budget). `siblingPublished` deixa o gate de orçamento LIBERAR
// o 2º idioma quando o 1º já saiu — completa o par. Bounded: no máx +1 publish por vaga;
// a ilustração do 2º idioma já vem do cache compartilhado (custo marginal ~só haiku).
// FAIL-OPEN: erro de banco → false (NÃO libera; volta ao comportamento anterior).
export async function siblingPublished(day: string, run: number, lang: string): Promise<boolean> {
  try {
    const { sql } = await import("@vercel/postgres");
    const r = await sql`
      SELECT 1 FROM published_runs
      WHERE day = ${day} AND run = ${run} AND lang <> ${lang}
        AND instagram_post_id IS NOT NULL
      LIMIT 1
    `;
    return r.rows.length > 0;
  } catch {
    return false;
  }
}

// DETECÇÃO de par ÓRFÃO (PURE, testável): vaga (run) em que UMA língua publicou e a
// OUTRA já DESISTIU (no `gaveUp` do disjuntor) → assimetria PERMANENTE no feed. Alimenta
// /api/runs-status como ALARME (igual a `duplicates`) — captamos a quebra do par ANTES do
// dono ver. Só conta como órfão quando a irmã NÃO vai mais tentar (gaveUp); se ainda está
// em `missing`, o catchup pode parear, então não alarma. Vazio = saudável.
export function orphanedPairs(
  publishedByLang: Record<string, number[]>,
  gaveUp: { lang: string; run: number }[],
  langs: string[],
): { run: number; publishedLang: string; orphanLang: string }[] {
  const out: { run: number; publishedLang: string; orphanLang: string }[] = [];
  const gaveUpSet = new Set(gaveUp.map((g) => `${g.lang}:${g.run}`));
  const runsSeen = new Set<number>();
  for (const l of langs) for (const r of publishedByLang[l] ?? []) runsSeen.add(r);
  for (const g of gaveUp) runsSeen.add(g.run);
  for (const run of runsSeen) {
    const publishedLang = langs.find((l) => (publishedByLang[l] ?? []).includes(run));
    if (!publishedLang) continue;
    const orphanLang = langs.find((l) => l !== publishedLang && gaveUpSet.has(`${l}:${run}`));
    if (orphanLang) out.push({ run, publishedLang, orphanLang });
  }
  return out;
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
