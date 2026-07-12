import { NextRequest, NextResponse } from "next/server";
import { snapshotInsights } from "@/lib/insights";

// Rotina de medição de ATENÇÃO (passo 5 do estrategista-de-atencao). Snapshota os
// sinais de atenção reais (alcance · sends · salvamentos · watch time) das 2 contas
// em série temporal (tabela post_metric_snapshots) e devolve o resumo por formato.
// A rotina só COLETA e REPORTA — o ajuste do playbook é decisão humana (§1.10/§1.18).
//
// Protegido pelo mesmo segredo do /insights (INSIGHTS_TOKEN read-only, ou CRON_SECRET):
// consome quota da Graph API e expõe desempenho do perfil. Chamado pelo cron diário
// (attention-metrics.yml) via header Authorization: Bearer, ou manual com ?key=.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.INSIGHTS_TOKEN || process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const authorized = Boolean(secret) && (auth === `Bearer ${secret}` || key === secret);
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
