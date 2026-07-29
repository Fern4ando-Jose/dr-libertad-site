import { NextRequest, NextResponse } from "next/server";
import { DRIP_STEPS, sendDripEmail, type DripStep } from "@/lib/brevo-dopamina";
import { getDripCandidatesEs, markDripSent } from "@/lib/dopamina-leads";

export const runtime = "nodejs";
export const maxDuration = 60;

// ─── Gotejamento E1→E5 do funil "I Love Dopamina" — SÓ ES ────────────────────
// BR já roda a mesma sequência via automação nativa do painel Brevo (ligada 2026-07-17);
// aqui é só a parte ES, que não tem automação no painel. Cron diário (dopamina-drip.yml)
// bate aqui: para cada lead ES sem os 5 passos completos, calcula há quantos dias entrou
// e dispara (transacional) todo passo cujo prazo já venceu e ainda não foi enviado —
// idempotente por `dopamina_leads.drip_sent` (nunca reenvia o mesmo passo).

function authorized(req: NextRequest): boolean {
  const h = req.headers.get("authorization") || "";
  return !!process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`;
}

const MS_DIA = 24 * 60 * 60 * 1000;

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const candidates = await getDripCandidatesEs().catch((err) => {
    console.error("[dopamina-drip] falha ao buscar candidatos:", err);
    return null;
  });
  if (!candidates) {
    return NextResponse.json({ ok: false, error: "db_query_failed" }, { status: 500 });
  }

  const now = Date.now();
  let sent = 0;
  let gated = 0;
  let failed = 0;
  const details: { email: string; step: DripStep; result: string }[] = [];

  for (const lead of candidates) {
    const diasDesde = Math.floor((now - lead.createdAt.getTime()) / MS_DIA);
    for (const { step, days } of DRIP_STEPS) {
      if (diasDesde < days) continue; // passo ainda não venceu
      if (lead.dripSent.includes(step)) continue; // já enviado (idempotente)

      const result = await sendDripEmail({ email: lead.email, step });
      if (result.gated) {
        gated++;
        details.push({ email: lead.email, step, result: `gated:${result.reason}` });
        console.warn(`[dopamina-drip] ${step} NÃO enviado (gated:${result.reason}) para lead ES.`);
        continue; // sem template/chave — não marca como enviado, tenta de novo amanhã
      }
      if (!result.ok) {
        failed++;
        details.push({ email: lead.email, step, result: `fail:${result.error}` });
        console.error(`[dopamina-drip] ${step} FALHOU status=${result.status ?? "?"}: ${result.error}`);
        continue; // não marca — tenta de novo amanhã
      }
      await markDripSent(lead.email, "es", step);
      sent++;
      details.push({ email: lead.email, step, result: "sent" });
    }
  }

  return NextResponse.json({ ok: true, candidates: candidates.length, sent, gated, failed, details });
}
