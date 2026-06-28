// ─── Trava de TEXTO DE SLIDE — "nunca cortar no meio da palavra" ──────────────
// Por que existe: a montagem das URLs do /api/og cortava o texto do slide com um
// `s.slice(0, 120)` CEGO. Um insight de duas orações (título + subtítulo) passa de
// 120 chars e o corte caía no MEIO da palavra → o ED 04 PT publicou "...estar viv"
// (a palavra era "vivo"; o caractere 120 caía exatamente em "viv"). É um defeito de
// QUALIDADE: não estoura, não quebra o CI, publica "com sucesso" — nenhuma revisão
// pegava. Esta é a trava determinística: corta SEMPRE numa borda de palavra.
//
// Pura → testável por invariante, sem rede. Fail-safe: string vazia/curta passa
// intacta; acima do limite recua até o último espaço; nunca devolve palavra partida.

/**
 * Corta `s` em no máximo `max` caracteres SEM quebrar no meio de uma palavra.
 * Se couber, devolve intacto. Se estourar, recua até o último espaço dentro do
 * limite (e remove pontuação solta no fim). Só corta no meio quando a 1ª palavra
 * já é maior que o limite (caso degenerado — melhor cortar que estourar o layout).
 */
export function clipSlideText(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  const base = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  // tira espaço e pontuação de junção solta no fim do corte (", " "—" ":" "–")
  return base.replace(/[\s,;:–—-]+$/u, "").trimEnd();
}
