import { NextRequest, NextResponse } from "next/server";
import { dayBRT, publishedRunsToday, recentDuplicateTopics, attemptsToday, shouldStopRetrying, orphanedPairs } from "@/lib/run-ledger";
import { minOfDayBRT, RUN_HOUR_BRT, ACTIVE_RUNS, POSTS_PER_DAY } from "@/lib/day";
import { accountFor, type Lang } from "@/lib/accounts";

// GUARDIÃO diário: verifica se as 6 vagas do dia publicaram em CADA conta (ES + PT).
// VERIFICA DUAS FONTES: (1) nosso livro-razão (published_runs) e (2) o PRÓPRIO
// Instagram via Graph API (a verdade — pega post-fantasma: livro diz publicou mas o
// IG não tem). Persiste o veredito em `daily_report` (lido pelo painel-adm) e devolve
// `missing[]` p/ o guardiao.yml dar a última varredura de auto-cura. Pedido do dono
// (2026-07-07): "os 6 posts rodam nos 2 IGs e VOCÊ vigia, verificando no Instagram".
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
const ACTIVE_LANGS: Lang[] = ["es", "pt"];
// Vagas esperadas por conta/dia. NÃO é número solto: sai da cadência em @/lib/day
// (hoje 4 = 1 carrossel + 2 reels vídeo + 1 clássico). Escrever "7" aqui à mão foi o
// que fez o vigia cobrar 7 enquanto os crons entregavam outra coisa.
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
  return process.env[acc.tokenEnv] ?? "";
}

// Timestamp da Graph API → DATA em BRT (UTC-3), "YYYY-MM-DD".
function brtDateOf(ts: string): string {
  return new Date(new Date(ts).getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

// VERIFICAÇÃO REAL NO INSTAGRAM: quantas mídias a conta publicou no dia `day` (BRT).
// Erro (token/Graph) NÃO derruba o guardião → count = null (cai no livro-razão).
async function countMediaOnIG(lang: Lang, day: string): Promise<{ count: number | null; error?: string }> {
  const acc = accountFor(lang);
  const accountId = process.env[acc.accountIdEnv] ?? "";
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
  for (const lang of ACTIVE_LANGS) {
    const done = new Set(published[lang] ?? []);
    for (const run of ACTIVE_RUNS) {
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
  const ledgerPt = (published.pt ?? []).length;

  // Verdade do Instagram (o que o dono pediu).
  const [igEs, igPt] = await Promise.all([countMediaOnIG("es", targetDay), countMediaOnIG("pt", targetDay)]);
  const esCount = igEs.count ?? ledgerEs; // usa o IG quando disponível
  const ptCount = igPt.count ?? ledgerPt;

  const ok = esCount >= EXPECTED && ptCount >= EXPECTED && missing.length === 0 && gaveUp.length === 0 && notRun.length === 0 && orphans.length === 0;

  const parts: string[] = [`ES ${esCount}/${EXPECTED}, PT ${ptCount}/${EXPECTED}`];
  // Discrepância livro-razão × Instagram = post-fantasma (gravamos publicado, IG não tem).
  if (igEs.count !== null && igEs.count !== ledgerEs) parts.push(`⚠ ES livro=${ledgerEs} mas IG=${igEs.count} (fantasma?)`);
  if (igPt.count !== null && igPt.count !== ledgerPt) parts.push(`⚠ PT livro=${ledgerPt} mas IG=${igPt.count} (fantasma?)`);
  if (igEs.error || igPt.error) parts.push(`IG não verificado: ${[igEs.error && "ES " + igEs.error, igPt.error && "PT " + igPt.error].filter(Boolean).join(", ")}`);
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
      VALUES (${targetDay}, ${esCount}, ${ptCount}, ${EXPECTED}, ${ok}, ${JSON.stringify(missing)}::jsonb, ${JSON.stringify(gaveUp)}::jsonb, ${JSON.stringify(orphans)}::jsonb, ${JSON.stringify(duplicates)}::jsonb, ${note}, NOW())
      ON CONFLICT (day) DO UPDATE SET
        es_published = ${esCount}, pt_published = ${ptCount}, ok = ${ok},
        missing = ${JSON.stringify(missing)}::jsonb, gave_up = ${JSON.stringify(gaveUp)}::jsonb,
        orphans = ${JSON.stringify(orphans)}::jsonb, duplicates = ${JSON.stringify(duplicates)}::jsonb,
        note = ${note}, updated_at = NOW()
    `;
  } catch { /* best-effort */ }

  return NextResponse.json({
    ok, day: targetDay, checkedAt: `${nowHourBRT}h BRT`,
    es: esCount, pt: ptCount, expected: EXPECTED,
    ledger: { es: ledgerEs, pt: ledgerPt }, instagram: { es: igEs.count, pt: igPt.count, esError: igEs.error, ptError: igPt.error },
    missing, gaveUp, notRun, orphans, duplicates, note,
  });
}
