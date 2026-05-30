import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { sql } = await import("@vercel/postgres");

  const results: string[] = [];

  // Adicionar coluna topic se não existir
  try {
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'geral'`;
    results.push("topic: ok");
  } catch (e) {
    results.push("topic: " + String(e));
  }

  // Adicionar coluna slot se não existir
  try {
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS slot TEXT NOT NULL DEFAULT 'manha'`;
    results.push("slot: ok");
  } catch (e) {
    results.push("slot: " + String(e));
  }

  // Verificar colunas atuais
  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'posts' ORDER BY ordinal_position
  `;

  return NextResponse.json({
    ok: true,
    results,
    columns: cols.rows.map((r: { column_name: string }) => r.column_name),
  });
}
