import { NextRequest, NextResponse } from "next/server";
import { getInsights } from "@/lib/insights";
import { getLang } from "@/lib/accounts";

// Métricas dos posts em JSON. Protegido pelo mesmo CRON_SECRET dos outros
// endpoints (via header Authorization: Bearer ... ou ?key=...), pois consome
// quota da Graph API e expõe números de desempenho do perfil.
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  const key = req.nextUrl.searchParams.get("key");
  const authorized = Boolean(secret) && (auth === `Bearer ${secret}` || key === secret);
  if (!authorized) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const lang = getLang(req.nextUrl.searchParams.get("lang")); // "es" (default) | "pt"
  const data = await getInsights(lang);
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
