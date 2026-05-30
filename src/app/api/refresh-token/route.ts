import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/refresh-token
 *
 * Renova o token de longa duração da Meta Instagram automaticamente.
 * Chame este endpoint via cron mensal (antes dos 60 dias expirarem).
 *
 * Fluxo:
 *  1. Lê o token atual do banco (tabela config)
 *  2. Chama a API da Meta para trocar por um novo token de 60 dias
 *  3. Salva o novo token no banco
 *
 * O publish/route.ts sempre lê o token do banco — sem intervenção manual.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { sql } = await import("@vercel/postgres");

  // 1. Ler token atual do banco
  const rows = await sql`SELECT value FROM config WHERE key = 'meta_access_token'`;
  const currentToken = rows.rows[0]?.value ?? process.env.META_ACCESS_TOKEN;

  if (!currentToken) {
    return NextResponse.json({ ok: false, error: "Nenhum token encontrado no banco nem no env var" }, { status: 500 });
  }

  // 2. Chamar API Meta para renovar
  const appId = process.env.META_APP_ID!;
  const appSecret = process.env.META_APP_SECRET!;

  const refreshUrl = `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;

  const res = await fetch(refreshUrl);
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    return NextResponse.json({ ok: false, error: data }, { status: 500 });
  }

  const newToken: string = data.access_token;
  const expiresIn: number = data.expires_in ?? 5183944; // ~60 dias

  // 3. Salvar novo token no banco
  await sql`
    INSERT INTO config (key, value, updated_at)
    VALUES ('meta_access_token', ${newToken}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${newToken}, updated_at = NOW()
  `;

  return NextResponse.json({
    ok: true,
    message: "Token renovado com sucesso",
    expires_in_days: Math.round(expiresIn / 86400),
    updated_at: new Date().toISOString(),
  });
}
