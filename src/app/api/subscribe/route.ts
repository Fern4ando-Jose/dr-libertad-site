import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  let email = "";
  let lang = "pt";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    lang = body?.lang === "es" ? "es" : "pt";
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }

  try {
    const { sql } = await import("@vercel/postgres");
    await sql`
      CREATE TABLE IF NOT EXISTS subscribers (
        id              SERIAL PRIMARY KEY,
        email           TEXT NOT NULL UNIQUE,
        lang            TEXT NOT NULL DEFAULT 'pt',
        unsub_token     TEXT,
        unsubscribed_at TIMESTAMPTZ,
        last_sent_at    TIMESTAMPTZ,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    // Token de descadastro gerado na inscrição (cada e-mail leva o seu link).
    const token = crypto.randomUUID().replace(/-/g, "");
    await sql`
      INSERT INTO subscribers (email, lang, unsub_token)
      VALUES (${email}, ${lang}, ${token})
      ON CONFLICT (email) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[subscribe] erro:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
