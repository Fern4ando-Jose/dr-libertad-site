import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "subscribe", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
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
    // (tabela `subscribers` criada em /api/migrate — sem DDL por request; auditoria 29/06)
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
