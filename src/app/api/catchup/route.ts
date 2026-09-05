import { NextRequest, NextResponse } from "next/server";
import { dayBRT, publishedRunsToday, attemptsToday, shouldStopRetrying } from "@/lib/run-ledger";
import { minOfDayBRT, RUN_HOUR_BRT, runsForDay } from "@/lib/day";
import { workflowFor } from "@/lib/workflows";

// ─── Catch-up acionável DE FORA (agendador externo) ──────────────────────────
// Espelha o catchup.yml, mas como ENDPOINT — pra um cron EXTERNO (ex.: cron-job.org)
// dispará-lo de forma confiável, independente do cron do GitHub (que atrasa/derruba
// até o próprio catchup.yml). Consulta o que JÁ publicou (published_runs), descobre
// os runs do dia que venceram e ainda NÃO saíram, e REDISPARA os workflows certos via
// a REST API do GitHub. Idempotente: a trava (carrossel 7d) / livro-razão (reel)
// deduplicam, então um cron real atrasado que chegue depois não duplica.
//
// Segurança: Bearer CRON_SECRET (igual aos outros). Dispara via GH_DISPATCH_TOKEN
// (PAT fine-grained com Actions: read+write no repo) — guardado na Vercel, NÃO no
// serviço de cron externo. Sem o token → 500 avisando (inerte até o dono configurar).

// Hora BRT de cada run (cron UTC convertido). BRT p/ casar com dayBRT (run 2 = 21h BRT).
// RUN_HOUR_BRT (run→hora BRT) mora em @/lib/day — FONTE ÚNICA compartilhada com guardian/runs-status.
const GRACE_MIN = 75;
const ACTIVE_LANGS = ["es", "br"];
const REPO = process.env.GH_REPO || "Fern4ando-Jose/dr-libertad-site";

// run → (workflow, inputs) mora em @/lib/workflows — FONTE ÚNICA, conferida contra o
// DISCO por workflows.invariants.test.ts. Este mapa já viveu COPIADO aqui, montando
// `${base}-pt.yml` — nome que a fusão ES+PT de 2026-07-14 apagou: toda recuperação de
// vaga em português voltou vazia por 13 dias. Não recopiar; importar.

export async function GET(req: NextRequest) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const token = process.env.GH_DISPATCH_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GH_DISPATCH_TOKEN ausente — configure o PAT na Vercel (ver docs/AGENDADOR-EXTERNO.md)" }, { status: 500 });
  }

  const now = new Date();
  const day = dayBRT(now);
  const nowMin = minOfDayBRT(now);
  const published = await publishedRunsToday(day);

  const dispatched: { lang: string; run: number; file: string }[] = [];
  const failed: { lang: string; run: number; file: string; status: number; body: string }[] = [];
  // DISJUNTOR: vagas que já falharam demais hoje — não redisparamos (anti-martelo).
  const gaveUp: { lang: string; run: number; attempts: number }[] = [];

  for (const lang of ACTIVE_LANGS) {
    const done = new Set(published[lang] ?? []);
    for (const run of runsForDay(day)) {
      const dueMin = RUN_HOUR_BRT[run] * 60 + GRACE_MIN;
      if (nowMin < dueMin || done.has(run)) continue;
      // Disjuntor: se a vaga já falhou MAX vezes hoje, PARA de redisparar (até amanhã).
      // Foi a falta disso que martelou a conta PT até o Instagram bloquear.
      const attempts = await attemptsToday(day, run, lang);
      if (shouldStopRetrying(attempts)) { gaveUp.push({ lang, run, attempts }); continue; }
      const wf = workflowFor(run, lang);
      if (!wf) continue;
      try {
        const res = await fetch(`https://api.github.com/repos/${REPO}/actions/workflows/${wf.file}/dispatches`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "drlibertad-catchup",
            "X-GitHub-Api-Version": "2022-11-28",
          },
          body: JSON.stringify({ ref: "main", inputs: wf.inputs }),
        });
        if (res.ok) dispatched.push({ lang, run, file: wf.file });
        else failed.push({ lang, run, file: wf.file, status: res.status, body: (await res.text()).slice(0, 200) });
      } catch (e) {
        failed.push({ lang, run, file: wf.file, status: 0, body: e instanceof Error ? e.message : String(e) });
      }
    }
  }

  // O agendador externo só olha o HTTP 200 — uma falha aqui morria calada dentro do
  // JSON (foi assim que 13 dias de 404 em português passaram sem ninguém ver). Agora
  // grita no log da Vercel, que é onde se procura quando uma vaga não sai.
  if (failed.length) {
    console.error(`[catchup] ${failed.length} redisparo(s) falharam: ` +
      failed.map((f) => `${f.lang}#${f.run} ${f.file} HTTP ${f.status}`).join(" · "));
  }

  return NextResponse.json({ ok: true, day, nowMin, published, dispatched, failed, gaveUp });
}
