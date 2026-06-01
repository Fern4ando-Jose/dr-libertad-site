import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { sql } = await import("@vercel/postgres");
  const results: string[] = [];

  // Tabela posts — colunas que podem faltar
  const postsCols = [
    { name: "topic", def: "TEXT NOT NULL DEFAULT 'geral'" },
    { name: "slot", def: "TEXT NOT NULL DEFAULT 'manha'" },
    { name: "body", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "instagram_caption", def: "TEXT NOT NULL DEFAULT ''" },
    { name: "tags", def: "JSONB NOT NULL DEFAULT '[]'" },
    { name: "instagram_post_id", def: "TEXT" },
  ];

  for (const col of postsCols) {
    try {
      await sql.query(
        `ALTER TABLE posts ADD COLUMN IF NOT EXISTS ${col.name} ${col.def}`
      );
      results.push(`posts.${col.name}: ok`);
    } catch (e) {
      results.push(`posts.${col.name}: ${String(e)}`);
    }
  }

  // Tabela config — guarda token e outras configs dinâmicas
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS config (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    results.push("config table: ok");
  } catch (e) {
    results.push("config table: " + String(e));
  }

  // Seed: insere o token atual do env var se a linha ainda não existe
  try {
    const token = process.env.META_ACCESS_TOKEN;
    if (token) {
      await sql`
        INSERT INTO config (key, value, updated_at)
        VALUES ('meta_access_token', ${token}, NOW())
        ON CONFLICT (key) DO UPDATE SET value = ${token}, updated_at = NOW()
      `;
      results.push("config seed token: ok");
    } else {
      results.push("config seed token: META_ACCESS_TOKEN env var nao definida");
    }
  } catch (e) {
    results.push("config seed token: " + String(e));
  }

  const cols = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'posts' ORDER BY ordinal_position
  `;

  return NextResponse.json({
    ok: true,
    results,
    posts_columns: cols.rows.map((r) => r.column_name),
  });
}
