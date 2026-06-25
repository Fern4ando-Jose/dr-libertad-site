import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ACCOUNTS, accountFor, type Lang, type AccountCfg } from "@/lib/accounts";
import { buildVoiceDirective } from "@/lib/voice";
import {
  decideComment,
  detectKeyword,
  buildReplyPrompt,
  buildDmPrompt,
  generateText,
  type PostContext,
} from "@/lib/engagement";
import { checkBudget } from "@/lib/spend";

// Webhook do Instagram para ENGAJAMENTO (comentários nos NOSSOS posts + funil
// comment→DM). Precisa de Node runtime: lê o corpo CRU (assinatura) e usa node:crypto.
//
//   GET  /api/ig-webhook   → verificação do webhook (hub.challenge)
//   POST /api/ig-webhook   → eventos (field "comments"); valida X-Hub-Signature-256
//
// SEGURANÇA: valida HMAC com META_APP_SECRET (rejeita corpo forjado). NUNCA loga token.
// Sempre devolve 200 rápido após validar (webhook que demora/erra é re-tentado pela Meta).
//
// FLAGS (merge seguro — nascem DESLIGADAS até o App Review aprovar + secrets setados):
//   ENGAGEMENT_ENABLED=on         → liga a auto-resposta a comentários (Fase 1)
//   ENGAGEMENT_FUNNEL_ENABLED=on  → liga o DM do funil comment→DM (Fase 2 / lead magnet)
// Com as flags OFF, o webhook valida e responde 200, mas NÃO gera nem publica nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EST_REPLY_COST = 0.01; // margem por interação (haiku curto) p/ o gate de orçamento

function flagOn(name: string): boolean {
  return (process.env[name] ?? "").toLowerCase() === "on";
}

// Lead magnet "El Reinicio / O Reinício" (guia dopamina/detox) — servido pelo próprio
// site em /lead/*.pdf. Default POR IDIOMA aponta pro PDF certo de cada conta; o dono
// pode trocar por env sem deploy. Sem URL → a DM só abre conversa (não inventa link).
const SITE_URL = "https://www.drlibertad.com";
const LEAD_DEFAULTS: Record<Lang, { name: string; url: string }> = {
  es: { name: "El Reinicio — 7 días para recuperar tu atención del algoritmo", url: `${SITE_URL}/lead/El-Reinicio_DrLibertad_ES.pdf` },
  pt: { name: "O Reinício — 7 dias para retomar sua atenção do algoritmo", url: `${SITE_URL}/lead/O-Reinicio_DrLiberdade_PT.pdf` },
};

// Palavra-chave do funil e lead magnet (configuráveis por env — sem deploy p/ trocar).
// Palavra-chave é POR IDIOMA: default = a palavra de marca da conta (ES "libertad" →
// "LIBERTAD"; PT "liberdade" → "LIBERDADE"), que é a decisão do dono no painel.
// Override por env: ENGAGEMENT_FUNNEL_KEYWORD_ES / _PT, ou o global ENGAGEMENT_FUNNEL_KEYWORD.
// Lead idem: ENGAGEMENT_LEAD_NAME_ES/_PT + _URL_ES/_PT (ou os globais), senão o default acima.
function funnelConfig(acc: AccountCfg, lang: Lang) {
  const U = lang.toUpperCase();
  const keyword =
    process.env[`ENGAGEMENT_FUNNEL_KEYWORD_${U}`] ||
    process.env.ENGAGEMENT_FUNNEL_KEYWORD ||
    acc.freedom;
  const name = process.env[`ENGAGEMENT_LEAD_NAME_${U}`] || process.env.ENGAGEMENT_LEAD_NAME || LEAD_DEFAULTS[lang].name;
  const url = process.env[`ENGAGEMENT_LEAD_URL_${U}`] || process.env.ENGAGEMENT_LEAD_URL || LEAD_DEFAULTS[lang].url;
  return {
    keyword,
    lead: name ? { name, url: url || null } : null,
  };
}

// ── Verificação do webhook (GET) ───────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// ── Assinatura (HMAC SHA-256 com o App Secret) ─────────────────────────────────
function validSignature(raw: string, header: string | null): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !header) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw, "utf8").digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

// ── Roteamento por conta: entry.id (IG account id) → idioma ────────────────────
function accountForEntryId(entryId: string): { lang: Lang; acc: AccountCfg } | null {
  for (const lang of Object.keys(ACCOUNTS) as Lang[]) {
    const acc = ACCOUNTS[lang];
    if (entryId && process.env[acc.accountIdEnv] === entryId) return { lang, acc };
  }
  return null;
}

// Token da conta: DB (refresh automático, só quem tem dbTokenKey) → env. Espelha o
// getAccessToken privado do publish/route.ts (não importável; lógica idêntica).
async function resolveToken(acc: AccountCfg): Promise<string> {
  if (acc.dbTokenKey) {
    try {
      const { sql } = await import("@vercel/postgres");
      const rows = await sql<{ value: string }>`SELECT value FROM config WHERE key = ${acc.dbTokenKey}`;
      if (rows.rows[0]?.value) return rows.rows[0].value;
    } catch { /* fallback p/ env */ }
  }
  return process.env[acc.tokenEnv] ?? "";
}

// ── Dedup / idempotência (tabela engagement_events) ────────────────────────────
async function ensureTable(): Promise<void> {
  const { sql } = await import("@vercel/postgres");
  await sql`
    CREATE TABLE IF NOT EXISTS engagement_events (
      comment_id  TEXT PRIMARY KEY,
      account_id  TEXT,
      action      TEXT,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

// true se já agimos sobre este comentário (idempotência + anti-loop definitivo:
// nossas PRÓPRIAS respostas são gravadas como processadas → se a Meta refizer o
// webhook delas, caem aqui e não viram nova resposta).
async function alreadyProcessed(commentId: string): Promise<boolean> {
  try {
    const { sql } = await import("@vercel/postgres");
    const rows = await sql`SELECT 1 FROM engagement_events WHERE comment_id = ${commentId} LIMIT 1`;
    return rows.rows.length > 0;
  } catch {
    return false; // fail-open: erro de banco não trava o webhook
  }
}

async function markProcessed(commentId: string, accountId: string, action: string): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      INSERT INTO engagement_events (comment_id, account_id, action)
      VALUES (${commentId}, ${accountId}, ${action})
      ON CONFLICT (comment_id) DO NOTHING
    `;
  } catch { /* best-effort */ }
}

// ── Graph API: responder comentário / DM privado (private reply) ───────────────
async function postReply(commentId: string, message: string, token: string): Promise<string | null> {
  const res = await fetch(`https://graph.instagram.com/v25.0/${commentId}/replies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, access_token: token }),
  });
  if (!res.ok) {
    console.error("[ig-webhook] reply falhou:", res.status);
    return null;
  }
  const data = await res.json().catch(() => ({}));
  return typeof data?.id === "string" ? data.id : null;
}

// Private reply: 1 DM em resposta a um comentário (mecanismo oficial; recipient pelo
// comment_id). Não depende da janela de 24h.
async function postPrivateReply(accountId: string, commentId: string, message: string, token: string): Promise<boolean> {
  const res = await fetch(`https://graph.instagram.com/v25.0/${accountId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: message }, access_token: token }),
  });
  if (!res.ok) console.error("[ig-webhook] private reply falhou:", res.status);
  return res.ok;
}

// ── Processa UM comentário (best-effort; nunca lança p/ fora) ───────────────────
async function processComment(
  entryId: string,
  acc: AccountCfg,
  lang: Lang,
  c: { id?: string; text?: string; from?: { id?: string } },
): Promise<void> {
  const commentId = c?.id;
  if (!commentId) return;
  if (await alreadyProcessed(commentId)) return;

  const decision = decideComment({
    commentId,
    text: c?.text ?? "",
    fromId: c?.from?.id ?? "",
    selfId: entryId,
  });
  if (!decision.reply) {
    await markProcessed(commentId, entryId, `skip:${decision.reason}`);
    return;
  }

  // Gate de orçamento (balde ig-engagement). Estoura → não gera (não falha o webhook).
  const budget = await checkBudget("ig-engagement", EST_REPLY_COST);
  if (!budget.ok) {
    await markProcessed(commentId, entryId, "skip:budget");
    return;
  }

  const voice = buildVoiceDirective(acc);
  const ctx: PostContext = { langName: acc.langName, topic: null, title: null };
  const token = await resolveToken(acc);

  // 1) Resposta pública ao comentário (Fase 1).
  try {
    const reply = await generateText(buildReplyPrompt(voice, c.text ?? "", ctx));
    if (reply) {
      const replyId = await postReply(commentId, reply, token);
      await markProcessed(commentId, entryId, "replied");
      // Grava a NOSSA resposta como já-processada → anti-loop se o webhook refizer.
      if (replyId) await markProcessed(replyId, entryId, "authored");
    } else {
      await markProcessed(commentId, entryId, "skip:empty-gen");
    }
  } catch (e) {
    console.error("[ig-webhook] geração/reply erro:", e);
    return; // sem marcar → a Meta re-tenta; idempotência impede dupla resposta
  }

  // 2) Funil comment→DM (Fase 2) — atrás de flag; só se a palavra-chave bater.
  if (flagOn("ENGAGEMENT_FUNNEL_ENABLED")) {
    const { keyword, lead } = funnelConfig(acc, lang);
    if (keyword && detectKeyword(c.text ?? "", keyword)) {
      try {
        const dm = await generateText(buildDmPrompt(voice, c.text ?? "", ctx, lead));
        if (dm) await postPrivateReply(entryId, commentId, dm, token);
      } catch (e) {
        console.error("[ig-webhook] funil DM erro:", e);
      }
    }
  }
}

// ── Recebimento (POST) ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validSignature(raw, req.headers.get("x-hub-signature-256"))) {
    return new NextResponse("invalid signature", { status: 401 });
  }

  // Flag-mestra OFF → valida e confirma 200, mas não processa (merge seguro).
  if (!flagOn("ENGAGEMENT_ENABLED")) {
    return NextResponse.json({ ok: true, skipped: "disabled" });
  }

  let body: { object?: string; entry?: Array<{ id?: string; changes?: Array<{ field?: string; value?: unknown }> }> };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    await ensureTable();
    for (const entry of body.entry ?? []) {
      const entryId = entry?.id ?? "";
      const route = accountForEntryId(entryId);
      if (!route) continue; // evento de conta que não conhecemos → ignora
      for (const change of entry.changes ?? []) {
        if (change.field !== "comments") continue;
        const v = change.value as { id?: string; text?: string; from?: { id?: string } };
        await processComment(entryId, route.acc, route.lang, v);
      }
    }
  } catch (e) {
    console.error("[ig-webhook] processamento erro:", e);
    // ainda assim 200: o evento já chegou; idempotência cobre o re-disparo
  }

  return NextResponse.json({ ok: true });
}
