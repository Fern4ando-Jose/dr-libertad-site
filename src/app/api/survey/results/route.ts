import { NextRequest, NextResponse } from "next/server";
import { aggregate, toCsv, type SurveyRow } from "@/lib/survey-aggregate";
import { normalizeCountry, normalizeSource } from "@/lib/survey-source";

// ─── GET /api/survey/results — leitura do painel (/admin/pesquisa) ───────────
// Devolve TUDO que o dono precisa para acompanhar a pesquisa: totais, série por
// dia, quebra por campanha (utm), distribuição item a item e as últimas respostas
// inteiras (para conferir "minha resposta-teste chegou?").
//
//   GET /api/survey/results                → últimos 90 dias (json)
//   GET /api/survey/results?days=7         → janela menor
//   GET /api/survey/results?days=all       → tudo
//   GET /api/survey/results?lang=es        → só um idioma
//   GET /api/survey/results?country=MX     → só um país (ISO alfa-2)
//   GET /api/survey/results?format=csv     → planilha (uma linha por resposta)
//   …&email=0                              → CSV sem a coluna de e-mail (p/ compartilhar)
//
// Auth: Bearer ADMIN_TOKEN. Diferente do /api/reprovadas, aqui NÃO vale o
// CRON_SECRET: esta rota devolve texto livre de gente real e e-mail de entrevista
// — é o dado mais sensível do site, então só o token do painel abre.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─── CORS ────────────────────────────────────────────────────────────────────
// O painel local do dono (arquivo HTML aberto direto do disco, em D:\...) precisa
// ler esta rota, e página de arquivo tem origem "null" — sem CORS o navegador
// bloqueia antes de a requisição sair. Liberar `*` aqui NÃO afrouxa nada: a rota
// não usa cookie nem sessão, a única chave é o Bearer ADMIN_TOKEN, que o
// navegador jamais anexa sozinho. Sem o token, qualquer origem leva 401.
const CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "authorization, content-type",
  "access-control-max-age": "86400",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

const DEFAULT_DAYS = 90;
const MAX_ROWS = 5000; // teto de segurança: a agregação é em memória
const LATEST_LIMIT = 60;

function authorized(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const admin = process.env.ADMIN_TOKEN;
  return !!admin && auth === `Bearer ${admin}`;
}

function parseDays(raw: string | null): number | null {
  if (raw === "all") return null; // sem janela
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DAYS;
  return Math.min(Math.floor(n), 3650);
}

type DbRow = {
  id: number | string;
  lang: string;
  answers: unknown;
  email: string | null;
  source?: unknown;
  country?: unknown;
  created_at: string | Date;
};

function toSurveyRow(r: DbRow): SurveyRow {
  return {
    id: Number(r.id),
    lang: r.lang,
    answers: (typeof r.answers === "object" && r.answers !== null ? r.answers : {}) as SurveyRow["answers"],
    email: r.email ?? null,
    source: normalizeSource(r.source),
    country: normalizeCountry(r.country),
    created_at: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  };
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "Não autorizado" }, { status: 401, headers: CORS });
  }

  const params = req.nextUrl.searchParams;
  const days = parseDays(params.get("days"));
  const langFilter = params.get("lang") === "es" ? "es" : params.get("lang") === "br" ? "br" : null;
  const countryFilter = normalizeCountry(params.get("country"));
  const format = params.get("format");

  let rows: SurveyRow[];
  try {
    const { sql } = await import("@vercel/postgres");
    // A janela e o filtro de idioma entram parametrizados; `source` pode não
    // existir em banco anterior ao migrate — daí o fallback logo abaixo.
    const since = days === null ? new Date(0).toISOString() : new Date(Date.now() - days * 86400_000).toISOString();
    let result;
    try {
      result = await sql`
        SELECT id, lang, answers, email, source, country, created_at
        FROM survey_responses
        WHERE created_at >= ${since}
        ORDER BY created_at DESC
        LIMIT ${MAX_ROWS}
      `;
    } catch (e) {
      const undefinedColumn =
        (typeof e === "object" && e !== null && (e as { code?: string }).code === "42703") ||
        String(e).includes("source") ||
        String(e).includes("country");
      if (!undefinedColumn) throw e;
      // Banco ainda sem as colunas de campanha/país: lê o resto e trata as duas
      // como vazias (painel mostra "direto" e "não informado", nunca quebra).
      result = await sql`
        SELECT id, lang, answers, email, created_at
        FROM survey_responses
        WHERE created_at >= ${since}
        ORDER BY created_at DESC
        LIMIT ${MAX_ROWS}
      `;
    }
    rows = (result.rows as DbRow[]).map(toSurveyRow);
  } catch (e) {
    const missingTable =
      (typeof e === "object" && e !== null && (e as { code?: string }).code === "42P01") ||
      (String(e).includes("survey_responses") && String(e).includes("exist"));
    if (missingTable) {
      // Tabela ainda não criada (nenhuma resposta jamais gravada) — não é erro:
      // o painel mostra "nenhuma resposta ainda" em vez de tela vermelha.
      return NextResponse.json(
        { ok: true, ready: false, ...aggregate([]), latest: [], window: { days } },
        { headers: CORS }
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500, headers: CORS }
    );
  }

  let filtered = langFilter
    ? rows.filter((r) => (r.lang === "es" ? "es" : "br") === langFilter)
    : rows;
  if (countryFilter) filtered = filtered.filter((r) => r.country === countryFilter);

  if (format === "csv") {
    const includeEmail = params.get("email") !== "0";
    const csv = toCsv(filtered, includeEmail);
    const stamp = new Date().toISOString().slice(0, 10);
    return new NextResponse(csv, {
      headers: {
        ...CORS,
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="pesquisa-${langFilter ?? "todos"}${countryFilter ? `-${countryFilter}` : ""}-${stamp}.csv"`,
        "cache-control": "no-store",
      },
    });
  }

  const agg = aggregate(filtered);
  // `latest` traz a resposta INTEIRA (é como o dono confere a resposta-teste dele).
  const latest = filtered.slice(0, LATEST_LIMIT).map((r) => ({
    id: r.id,
    lang: r.lang === "es" ? "es" : "br",
    created_at: r.created_at,
    source: r.source,
    country: r.country,
    email: r.email,
    answers: r.answers,
  }));

  return NextResponse.json(
    { ok: true, ready: true, window: { days }, lang: langFilter, country: countryFilter, ...agg, latest },
    { headers: { ...CORS, "cache-control": "no-store" } }
  );
}
