import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { validateAnswers } from "@/lib/survey-schema";

export const runtime = "nodejs";

// ─── POST /api/survey — grava uma resposta da pesquisa em survey_responses ───
// Anonimato POR CONSTRUÇÃO (requisito do plano aprovado): NÃO persiste IP nem
// user-agent — só (lang, answers jsonb, email opcional em COLUNA SEPARADA,
// created_at). O e-mail entra apenas se a pessoa o deixou na tela 6 (convite de
// entrevista) e nunca dentro do jsonb de respostas.
// Validação estrita: só itens do esquema (src/lib/survey-schema.ts) com valores
// no domínio chegam ao banco; consentimento (tela 0) é obrigatório.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS survey_responses (
    id         BIGSERIAL PRIMARY KEY,
    lang       TEXT  NOT NULL DEFAULT 'pt',
    answers    JSONB NOT NULL DEFAULT '{}',
    email      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

// ─── GET /api/survey — contagem pública (prova social da página institucional) ──
// Só devolve o total de respostas por idioma — NUNCA qualquer dado de resposta.
// Fail-open: qualquer erro/tabela ausente devolve counts zerados (a página
// institucional então esconde o número e mostra o enquadramento "seja um dos
// primeiros"). Nada de número fabricado (P4).
export async function GET() {
  try {
    const { sql } = await import("@vercel/postgres");
    const { rows } = await sql`
      SELECT lang, COUNT(*)::int AS n FROM survey_responses GROUP BY lang
    `;
    let pt = 0;
    let es = 0;
    for (const r of rows as { lang: string; n: number }[]) {
      if (r.lang === "es") es = r.n;
      else pt += r.n;
    }
    return NextResponse.json(
      { ok: true, pt, es, total: pt + es },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    // Tabela ainda não existe ou banco indisponível → zero, sem quebrar a página.
    return NextResponse.json({ ok: true, pt: 0, es: 0, total: 0 });
  }
}

export async function POST(req: NextRequest) {
  if (await isRateLimited(req, "survey", 10)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const lang = body?.lang === "es" ? "es" : "pt";

  // Consentimento (tela 0) é condição de participação — sem ele, nada grava.
  if (body?.consent !== true) {
    return NextResponse.json({ ok: false, error: "consent_required" }, { status: 400 });
  }

  const validated = validateAnswers(body?.answers);
  if (!validated.ok) {
    return NextResponse.json({ ok: false, error: validated.error }, { status: 400 });
  }

  // E-mail: opcional (item 25 — convite de entrevista). Vazio/ausente → NULL.
  let email: string | null = null;
  if (typeof body?.email === "string" && body.email.trim() !== "") {
    const candidate = body.email.trim().toLowerCase();
    if (!EMAIL_RE.test(candidate) || candidate.length > 254) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }
    email = candidate;
  }

  const { sql } = await import("@vercel/postgres");
  const answersJson = JSON.stringify(validated.clean);

  try {
    await sql`
      INSERT INTO survey_responses (lang, answers, email)
      VALUES (${lang}, ${answersJson}::jsonb, ${email})
    `;
  } catch (e) {
    // Bootstrap preguiçoso: a tabela oficial nasce no /api/migrate (padrão do
    // repo), mas se o POST chegar antes do migrate rodar (ex.: preview), cria a
    // tabela UMA vez e re-tenta — DDL só no raro caminho 42P01, nunca por request.
    const undefinedTable =
      typeof e === "object" && e !== null && (e as { code?: string }).code === "42P01";
    const looksUndefined = String(e).includes("survey_responses") && String(e).includes("exist");
    if (undefinedTable || looksUndefined) {
      try {
        await sql.query(CREATE_TABLE);
        await sql`
          INSERT INTO survey_responses (lang, answers, email)
          VALUES (${lang}, ${answersJson}::jsonb, ${email})
        `;
      } catch (e2) {
        console.error("[survey] insert falhou após bootstrap:", String(e2));
        return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
      }
    } else {
      console.error("[survey] insert falhou:", String(e));
      return NextResponse.json({ ok: false, error: "db_error" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
