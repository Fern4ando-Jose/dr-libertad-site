import { NextRequest, NextResponse } from "next/server";
import { dayBRT, publishedRunsToday, recentDuplicateTopics, attemptsToday, shouldStopRetrying } from "@/lib/run-ledger";
import { minOfDayBRT } from "@/lib/day";

// Status dos 6 runs do dia por idioma — o que JÁ publicou e o que está FALTANDO
// (vencido por agora e ainda sem publicação). O watchdog (catchup.yml) consome
// `missing` e redispara só esses runs. Atrás do CRON_SECRET, como os demais.
//
//   GET /api/runs-status  → { day, nowMin, missing: [{lang, run}], published }
//
// "Vencido" = a hora daquele run + carência já passou (em BRT). Cron real atrasado
// depois é deduplicado pela trava (carrossel) / livro-razão (reel).

// Hora BRT de cada run (= o cron UTC convertido: 15/20/0/22/12/17 UTC). PRECISA ser
// BRT p/ casar com dayBRT — senão o run 2 (21h BRT = 00h UTC) cairia fora da janela.
const RUN_HOUR_BRT: Record<number, number> = { 0: 12, 1: 17, 2: 21, 3: 19, 4: 9, 5: 14 };
const GRACE_MIN = 75; // carência após o horário do cron antes de considerar "faltando"

// Idiomas com publicação automática ativa (crons ligados). PT no ar desde 2026-06-18.
const ACTIVE_LANGS = ["es", "pt"];

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const now = new Date();
  const day = dayBRT(now);
  const nowMin = minOfDayBRT(now);
  const published = await publishedRunsToday(day);

  const missing: { lang: string; run: number }[] = [];
  // Vagas que vencerem mas já falharam demais hoje (disjuntor) — NÃO entram em
  // `missing` (senão o watchdog redispara à toa e martela a conta). Reportadas à parte.
  const gaveUp: { lang: string; run: number; attempts: number }[] = [];
  for (const lang of ACTIVE_LANGS) {
    const done = new Set(published[lang] ?? []);
    for (let run = 0; run <= 5; run++) {
      const dueMin = RUN_HOUR_BRT[run] * 60 + GRACE_MIN; // venceu por agora?
      if (nowMin < dueMin || done.has(run)) continue;
      const attempts = await attemptsToday(day, run, lang);
      if (shouldStopRetrying(attempts)) gaveUp.push({ lang, run, attempts });
      else missing.push({ lang, run });
    }
  }
  // Detecção: temas repetidos em 7d (2+ vagas distintas). Vazio = saudável; se vier algo,
  // é alarme — captamos um repeat ANTES do dono ver no feed.
  const duplicates = await recentDuplicateTopics(7);
  return NextResponse.json({ ok: true, day, nowMin, missing, gaveUp, published, duplicates });
}
