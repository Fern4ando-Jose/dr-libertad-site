import { NextRequest, NextResponse } from "next/server";
import { snapshotInsights } from "@/lib/insights";

// Rotina de medição de ATENÇÃO (passo 5 do estrategista-de-atencao). Snapshota os
// sinais de atenção reais (alcance · sends · salvamentos · watch time) das 2 contas
// em série temporal (tabela post_metric_snapshots) e devolve o resumo por formato.
// A rotina só COLETA e REPORTA — o ajuste do playbook é decisão humana (§1.10/§1.18).
//
// Aceita QUALQUER UM dos dois segredos (não "INSIGHTS_TOKEN ofusca CRON_SECRET"): o
// CRON_SECRET é o do cron diário (attention-metrics.yml, header Authorization: Bearer);
// o INSIGHTS_TOKEN read-only serve p/ checagem manual (?key=). Em prod o INSIGHTS_TOKEN
// existe → se ele OFUSCASSE o CRON_SECRET (padrão do /insights, que é dashboard, não
// cron), o PRÓPRIO cron tomaria 401. Consome quota da Graph API e expõe desempenho.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const matches = (s?: string) => Boolean(s) && (auth === `Bearer ${s}` || key === s);
  const authorized = matches(process.env.CRON_SECRET) || matches(process.env.INSIGHTS_TOKEN);
  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const data = await snapshotInsights();
    return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
