// ─── Coleta anterior (respostas que existem FORA do banco do site) ───────────
// O contador da página do estudo lê o número REAL do banco (GET /api/survey).
// Além dele existe a PRIMEIRA RODADA do estudo, feita no formulário anterior
// (fora do site): 2.019 respostas, número informado pelo dono em 01/08/2026.
// Ela entra na soma — mas NUNCA escondida: o rótulo ao lado do contador diz
// quantas vêm de lá. Prova social é honesta ou não é prova (P4).
//
// REGRAS desta constante:
//  1. só entra número que EXISTE e que possa ser mostrado a quem perguntar —
//     aqui é o total do formulário anterior, exportável de lá;
//  2. nunca arredondar para cima: o número é o que o formulário fechou;
//  3. mudou o número? muda AQUI e o rótulo se ajusta sozinho nos dois idiomas.
//
// O painel /admin/pesquisa NÃO usa esta constante: lá o número é só o do banco,
// porque é dele que sai a análise do livro — as respostas do formulário anterior
// não têm as chaves q1..q24 do funil v2 e não são comparáveis item a item.

export const PRIOR_RESPONSES: Record<"br" | "es", number> = {
  // Formulário anterior — respostas em português. Se parte delas for em espanhol,
  // basta mover a fatia para `es`: o rótulo de cada idioma acompanha sozinho.
  br: 2019,
  es: 0,
};

/** Quantas respostas anteriores contam para este idioma (0 = nenhuma). */
export function priorFor(lang: "br" | "es"): number {
  const n = PRIOR_RESPONSES[lang];
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
