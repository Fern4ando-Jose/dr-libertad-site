// ─── Coleta anterior (respostas que existem FORA do banco do site) ───────────
// O contador da página do estudo lê o número REAL do banco (GET /api/survey).
// Além dele existe uma coleta anterior, feita fora do site, que o dono confirmou
// em 31/07/2026. Ela entra na soma — mas NUNCA escondida: o rótulo ao lado do
// contador diz quantas vêm de lá. Prova social é honesta ou não é prova (P4).
//
// REGRAS desta constante:
//  1. só entra número que EXISTE — se a coleta anterior não puder ser mostrada
//     a quem perguntar, ela não entra aqui;
//  2. o valor é CONSERVADOR (arredondado para baixo): o dono informou "2 mil e
//     algo" no BR, então vale 2.000 — subdeclarar é seguro, superdeclarar não;
//  3. mudou o número? muda AQUI e o rótulo se ajusta sozinho nos dois idiomas.
//
// O painel /admin/pesquisa NÃO usa esta constante: lá o número é só o do banco,
// porque é dele que sai a análise do livro.

export const PRIOR_RESPONSES: Record<"br" | "es", number> = {
  br: 2000,
  es: 0,
};

/** Quantas respostas anteriores contam para este idioma (0 = nenhuma). */
export function priorFor(lang: "br" | "es"): number {
  const n = PRIOR_RESPONSES[lang];
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
