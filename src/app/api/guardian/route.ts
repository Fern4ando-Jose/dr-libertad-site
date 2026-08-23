import { NextRequest, NextResponse } from "next/server";
import { dayBRT, publishedRunsToday, recentDuplicateTopics, attemptsToday, shouldStopRetrying, orphanedPairs } from "@/lib/run-ledger";
import { minOfDayBRT, RUN_HOUR_BRT, runsForDay, POSTS_PER_DAY } from "@/lib/day";
import { accountFor, type Lang, envToken, envAccountId } from "@/lib/accounts";

// GUARDIÃO diário: verifica se a 1 peça do dia (Reel OU Carrossel — cadência
// 2026-08-23) publicou em CADA conta (ES + PT). VERIFICA DUAS FONTES: (1) nosso
// livro-razão (published_runs) e (2) o PRÓPRIO Instagram via Graph API (a verdade —
// pega post-fantasma: livro diz publicou mas o IG não tem). Persiste o veredito em
// `daily_report` (lido pelo painel-adm) e devolve `missing[]` p/ o guardiao.yml dar
// a última varredura de auto-cura. Pedido do dono (2026-07-07): "os posts rodam nos
// 2 IGs e VOCÊ vigia, verificando no Instagram".
//
//   GET /api/guardian            → verifica (livro + IG) + PERSISTE + retorna
//   GET /api/guardian?day=YYYY-MM-DD → força um dia específico
//   GET /api/guardian?read=1     → só LÊ os últimos 7 relatórios (painel-adm)
//
// Auth: Bearer CRON_SECRET (guardião) ou ADMIN_TOKEN (painel/dono).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// RUN_HOUR_BRT (run→hora BRT) mora em @/lib/day — FONTE ÚNICA compartilhada com catchup/runs-status.
const GRACE_MIN = 75;
const ACTIVE_LANGS: Lang[] = ["es", "br"];
// Vagas esperadas por conta/dia. NÃO é número solto: sai da cadência em @/lib/day
// (hoje 1 — Reel na maioria dos dias, Carrossel a cada 3 dias no lugar dele; nunca
// os dois). Escrever um número à mão aqui foi o que já fez o vigia cobrar uma conta
// enquanto os crons entregavam outra.
const EXPECTED = POSTS_PER_DAY;

function authed(req: NextRequest): boolean {
  const t = req.headers.get("authorization") ?? "";
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_TOKEN;
  return (!!cron && t === `Bearer ${cron}`) || (!!admin && t === `Bearer ${admin}`);
}

// Token atual da conta: config DB (refresh automático) → env. Igual ao publish.
async function getAccessToken(lang: Lang): Promise<string> {
  const acc = accountFor(lang);
  if (acc.dbTokenKey) {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql`SELECT value FROM config WHERE key = ${acc.dbTokenKey}`;
      if (rows.rows[0]?.value) return String(rows.rows[0].value);
    } catch { /* fallback env */ }
  }
  return envToken(acc);
}

// Timestamp da Graph API → DATA em BRT (UTC-3), "YYYY-MM-DD".
function brtDateOf(ts: string): string {
  return new Date(new Date(ts).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

// VERIFICAÇÃO REAL NO INSTAGRAM: quantas mídias a conta publicou no dia `day` (BRT).
// Erro (token/Graph) NÃO derruba o guardião → count = null (cai no livro-razão).
async function countMediaOnIG(lang: Lang, day: string): Promise<{ count: number | null; error?: string }> {
  const acc = accountFor(lang);
  const accountId = envAccountId(acc);
  const token = await getAccessToken(lang);
  if (!accountId || !token) return { count: null, error: "sem accountId/token" };
  try {
    const res = await fetch(`https://graph.instagram.com/v25.0/${accountId}/media?fields=id,timestamp&limit=30&access_token=${token}`);
    const data = await res.json();
    if (!res.ok) return { count: null, error: `Graph HTTP ${res.status}` };
    const media: { timestamp?: string }[] = data?.data ?? [];
    return { count: media.filter((m) => m.timestamp && brtDateOf(m.timestamp) === day).length };
  } catch (e) {
    return { count: null, error: e instanceof Error ? e.message.slice(0, 80) : String(e) };
  }
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Modo leitura (painel-adm): últimos 7 relatórios, sem recomputar.
  if (req.nextUrl.searchParams.get("read") === "1") {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql`SELECT * FROM daily_report ORDER BY day DESC LIMIT 7`;
      return NextResponse.json({ ok: true, reports: rows.rows });
    } catch (e) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
    }
  }

  const now = new Date();
  const nowMin = minOfDayBRT(now);
  const nowHourBRT = Math.floor(nowMin / 60);
  // DIA A VERIFICAR: normalmente hoje; mas se rodar de MADRUGADA (o cron do GitHub
  // atrasou e empurrou o guardião p/ depois da meia-noite BRT), o dia que ACABOU é
  // ontem — senão ele checaria o dia novo vazio e reportaria "1/6" inútil (bug 08/07).
  const override = req.nextUrl.searchParams.get("day");
  const targetDay = override || (nowHourBRT < 8 ? dayBRT(new Date(now.getTime() - 24 * 3600 * 1000)) : dayBRT(now));
  const isToday = !override && targetDay === dayBRT(now);

  const published = await publishedRunsToday(targetDay);
  const missing: { lang: string; run: number }[] = [];   // recuperável AGORA (só se isToday)
  const gaveUp: { lang: string; run: number; attempts: number }[] = [];
  const notRun: { lang: string; run: number }[] = [];     // dia passado que não publicou (irrecuperável)
  // CADÊNCIA 1 PEÇA/DIA (2026-08-23): só o run do TIPO do dia (Reel ou Carrossel,
  // nunca os dois — isCarouselDay em @/lib/day) entra na varredura; o outro foi
  // pulado de propósito e não é "faltando".
  const runsDeHoje = runsForDay(targetDay);
  for (const lang of ACTIVE_LANGS) {
    const done = new Set(published[lang] ?? []);
    for (const run of runsDeHoje) {
      const dueMin = RUN_HOUR_BRT[run] * 60 + GRACE_MIN;
      if (isToday && nowMin < dueMin) continue; // ainda não venceu
      if (done.has(run)) continue;
      const attempts = await attemptsToday(targetDay, run, lang);
      if (shouldStopRetrying(attempts)) gaveUp.push({ lang, run, attempts });
      else if (isToday) missing.push({ lang, run });
      else notRun.push({ lang, run });
    }
  }
  const duplicates = await recentDuplicateTopics(7);
  const orphans = orphanedPairs(published, gaveUp, ACTIVE_LANGS);
  const ledgerEs = (published.es ?? []).length;
  const ledgerBr = (published.br ?? []).length;

  // Verdade do Instagram (o que o dono pediu).
  const [igEs, igBr] = await Promise.all([countMediaOnIG("es", targetDay), countMediaOnIG("br", targetDay)]);
  const esCount = igEs.count ?? ledgerEs; // usa o IG quando disponível
  const brCount = igBr.count ?? ledgerBr;

  const ok = esCount >= EXPECTED && brCount >= EXPECTED && missing.length === 0 && gaveUp.length === 0 && notRun.length === 0 && orphans.length === 0;

  const parts: string[] = [`ES ${esCount}/${EXPECTED}, PT ${brCount}/${EXPECTED}`];
  // Discrepância livro-razão × Instagram = post-fantasma (gravamos publicado, IG não tem).
  if (igEs.count !== null && igEs.count !== ledgerEs) parts.push(`⚠ ES livro=${ledgerEs} mas IG=${igEs.count} (fantasma?)`);
  if (igBr.count !== null && igBr.count !== ledgerBr) parts.push(`⚠ PT livro=${ledgerBr} mas IG=${igBr.count} (fantasma?)`);
  if (igEs.error || igBr.error) parts.push(`IG não verificado: ${[igEs.error && "ES " + igEs.error, igBr.error && "PT " + igBr.error].filter(Boolean).join(", ")}`);
  if (gaveUp.length) parts.push(`desistiu: ${gaveUp.map((g) => `${g.lang}#${g.run}`).join(", ")}`);
  if (missing.length) parts.push(`faltando: ${missing.map((m) => `${m.lang}#${m.run}`).join(", ")}`);
  if (notRun.length) parts.push(`não publicou: ${notRun.map((m) => `${m.lang}#${m.run}`).join(", ")}`);
  if (orphans.length) parts.push(`órfão: ${orphans.map((o) => `#${o.run} (${o.publishedLang}✓ ${o.orphanLang}✗)`).join(", ")}`);
  if (duplicates.length) parts.push(`repetição: ${duplicates.map((d) => d.topic).join(", ")}`);
  // O número sai de EXPECTED (= POSTS_PER_DAY). Escrito à mão dizia "7/7" mesmo depois
  // da cadência virar 4/dia — o relatório que o dono lê mentia sobre a própria meta.
  const note = ok ? `✅ ${EXPECTED}/${EXPECTED} nas duas contas (verificado no Instagram)` : `⚠️ ${parts.join(" · ")}`;

  // Persiste o veredito do dia (upsert). es_published/pt_published = verdade do IG.
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO daily_report (day, es_published, pt_published, expected, ok, missing, gave_up, orphans, duplicates, note, updated_at)
      VALUES (${targetDay}, ${esCount}, ${brCount}, ${EXPECTED}, ${ok}, ${JSON.stringify(missing)}::jsonb, ${JSON.stringify(gaveUp)}::jsonb, ${JSON.stringify(orphans)}::jsonb, ${JSON.stringify(duplicates)}::jsonb, ${note}, NOW())
      ON CONFLICT (day) DO UPDATE SET
        es_published = ${esCount}, pt_published = ${brCount}, ok = ${ok},
        missing = ${JSON.stringify(missing)}::jsonb, gave_up = ${JSON.stringify(gaveUp)}::jsonb,
        orphans = ${JSON.stringify(orphans)}::jsonb, duplicates = ${JSON.stringify(duplicates)}::jsonb,
        note = ${note}, updated_at = NOW()
    `;
  } catch { /* best-effort */ }

  return NextResponse.json({
    ok, day: targetDay, checkedAt: `${nowHourBRT}h BRT`,
    es: esCount, br: brCount, expected: EXPECTED,
    ledger: { es: ledgerEs, br: ledgerBr }, instagram: { es: igEs.count, br: igBr.count, esError: igEs.error, ptError: igBr.error },
    missing, gaveUp, notRun, orphans, duplicates, note,
  });
}
