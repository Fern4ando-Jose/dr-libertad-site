import { NextRequest, NextResponse } from "next/server";
import { isRateLimited } from "@/lib/rate-limit";
import { validateAnswers } from "@/lib/survey-schema";
import { countryFromHeaders, normalizeSource } from "@/lib/survey-source";

export const runtime = "nodejs";

// ─── POST /api/survey — grava uma resposta da pesquisa em survey_responses ───
// Anonimato POR CONSTRUÇÃO (requisito do plano aprovado): NÃO persiste IP nem
// user-agent — só (lang, answers jsonb, email opcional em COLUNA SEPARADA,
// source jsonb com a etiqueta de campanha, created_at). O e-mail entra apenas se
// a pessoa o deixou na tela 6 (convite de entrevista) e nunca dentro do jsonb de
// respostas. `source` guarda SÓ utm_* (ex.: ig / cpc / pesquisa-br-01) — rótulo de
// anúncio, não identificador: o termo de participação segue verdadeiro. `country`
// guarda SÓ o código do país (BR, MX, AR…) que a plataforma informa no cabeçalho:
// o IP não é lido nem gravado, e país é grosso demais para identificar alguém —
// serve para comparar México × Espanha dentro do mesmo espanhol.
// Validação estrita: só itens do esquema (src/lib/survey-schema.ts) com valores
// no domínio chegam ao banco; consentimento (tela 0) é obrigatório.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS survey_responses (
    id         BIGSERIAL PRIMARY KEY,
    lang       TEXT  NOT NULL DEFAULT 'br',
    answers    JSONB NOT NULL DEFAULT '{}',
    email      TEXT,
    source     JSONB NOT NULL DEFAULT '{}',
    country    TEXT,
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
    let br = 0;
    let es = 0;
    for (const r of rows as { lang: string; n: number }[]) {
      if (r.lang === "es") es = r.n;
      else br += r.n; // linhas antigas "pt" somam no br
    }
    return NextResponse.json(
      { ok: true, br, es, total: br + es },
      { headers: { "cache-control": "public, s-maxage=60, stale-while-revalidate=300" } }
    );
  } catch {
    // Tabela ainda não existe ou banco indisponível → zero, sem quebrar a página.
    return NextResponse.json({ ok: true, br: 0, es: 0, total: 0 });
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

  const lang = body?.lang === "es" ? "es" : "br";

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

  // Origem da campanha (utm_*) — opcional; ausente/lixo vira {} (= "direto").
  const sourceJson = JSON.stringify(normalizeSource(body?.source));
  // País: só o que a plataforma informa no cabeçalho (nunca vem do cliente, que
  // poderia mentir; nunca derivado de IP guardado, porque IP não é guardado).
  const country = countryFromHeaders(req.headers);

  const { sql } = await import("@vercel/postgres");
  const answersJson = JSON.stringify(validated.clean);

  const insert = () => sql`
    INSERT INTO survey_responses (lang, answers, email, source, country)
    VALUES (${lang}, ${answersJson}::jsonb, ${email}, ${sourceJson}::jsonb, ${country})
  `;
  // Banco anterior às colunas de campanha/país: grava sem elas (a resposta NUNCA
  // se perde por causa de uma etiqueta). O /api/migrate adiciona as colunas depois.
  const insertNoCountry = () => sql`
    INSERT INTO survey_responses (lang, answers, email, source)
    VALUES (${lang}, ${answersJson}::jsonb, ${email}, ${sourceJson}::jsonb)
  `;
  const insertLegacy = () => sql`
    INSERT INTO survey_responses (lang, answers, email)
    VALUES (${lang}, ${answersJson}::jsonb, ${email})
  `;

  const isUndefinedColumn = (e: unknown) =>
    (typeof e === "object" && e !== null && (e as { code?: string }).code === "42703") ||
    ((String(e).includes("source") || String(e).includes("country")) && String(e).includes("column"));

  try {
    try {
      await insert();
    } catch (e) {
      if (!isUndefinedColumn(e)) throw e;
      try {
        await insertNoCountry();
      } catch (e2) {
        if (!isUndefinedColumn(e2)) throw e2;
        await insertLegacy();
      }
    }
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
        await insert();
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
