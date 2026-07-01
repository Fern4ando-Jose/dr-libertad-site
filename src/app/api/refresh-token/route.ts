import { NextRequest, NextResponse } from "next/server";
import { ACCOUNTS, AccountCfg } from "@/lib/accounts";

/**
 * GET /api/refresh-token
 *
 * Renova o token de longa duração da Instagram (Instagram API with Instagram Login)
 * de TODAS as contas que têm `dbTokenKey` (ES e PT). Chame via cron mensal (antes
 * dos 60 dias expirarem).
 *
 * Fluxo correto para tokens "IGAF..." (graph.instagram.com):
 *   GET https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=...
 * Não usa app_id/app_secret (esse é o fluxo do Facebook Login, que não se aplica aqui).
 *
 * Requisito da Meta: o token precisa ter pelo menos 24h e ainda estar válido.
 *
 * Fluxo por conta:
 *  1. Lê o token atual do banco (tabela config, chave `dbTokenKey`) com fallback
 *     para a env var da conta (`tokenEnv`).
 *  2. Chama o endpoint de refresh do Instagram para obter um novo token de 60 dias.
 *  3. Salva o novo token no banco sob a mesma `dbTokenKey`.
 *
 * Na 1ª rodada do PT o DB ainda está vazio → usa a env `META_ACCESS_TOKEN_PT`,
 * renova e **semeia** o DB. A partir daí o DB é a fonte (sem intervenção manual).
 * O publish/publish-reel sempre leem o token do banco (com fallback env).
 *
 * Falhas são isoladas por conta (a renovação de uma NÃO desfaz a da outra), mas o
 * HTTP FALHA ALTO (500) se QUALQUER conta com dbTokenKey não renovar — assim uma
 * falha silenciosa do PT (ex.: token não-IG-Login) é acusada pelo cron/log, em vez
 * de mascarada pelo 200 do ES (A3, auditoria 30/06). No refresh mensal os tokens
 * sempre têm >24h, então isso não gera falso alarme.
 */

interface RefreshResult {
  lang: string;
  key: string;
  ok: boolean;
  expires_in_days?: number;
  error?: unknown;
}

async function refreshAccount(
  acc: AccountCfg,
  sql: typeof import("@vercel/postgres").sql
): Promise<RefreshResult> {
  const key = acc.dbTokenKey!;

  // 1. Token atual: DB → fallback env
  const rows = await sql`SELECT value FROM config WHERE key = ${key}`;
  const currentToken = rows.rows[0]?.value ?? process.env[acc.tokenEnv];

  if (!currentToken) {
    return { lang: acc.lang, key, ok: false, error: "Sem token no banco nem na env var" };
  }

  // 2. Renovar via fluxo do Instagram Login (ig_refresh_token)
  const refreshUrl =
    `https://graph.instagram.com/refresh_access_token` +
    `?grant_type=ig_refresh_token&access_token=${currentToken}`;

  const res = await fetch(refreshUrl);
  const data = await res.json();

  if (!res.ok || !data.access_token) {
    // Não ecoar o objeto cru da Meta (pode conter detalhes de token/conta) — só logar no servidor.
    console.error(`[refresh-token] falha ao renovar ${acc.lang}: status=${res.status}`);
    return { lang: acc.lang, key, ok: false, error: "falha ao renovar token" };
  }

  const newToken: string = data.access_token;
  const expiresIn: number = data.expires_in ?? 5183944; // ~60 dias

  // 3. Salvar novo token no banco (semeia o PT na 1ª vez)
  await sql`
    INSERT INTO config (key, value, updated_at)
    VALUES (${key}, ${newToken}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${newToken}, updated_at = NOW()
  `;

  return { lang: acc.lang, key, ok: true, expires_in_days: Math.round(expiresIn / 86400) };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { sql } = await import("@vercel/postgres");

  // Toda conta com refresh automático (dbTokenKey definido) é renovada.
  const accounts = Object.values(ACCOUNTS).filter((a) => a.dbTokenKey);

  const results: RefreshResult[] = [];
  for (const acc of accounts) {
    try {
      results.push(await refreshAccount(acc, sql));
    } catch (error) {
      console.error(`[refresh-token] erro inesperado ${acc.lang}:`, error);
      results.push({ lang: acc.lang, key: acc.dbTokenKey!, ok: false, error: "erro ao renovar token" });
    }
  }

  // A3 (auditoria 30/06): FALHAR ALTO por conta. Antes o 500 só vinha se NENHUMA conta
  // renovava (anyOk) → o PT podia falhar em SILÊNCIO (ex.: token não é IG-Login →
  // ig_refresh_token falha) enquanto o ES renovava e mascarava com 200 → token PT
  // expira e a conta PT para de publicar sem alarme. Agora QUALQUER conta com
  // dbTokenKey que não renovar derruba o HTTP p/ 500 (o cron/log acusa). No refresh
  // mensal os tokens sempre têm >24h, então isso não gera falso alarme. As renovações
  // que DERAM certo já foram gravadas (o 500 é só o alarme, não desfaz o que renovou).
  const anyOk = results.some((r) => r.ok);
  const allOk = results.length > 0 && results.every((r) => r.ok);
  const failed = results.filter((r) => !r.ok).map((r) => r.lang);
  return NextResponse.json(
    {
      ok: allOk,
      anyOk,
      allOk,
      message: allOk ? "Refresh concluído (todas as contas)" : `Conta(s) que NÃO renovaram: ${failed.join(", ") || "nenhuma"}`,
      results,
      updated_at: new Date().toISOString(),
    },
    { status: allOk ? 200 : 500 }
  );
}
