import { NextRequest, NextResponse } from "next/server";
import { accountFor } from "@/lib/accounts";
import { buildEssayPrompt, renderEmail, newsletterFrom } from "@/lib/newsletter";
import { checkBudget, logSpend, anthropicCost } from "@/lib/spend";

export const runtime = "nodejs";
export const maxDuration = 60;

const SITE = "https://www.drlibertad.com";
const MODEL = "claude-haiku-4-5-20251001";

function authorized(req: NextRequest): boolean {
  const h = req.headers.get("authorization") || "";
  return !!process.env.CRON_SECRET && h === `Bearer ${process.env.CRON_SECRET}`;
}

// Gera o ensaio na voz da marca (Anthropic). Retorna {subject, paragraphs}.
async function generateEssay(
  acc: ReturnType<typeof accountFor>,
  recentTopics: string[]
): Promise<{ subject: string; paragraphs: string[]; usage?: { input_tokens?: number; output_tokens?: number } }> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: "user", content: buildEssayPrompt(acc, recentTopics) }],
    }),
  });
  const data = await res.json();
  const raw = (data?.content?.[0]?.text ?? "").trim();
  const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const parsed = JSON.parse(json);
  const paragraphs = Array.isArray(parsed?.paragraphs)
    ? parsed.paragraphs.map((p: unknown) => String(p)).filter(Boolean)
    : [];
  const subject = String(parsed?.subject ?? "").trim();
  if (!subject || paragraphs.length === 0) throw new Error("essay_empty");
  return { subject, paragraphs, usage: data?.usage };
}

// Envia em lotes de até 100 via Resend (/emails/batch).
async function resendBatch(
  emails: { from: string; to: string; subject: string; html: string; text: string }[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < emails.length; i += 100) {
    const chunk = emails.slice(i, i + 100);
    const r = await fetch("https://api.resend.com/emails/batch", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify(chunk),
    });
    if (r.ok) sent += chunk.length;
    else {
      failed += chunk.length;
      console.error("[newsletter] resend batch falhou:", r.status, await r.text().catch(() => ""));
    }
  }
  return { sent, failed };
}

export async function POST(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const lang = url.searchParams.get("lang") === "pt" ? "pt" : "es";
  const dry = url.searchParams.get("dry") === "1";
  const acc = accountFor(lang);

  // Gate de orçamento (balde newsletter; ~US$0,01–0,02/semana — só o ensaio haiku).
  const gate = await checkBudget("newsletter", 0.02);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, error: "budget", spent: gate.spent, budget: gate.budget },
      { status: 402 }
    );
  }

  const { sql } = await import("@vercel/postgres");

  // Defensivo (fail-open): garante as colunas mesmo sem /api/migrate.
  try {
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsub_token TEXT`;
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ`;
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ`;
    await sql`UPDATE subscribers SET unsub_token = md5(random()::text || id::text || clock_timestamp()::text) WHERE unsub_token IS NULL`;
  } catch (e) {
    console.error("[newsletter] preparo de colunas:", e);
  }

  // Inscritos ativos do idioma + curadoria/temas da semana (últimos 7 dias).
  const subs = await sql<{ email: string; unsub_token: string }>`
    SELECT email, unsub_token FROM subscribers
    WHERE lang = ${lang} AND unsubscribed_at IS NULL
  `;
  const recent = await sql<{ title: string; topic: string }>`
    SELECT title, topic FROM posts
    WHERE lang = ${lang} AND published_at >= NOW() - INTERVAL '7 days'
    ORDER BY published_at DESC LIMIT 20
  `;
  // Deduplica títulos (o mesmo tema pode ter sido republicado/duplicado em `posts`)
  // e limita a 4 — a curadoria é um aperitivo, não a lista inteira.
  const curadoria: { title: string }[] = [];
  const seenTitles = new Set<string>();
  for (const r of recent.rows) {
    const t = (r.title ?? "").trim();
    if (!t || seenTitles.has(t)) continue;
    seenTitles.add(t);
    curadoria.push({ title: t });
    if (curadoria.length >= 4) break;
  }
  const recentTopics = [...new Set(recent.rows.map((r) => r.topic).filter(Boolean))];

  // Ensaio (Anthropic) — gera mesmo no dry-run, p/ a prévia ser real.
  let essay: { subject: string; paragraphs: string[]; usage?: { input_tokens?: number; output_tokens?: number } };
  try {
    essay = await generateEssay(acc, recentTopics);
  } catch (e) {
    console.error("[newsletter] geração do ensaio falhou:", e);
    return NextResponse.json({ ok: false, error: "essay_failed" }, { status: 502 });
  }
  await logSpend({
    automation: "newsletter",
    platform: "anthropic",
    operation: "essay",
    model: MODEL,
    units: (essay.usage?.input_tokens ?? 0) + (essay.usage?.output_tokens ?? 0),
    costUsd: anthropicCost(MODEL, essay.usage),
    meta: { lang, recipients: subs.rowCount },
  });

  const renderFor = (token: string) =>
    renderEmail({
      lang,
      brand: acc.brand,
      handle: acc.handle,
      instagramUrl: `https://instagram.com/${acc.handle.replace(/^@/, "")}`,
      subject: essay.subject,
      essayParas: essay.paragraphs,
      curadoria,
      unsubUrl: `${SITE}/api/unsubscribe?token=${token}`,
      siteUrl: `${SITE}/${lang}`,
    });

  // DRY-RUN: devolve a prévia (sem enviar nada). Sempre disponível.
  if (dry) {
    const sample = renderFor("SAMPLE_TOKEN");
    return NextResponse.json({
      ok: true,
      dry: true,
      lang,
      recipients: subs.rowCount,
      subject: sample.subject,
      curadoria: curadoria.map((c) => c.title),
      html: sample.html,
    });
  }

  // ENVIO REAL — duplamente travado: flag-mestra + chave do Resend.
  if (process.env.NEWSLETTER_ENABLED !== "1") {
    return NextResponse.json({ ok: true, skipped: "disabled", recipients: subs.rowCount });
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ ok: true, skipped: "no_resend_key", recipients: subs.rowCount });
  }
  if (subs.rowCount === 0) {
    return NextResponse.json({ ok: true, sent: 0, note: "no_active_subscribers" });
  }

  const from = newsletterFrom(acc);
  const emails = subs.rows.map((s) => {
    const m = renderFor(s.unsub_token);
    return { from, to: s.email, subject: m.subject, html: m.html, text: m.text };
  });
  const { sent, failed } = await resendBatch(emails);

  if (sent > 0) {
    try {
      // E-mail não contém vírgula → CSV é seguro como parâmetro único (o driver não
      // aceita array). string_to_array reconstrói a lista no Postgres.
      const csv = subs.rows.slice(0, sent).map((s) => s.email).join(",");
      await sql`UPDATE subscribers SET last_sent_at = NOW() WHERE email = ANY(string_to_array(${csv}, ','))`;
    } catch (e) {
      console.error("[newsletter] marca last_sent_at:", e);
    }
  }

  return NextResponse.json({ ok: true, lang, subject: essay.subject, sent, failed });
}
