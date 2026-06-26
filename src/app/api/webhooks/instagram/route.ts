import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { ACCOUNTS, accountFor, type Lang, type AccountCfg } from "@/lib/accounts";
import { buildVoiceDirective } from "@/lib/voice";
import {
  decideComment,
  decideDm,
  detectKeyword,
  buildReplyPrompt,
  buildDmPrompt,
  buildDmReplyPrompt,
  buildAntiRepeatDirective,
  generateDistinctText,
  normalizeReply,
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
//   ENGAGEMENT_DM_ENABLED=on      → liga a auto-resposta a DMs do Direct (inbound)
// Com as flags OFF, o webhook valida e responde 200, mas NÃO gera nem publica nada.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EST_REPLY_COST = 0.01; // margem por interação (haiku curto) p/ o gate de orçamento

function flagOn(name: string): boolean {
  return (process.env[name] ?? "").toLowerCase() === "on";
}

// Lead magnet "I Love Dopamina" (prévia/adelanto do livro) — servido pelo próprio
// site em /lead/*.pdf. Default POR IDIOMA aponta pro PDF certo de cada conta; o dono
// pode trocar por env sem deploy. Sem URL → a DM só abre conversa (não inventa link).
const SITE_URL = "https://www.drlibertad.com";
const LEAD_DEFAULTS: Record<Lang, { name: string; url: string }> = {
  es: { name: "I Love Dopamina — adelanto del libro (Dr. Libertad)", url: `${SITE_URL}/lead/I-Love-Dopamina_Previa_ES.pdf` },
  pt: { name: "I Love Dopamina — prévia do livro (Dr. Liberdade)", url: `${SITE_URL}/lead/I-Love-Dopamina_Previa_PT.pdf` },
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

// ── Roteamento por conta: entry.id → idioma ────────────────────────────────────
// O entry.id do webhook do Instagram é o **user_id** da conta (formato 17841…),
// DIFERENTE do id de publicação em META_INSTAGRAM_ACCOUNT_ID (formato graph.instagram.com,
// ex. 27…). Por isso casamos pelos DOIS: o id de publicação (env) e o user_id resolvido
// do token (cacheado por instância). Sem isso, o webhook chega (200) mas não roteia.
const webhookIdCache = new Map<string, string>(); // accountIdEnv → user_id

async function resolveWebhookId(acc: AccountCfg): Promise<string | null> {
  const cacheKey = acc.accountIdEnv;
  const cached = webhookIdCache.get(cacheKey);
  if (cached) return cached;
  try {
    const token = await resolveToken(acc);
    if (!token) return null;
    const r = await fetch(
      `https://graph.instagram.com/v21.0/me?fields=user_id&access_token=${encodeURIComponent(token)}`,
    ).then((x) => x.json());
    const uid = r?.user_id ? String(r.user_id) : null;
    if (uid) webhookIdCache.set(cacheKey, uid);
    return uid;
  } catch {
    return null;
  }
}

async function accountForEntryId(entryId: string): Promise<{ lang: Lang; acc: AccountCfg } | null> {
  if (!entryId) return null;
  // 1) match direto pelo id de publicação (env)
  for (const lang of Object.keys(ACCOUNTS) as Lang[]) {
    const acc = ACCOUNTS[lang];
    if (process.env[acc.accountIdEnv] === entryId) return { lang, acc };
  }
  // 2) match pelo user_id (= entry.id real do webhook), resolvido do token
  for (const lang of Object.keys(ACCOUNTS) as Lang[]) {
    const acc = ACCOUNTS[lang];
    const uid = await resolveWebhookId(acc);
    if (uid && uid === entryId) return { lang, acc };
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
// Guarda DUAS coisas: (1) idempotência por `comment_id` (não responder 2x o MESMO
// comentário); (2) o TEXTO que enviamos (`reply_text`/`reply_norm`) + o post (`media_id`),
// para a trava anti-repetição — nunca enviar a MESMA resposta em comentários DISTINTOS
// do mesmo post/janela (bug do funil 25/06). Colunas novas via ADD COLUMN IF NOT EXISTS
// (migração idempotente, fail-open).
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
  await sql`ALTER TABLE engagement_events ADD COLUMN IF NOT EXISTS media_id   TEXT`;
  await sql`ALTER TABLE engagement_events ADD COLUMN IF NOT EXISTS reply_text TEXT`;
  await sql`ALTER TABLE engagement_events ADD COLUMN IF NOT EXISTS reply_norm TEXT`;
}

// Respostas que JÁ enviamos nesta janela (7d) p/ esta conta — base da trava anti-dup.
// Escopo: comentário → por POST (media_id); DM/funil (sem post) → por conta + ação.
// Fail-open: erro de banco devolve [] (não bloqueia o webhook, só perde a proteção).
async function recentReplyTexts(
  accountId: string,
  opts: { mediaId?: string | null; action?: string },
): Promise<string[]> {
  try {
    const { sql } = await import("@vercel/postgres");
    if (opts.mediaId) {
      const rows = await sql<{ reply_text: string }>`
        SELECT reply_text FROM engagement_events
        WHERE account_id = ${accountId} AND media_id = ${opts.mediaId}
          AND reply_text IS NOT NULL
          AND created_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC LIMIT 50
      `;
      return rows.rows.map((r) => r.reply_text).filter(Boolean);
    }
    const rows = await sql<{ reply_text: string }>`
      SELECT reply_text FROM engagement_events
      WHERE account_id = ${accountId} AND action = ${opts.action ?? ""}
        AND reply_text IS NOT NULL
        AND created_at > NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC LIMIT 50
    `;
    return rows.rows.map((r) => r.reply_text).filter(Boolean);
  } catch {
    return [];
  }
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

async function markProcessed(
  commentId: string,
  accountId: string,
  action: string,
  opts?: { mediaId?: string | null; replyText?: string | null },
): Promise<void> {
  try {
    const { sql } = await import("@vercel/postgres");
    const replyText = opts?.replyText ?? null;
    const replyNorm = replyText ? normalizeReply(replyText) : null;
    await sql`
      INSERT INTO engagement_events (comment_id, account_id, action, media_id, reply_text, reply_norm)
      VALUES (${commentId}, ${accountId}, ${action}, ${opts?.mediaId ?? null}, ${replyText}, ${replyNorm})
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

// DM direto a um usuário (Direct), pelo IGSID do remetente. Janela padrão de 24h.
async function postDirectMessage(accountId: string, recipientId: string, message: string, token: string): Promise<boolean> {
  const res = await fetch(`https://graph.instagram.com/v25.0/${accountId}/messages`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, message: { text: message }, access_token: token }),
  });
  if (!res.ok) console.error("[ig-webhook] DM reply falhou:", res.status);
  return res.ok;
}

// ── Processa UM DM inbound (best-effort; nunca lança p/ fora) ───────────────────
async function processDirectMessage(
  entryId: string,
  acc: AccountCfg,
  m: { mid?: string; text?: string; senderId?: string; isEcho?: boolean },
): Promise<void> {
  const mid = m?.mid;
  if (!mid) return;
  if (await alreadyProcessed(mid)) return;

  const decision = decideDm({
    messageId: mid,
    text: m?.text ?? "",
    senderId: m?.senderId ?? "",
    selfId: entryId,
    isEcho: m?.isEcho,
  });
  if (!decision.reply) {
    await markProcessed(mid, entryId, `skip:${decision.reason}`);
    return;
  }

  const budget = await checkBudget("ig-engagement", EST_REPLY_COST);
  if (!budget.ok) {
    await markProcessed(mid, entryId, "skip:budget");
    return;
  }

  const voice = buildVoiceDirective(acc);
  const ctx: PostContext = { langName: acc.langName, topic: null, title: null };
  const token = await resolveToken(acc);
  try {
    const recent = await recentReplyTexts(entryId, { action: "dm-replied" });
    const { text: reply } = await generateDistinctText(
      (avoid) => buildDmReplyPrompt(voice, m.text ?? "", ctx) + buildAntiRepeatDirective(avoid),
      recent,
    );
    if (reply && m.senderId) {
      await postDirectMessage(entryId, m.senderId, reply, token);
      await markProcessed(mid, entryId, "dm-replied", { replyText: reply });
    } else {
      await markProcessed(mid, entryId, "skip:empty-gen");
    }
  } catch (e) {
    console.error("[ig-webhook] geração/DM erro:", e);
    // sem marcar → a Meta re-tenta; idempotência (mid) impede dupla resposta
  }
}

// ── Processa UM comentário (best-effort; nunca lança p/ fora) ───────────────────
async function processComment(
  entryId: string,
  acc: AccountCfg,
  lang: Lang,
  c: { id?: string; text?: string; from?: { id?: string }; media?: { id?: string } },
): Promise<void> {
  const commentId = c?.id;
  if (!commentId) return;
  if (await alreadyProcessed(commentId)) return;
  const mediaId = c?.media?.id ?? null; // post onde veio o comentário (escopo da anti-dup)

  const decision = decideComment({
    commentId,
    text: c?.text ?? "",
    fromId: c?.from?.id ?? "",
    selfId: entryId,
  });
  if (!decision.reply) {
    await markProcessed(commentId, entryId, `skip:${decision.reason}`, { mediaId });
    return;
  }

  // Gate de orçamento (balde ig-engagement). Estoura → não gera (não falha o webhook).
  const budget = await checkBudget("ig-engagement", EST_REPLY_COST);
  if (!budget.ok) {
    await markProcessed(commentId, entryId, "skip:budget", { mediaId });
    return;
  }

  const voice = buildVoiceDirective(acc);
  const ctx: PostContext = { langName: acc.langName, topic: null, title: null };
  const token = await resolveToken(acc);

  // 1) Resposta pública ao comentário (Fase 1) — DISTINTA das já enviadas neste post.
  try {
    const recent = await recentReplyTexts(entryId, { mediaId });
    const { text: reply, duplicate } = await generateDistinctText(
      (avoid) => buildReplyPrompt(voice, c.text ?? "", ctx) + buildAntiRepeatDirective(avoid),
      recent,
    );
    if (duplicate) {
      // Não repete a MESMA resposta no feed: pula e registra (não fica re-tentando).
      await markProcessed(commentId, entryId, "skip:dup-reply", { mediaId });
    } else if (reply) {
      const replyId = await postReply(commentId, reply, token);
      await markProcessed(commentId, entryId, "replied", { mediaId, replyText: reply });
      // Grava a NOSSA resposta como já-processada → anti-loop se o webhook refizer.
      if (replyId) await markProcessed(replyId, entryId, "authored", { mediaId });
    } else {
      await markProcessed(commentId, entryId, "skip:empty-gen", { mediaId });
    }
  } catch (e) {
    console.error("[ig-webhook] geração/reply erro:", e);
    return; // sem marcar → a Meta re-tenta; idempotência impede dupla resposta
  }

  // 2) Funil comment→DM (Fase 2) — atrás de flag; só se a palavra-chave bater.
  // Diversifica o DM (anti-repeat directive) mas ENVIA mesmo se colidir: entregar o
  // lead importa mais e a DM é 1:1 (não fica visível lado a lado como no feed).
  if (flagOn("ENGAGEMENT_FUNNEL_ENABLED")) {
    const { keyword, lead } = funnelConfig(acc, lang);
    if (keyword && detectKeyword(c.text ?? "", keyword)) {
      try {
        const recentDm = await recentReplyTexts(entryId, { action: "funnel-dm" });
        const { text: dm } = await generateDistinctText(
          (avoid) => buildDmPrompt(voice, c.text ?? "", ctx, lead) + buildAntiRepeatDirective(avoid),
          recentDm,
        );
        if (dm) {
          const ok = await postPrivateReply(entryId, commentId, dm, token);
          if (ok) await markProcessed(`funnel:${commentId}`, entryId, "funnel-dm", { mediaId, replyText: dm });
        }
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

  let body: {
    object?: string;
    entry?: Array<{
      id?: string;
      changes?: Array<{ field?: string; value?: unknown }>;
      messaging?: Array<{
        sender?: { id?: string };
        recipient?: { id?: string };
        message?: { mid?: string; text?: string; is_echo?: boolean };
      }>;
    }>;
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    await ensureTable();
    for (const entry of body.entry ?? []) {
      const entryId = entry?.id ?? "";
      const route = await accountForEntryId(entryId);
      if (!route) continue; // evento de conta que não conhecemos → ignora
      for (const change of entry.changes ?? []) {
        if (change.field !== "comments") continue;
        const v = change.value as { id?: string; text?: string; from?: { id?: string }; media?: { id?: string } };
        await processComment(entryId, route.acc, route.lang, v);
      }
      // Auto-resposta a DMs do Direct (inbound) — atrás de flag própria.
      if (flagOn("ENGAGEMENT_DM_ENABLED")) {
        for (const ev of entry.messaging ?? []) {
          if (!ev?.message) continue;
          await processDirectMessage(entryId, route.acc, {
            mid: ev.message.mid,
            text: ev.message.text,
            senderId: ev.sender?.id,
            isEcho: ev.message.is_echo,
          });
        }
      }
    }
  } catch (e) {
    console.error("[ig-webhook] processamento erro:", e);
    // ainda assim 200: o evento já chegou; idempotência cobre o re-disparo
  }

  return NextResponse.json({ ok: true });
}
