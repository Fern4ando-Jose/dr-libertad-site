import { NextRequest, NextResponse } from "next/server";

// Lista as capas REPROVADAS pelo juiz de visão, p/ o dono revisar se o QA está
// reprovando com razão (pedido 2026-07-06). Somente leitura — não gera/gasta nada.
//
//   GET /api/reprovadas        → últimas 120 reprovações
//   GET /api/reprovadas?day=…  → só de um dia (YYYY-MM-DD)
//
// Auth: Bearer ADMIN_TOKEN (painel web) OU Bearer CRON_SECRET (para o agente rodar o
// download `baixar-reprovadas.mjs` a partir do cofre, sem exigir um token novo do dono
// — §1.16). Endpoint só de LEITURA (lista de imagens+motivos, nada sensível); aceitar
// o CRON_SECRET aqui não amplia risco (quem o tem já pode disparar publish).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const admin = process.env.ADMIN_TOKEN;
  const cron = process.env.CRON_SECRET;
  return (!!admin && auth === `Bearer ${admin}`) || (!!cron && auth === `Bearer ${cron}`);
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const day = req.nextUrl.searchParams.get("day");
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = day
      ? await sql`
          SELECT id, day, topic, subject, cat, lang, model, score, reason, url, created_at
          FROM rejected_covers WHERE day = ${day}
          ORDER BY created_at DESC LIMIT 200`
      : await sql`
          SELECT id, day, topic, subject, cat, lang, model, score, reason, url, created_at
          FROM rejected_covers
          ORDER BY created_at DESC LIMIT 120`;
    return NextResponse.json({ ok: true, count: rows.rows.length, rejected: rows.rows });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
