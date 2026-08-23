import { NextRequest, NextResponse } from "next/server";
import { dayBRT, publishedRunsToday, recentDuplicateTopics, attemptsToday, shouldStopRetrying, orphanedPairs } from "@/lib/run-ledger";
import { minOfDayBRT, RUN_HOUR_BRT, runsForDay } from "@/lib/day";

// Status do run do dia (Reel OU Carrossel — cadência 1 peça/dia, 2026-08-23) por
// idioma: o que JÁ publicou e o que está FALTANDO (vencido por agora e ainda sem
// publicação). O watchdog (catchup.yml) consome `missing` e redispara só esses
// runs. Atrás do CRON_SECRET, como os demais.
//
//   GET /api/runs-status  → { day, nowMin, missing: [{lang, run}], published }
//
// "Vencido" = a hora daquele run + carência já passou (em BRT). Cron real atrasado
// depois é deduplicado pela trava (carrossel) / livro-razão (reel).

// Hora BRT de cada run (= o cron UTC convertido: 22 UTC → 19h BRT, hoje o único
// horário armado). PRECISA ser BRT p/ casar com dayBRT — senão um slot da noite
// vazaria pro dia UTC seguinte. RUN_HOUR_BRT (run→hora BRT) mora em @/lib/day —
// FONTE ÚNICA compartilhada com catchup/guardian.
const GRACE_MIN = 75; // carência após o horário do cron antes de considerar "faltando"

// Idiomas com publicação automática ativa (crons ligados). PT no ar desde 2026-06-18.
const ACTIVE_LANGS = ["es", "br"];

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
  // CADÊNCIA 1 PEÇA/DIA (2026-08-23): Reel e Carrossel ficam ARMADOS no mesmo
  // horário, mas só UM é o formato do dia (isCarouselDay, fonte única em
  // @/lib/day). Varrer os 2 runs faria o watchdog achar "faltando" o run que foi
  // pulado DE PROPÓSITO por não ser o tipo de hoje — alarme falso permanente.
  const runsDeHoje = runsForDay(day);
  for (const lang of ACTIVE_LANGS) {
    const done = new Set(published[lang] ?? []);
    for (const run of runsDeHoje) {
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
  // Pares ÓRFÃOS: vaga em que uma língua publicou e a irmã DESISTIU (assimetria ES/PT
  // permanente). Vazio = saudável; se vier algo, o par quebrou — alarme antes do feed.
  const orphans = orphanedPairs(published, gaveUp, ACTIVE_LANGS);
  return NextResponse.json({ ok: true, day, nowMin, missing, gaveUp, published, duplicates, orphans });
}
