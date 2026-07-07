import { NextRequest, NextResponse } from "next/server";
import { dayBRT, publishedRunsToday, recentDuplicateTopics, attemptsToday, shouldStopRetrying, orphanedPairs } from "@/lib/run-ledger";
import { minOfDayBRT } from "@/lib/day";

// GUARDIÃO diário: verifica se as 6 vagas do dia (0..5) publicaram em CADA conta
// (ES + PT), persiste o veredito em `daily_report` (lido pelo painel-adm p/ alertar
// o dono) e devolve `missing[]` para o workflow guardiao.yml dar a última varredura
// de auto-cura. Objetivo do dono (2026-07-07): "os 6 posts rodam nos 2 IGs, e VOCÊ
// vigia, não eu". Ver .github/workflows/guardiao.yml.
//
//   GET /api/guardian           → computa + PERSISTE + retorna o veredito do dia
//   GET /api/guardian?read=1    → só LÊ os últimos 7 relatórios (painel-adm), sem recomputar
//
// Auth: Bearer CRON_SECRET (guardião) ou ADMIN_TOKEN (painel/dono).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Espelha runs-status: hora BRT de cada run + carência antes de considerar "faltando".
const RUN_HOUR_BRT: Record<number, number> = { 0: 12, 1: 17, 2: 21, 3: 19, 4: 9, 5: 14 };
const GRACE_MIN = 75;
const ACTIVE_LANGS = ["es", "pt"];
const EXPECTED = 6; // 6 vagas/dia por conta (2 carrosséis + 4 reels)

function authed(req: NextRequest): boolean {
  const t = req.headers.get("authorization") ?? "";
  const cron = process.env.CRON_SECRET;
  const admin = process.env.ADMIN_TOKEN;
  return (!!cron && t === `Bearer ${cron}`) || (!!admin && t === `Bearer ${admin}`);
}

export async function GET(req: NextRequest) {
  if (!authed(req)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Modo leitura (painel-adm): últimos 7 relatórios, sem recomputar/persistir.
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
  const day = dayBRT(now);
  const nowMin = minOfDayBRT(now);
  const published = await publishedRunsToday(day);

  const missing: { lang: string; run: number }[] = [];
  const gaveUp: { lang: string; run: number; attempts: number }[] = [];
  for (const lang of ACTIVE_LANGS) {
    const done = new Set(published[lang] ?? []);
    for (let run = 0; run <= 5; run++) {
      const dueMin = RUN_HOUR_BRT[run] * 60 + GRACE_MIN;
      if (nowMin < dueMin || done.has(run)) continue;
      const attempts = await attemptsToday(day, run, lang);
      if (shouldStopRetrying(attempts)) gaveUp.push({ lang, run, attempts });
      else missing.push({ lang, run });
    }
  }
  const duplicates = await recentDuplicateTopics(7);
  const orphans = orphanedPairs(published, gaveUp, ACTIVE_LANGS);
  const es = (published.es ?? []).length;
  const pt = (published.pt ?? []).length;
  const ok = es >= EXPECTED && pt >= EXPECTED && missing.length === 0 && gaveUp.length === 0 && orphans.length === 0;

  const parts: string[] = [`ES ${es}/${EXPECTED}, PT ${pt}/${EXPECTED}`];
  if (gaveUp.length) parts.push(`desistiu: ${gaveUp.map((g) => `${g.lang}#${g.run}`).join(", ")}`);
  if (missing.length) parts.push(`faltando: ${missing.map((m) => `${m.lang}#${m.run}`).join(", ")}`);
  if (orphans.length) parts.push(`órfão: ${orphans.map((o) => `#${o.run} (${o.publishedLang} publicou, ${o.orphanLang} não)`).join(", ")}`);
  if (duplicates.length) parts.push(`repetição: ${duplicates.map((d) => d.topic).join(", ")}`);
  const note = ok ? `✅ 6/6 nas duas contas` : `⚠️ ${parts.join(" · ")}`;

  // Persiste o veredito do dia (upsert). Best-effort — nunca derruba a resposta.
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO daily_report (day, es_published, pt_published, expected, ok, missing, gave_up, orphans, duplicates, note, updated_at)
      VALUES (${day}, ${es}, ${pt}, ${EXPECTED}, ${ok}, ${JSON.stringify(missing)}::jsonb, ${JSON.stringify(gaveUp)}::jsonb, ${JSON.stringify(orphans)}::jsonb, ${JSON.stringify(duplicates)}::jsonb, ${note}, NOW())
      ON CONFLICT (day) DO UPDATE SET
        es_published = ${es}, pt_published = ${pt}, ok = ${ok},
        missing = ${JSON.stringify(missing)}::jsonb, gave_up = ${JSON.stringify(gaveUp)}::jsonb,
        orphans = ${JSON.stringify(orphans)}::jsonb, duplicates = ${JSON.stringify(duplicates)}::jsonb,
        note = ${note}, updated_at = NOW()
    `;
  } catch { /* best-effort */ }

  return NextResponse.json({ ok, day, es, pt, expected: EXPECTED, missing, gaveUp, orphans, duplicates, note });
}
