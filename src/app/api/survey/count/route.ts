import { NextResponse } from "next/server";
import { SURVEY_TARGET_PER_LANG, SURVEY_TEST_IDS } from "@/lib/survey-meta";

export const runtime = "nodejs";

// ─── GET /api/survey/count — contador PÚBLICO de respostas da pesquisa ───────
// Prova social da página do livro (/livro · /libro): COUNT real de
// survey_responses EXCLUINDO as linhas de teste conhecidas (ids 1–4 —
// src/lib/survey-meta.ts). Devolve total + por idioma + o marco (~400/idioma,
// a "barra de progresso do lançamento" — PLANO-PAGINA-LIVRO.md).
// CACHE CURTO na CDN (s-maxage=60 + SWR): a página do livro pode ter tráfego
// sem bater no Neon a cada view; 1 consulta/min no pior caso.

export async function GET() {
  try {
    const { sql } = await import("@vercel/postgres");
    // SURVEY_TEST_IDS é constante do código (nunca input do usuário) — seguro
    // interpolar; array vazio viraria SQL inválido, então protege com [-1].
    const ids = (SURVEY_TEST_IDS.length ? SURVEY_TEST_IDS : [-1]).join(",");
    const r = await sql.query(
      `SELECT
         COUNT(*)::int                                   AS total,
         COUNT(*) FILTER (WHERE lang = 'pt')::int        AS pt,
         COUNT(*) FILTER (WHERE lang = 'es')::int        AS es
       FROM survey_responses
       WHERE id NOT IN (${ids})`
    );
    const row = r.rows[0] ?? { total: 0, pt: 0, es: 0 };
    return NextResponse.json(
      {
        ok: true,
        total: row.total ?? 0,
        byLang: { pt: row.pt ?? 0, es: row.es ?? 0 },
        targetPerLang: SURVEY_TARGET_PER_LANG,
      },
      {
        headers: {
          // CDN da Vercel: fresco por 60s; até 5min serve o velho enquanto revalida.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (e) {
    // Fail-open para a UI: contador indisponível → a página esconde o número
    // (nunca quebra a página do livro por causa da prova social).
    console.error("[survey/count] erro:", String(e));
    return NextResponse.json(
      { ok: false, total: 0, byLang: { pt: 0, es: 0 }, targetPerLang: SURVEY_TARGET_PER_LANG },
      { status: 200, headers: { "Cache-Control": "public, s-maxage=30" } }
    );
  }
}
