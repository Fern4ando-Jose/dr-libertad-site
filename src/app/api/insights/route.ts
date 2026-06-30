import { NextRequest, NextResponse } from "next/server";
import { getInsights } from "@/lib/insights";

// Métricas dos posts em JSON. Protegido pelo mesmo CRON_SECRET dos outros
// endpoints (via header Authorization: Bearer ... ou ?key=...), pois consome
// quota da Graph API e expõe números de desempenho do perfil.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Token READ-ONLY do dashboard: se INSIGHTS_TOKEN estiver setado, é ELE que vale (o
  // CRON_SECRET mestre deixa de funcionar aqui → vazar a URL do /insights não compromete
  // a automação). Sem INSIGHTS_TOKEN, cai no CRON_SECRET (retrocompatível). Auditoria 29/06.
  const secret = process.env.INSIGHTS_TOKEN || process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const authorized = Boolean(secret) && (auth === `Bearer ${secret}` || key === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const data = await getInsights();
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
