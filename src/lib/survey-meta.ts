// ─── Pesquisa "Redes Sociais e Relacionamentos" — metadados de análise ───────
// Fase 2 (PLANO-PAGINA-LIVRO.md, veredito de marketing 2026-07-11): página do
// livro por TRÁS da pesquisa + waitlist + contador de respostas + origem.
// Helpers PUROS compartilhados por /api/survey, /api/survey/count e /api/waitlist
// (invariantes em survey-meta.invariants.test.ts).

/**
 * Linhas de TESTE em `survey_responses` (ids conhecidos, 2026-07-11/12):
 * 1–2 = smokes locais · 3 = click-through do dono no preview · 4 = teste de
 * produção (marcado em q23). O contador público EXCLUI estes ids — o número
 * exibido na página do livro é só de resposta real.
 */
export const SURVEY_TEST_IDS: readonly number[] = [1, 2, 3, 4];

/** Marco de fechamento do campo por idioma (barra de progresso do lançamento). */
export const SURVEY_TARGET_PER_LANG = 400;

/**
 * Origem do respondente (campo OCULTO, nullable — anonimato preservado: é um
 * rótulo de canal, nunca um identificador). Whitelist fechada: valor fora dela
 * vira null (não gravamos string livre do cliente no banco).
 */
export const ORIGEM_VALUES = ["livro"] as const;

export function normalizeOrigem(value: unknown): string | null {
  return typeof value === "string" && (ORIGEM_VALUES as readonly string[]).includes(value)
    ? value
    : null;
}

/**
 * Fonte do cadastro na waitlist (de onde o e-mail veio). Whitelist fechada;
 * `null` = fluxo legado do /api/waitlist (páginas de livro antigas, sem source).
 */
export const WAITLIST_SOURCES = ["obrigado", "livro"] as const;

export function normalizeWaitlistSource(value: unknown): string | null {
  return typeof value === "string" && (WAITLIST_SOURCES as readonly string[]).includes(value)
    ? value
    : null;
}
