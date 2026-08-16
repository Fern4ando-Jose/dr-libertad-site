import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Contagem da lista de espera de um livro — a "prova social" do herói da página
// (C2 da auditoria de marketing 16/08). Só leitura, custo zero; a página decide
// exibir (esconde abaixo do limiar). Idempotência: conta as linhas únicas de
// (email, book_slug), que o POST já garante.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = String(searchParams.get("slug") ?? "").trim().slice(0, 80);
  if (!slug) {
    return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  }
  try {
    const { sql } = await import("@vercel/postgres");
    const { rows } = await sql`
      SELECT COUNT(*)::int AS n
      FROM waitlist
      WHERE book_slug = ${slug}
    `;
    return NextResponse.json({ ok: true, slug, count: rows?.[0]?.n ?? 0 });
  } catch (err) {
    console.error("[waitlist] erro ao contar:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}

// Lista de espera do LANÇAMENTO de um livro (ex.: "I Love Dopamina" completo).
// Separada dos `subscribers` da newsletter: consentimento distinto — aqui é
// "me avise quando o livro completo sair", não envio recorrente. Idempotente
// por (email, book_slug): a mesma pessoa pode entrar em listas de livros diferentes.
export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "waitlist", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }
  let email = "";
  let lang = "br";
  let slug = "";
  try {
    const body = await req.json();
    email = String(body?.email ?? "").trim().toLowerCase();
    lang = body?.lang === "es" ? "es" : "br";
    slug = String(body?.slug ?? "").trim().slice(0, 80);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  if (!EMAIL_RE.test(email) || email.length > 254) {
    return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
  }
  if (!slug) {
    return NextResponse.json({ ok: false, error: "missing_slug" }, { status: 400 });
  }

  try {
    const { sql } = await import("@vercel/postgres");
    // (tabela `waitlist` criada em /api/migrate — sem DDL por request; auditoria 29/06)
    await sql`
      INSERT INTO waitlist (email, book_slug, lang)
      VALUES (${email}, ${slug}, ${lang})
      ON CONFLICT (email, book_slug) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[waitlist] erro:", err);
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 500 });
  }
}
