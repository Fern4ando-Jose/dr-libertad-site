// ─── A pesquisa NÃO pode sequestrar o tema ───────────────────────────────────
// POR QUE EXISTE (2026-08-10, o dono viu o Reel ES e disse "não faz nem 1 sentido"):
//
// O tema da vaga era «La incertidumbre es lo que engancha». O Reel que foi ao ar
// falava de PROSTITUIÇÃO — título «¿Qué busca quien se vende? No dinero.» e fecho
// «Manda esto a quien aún cree que la prostitución es una opción libre.» Nas DUAS
// contas, ES e BR.
//
// A causa não estava no redator. Estava no material que entregamos a ele: a pesquisa
// gravada em `reel_shared_cache` para aquele tema tinha UM único resultado — o verbete
// «Impacto de la prostitución en la salud mental». Ele entrava no prompt debaixo do
// rótulo "Contexto investigado", sem ninguém perguntar se falava do assunto. O redator
// fez o que qualquer um faria: escreveu sobre o que lhe deram.
//
// E não era caso isolado. Medido contra as 131 pesquisas guardadas (as últimas 48 vagas):
//   «El ambiente te influye, no te absuelve»      → Testemunhas de Jeová
//   «Gratificación instantánea vs esfuerzo real»  → Racismo institucional
//   «Entrenados para elegir, nunca para mantener» → Ra's al Ghul (personagem de HQ) · Stálin
//   «Un desliz no es una recaída»                 → Críticas conservadoras ao marxismo
// **107 dos 131 resultados não tocavam o tema.** Quem erra aqui é a BUSCA (o DuckDuckGo
// costuma barrar nosso IP e a reserva pergunta à Wikipédia «<tema> psicología», que sempre
// devolve ALGUMA página); esta peneira é a defesa contra o que ela devolve.
//
// A régua é de propósito grosseira — UM radical em comum basta. Ela não julga qualidade
// nem profundidade: só separa "isto fala do assunto" de "isto veio de outro planeta".
// Contexto ERRADO é pior que contexto NENHUM: sem contexto o redator escreve na voz da
// marca (caminho que já existe e é fail-open); com contexto errado ele escreve com
// convicção sobre outra coisa.

export interface ResultadoPesquisa {
  title: string;
  content: string;
  url?: string;
}

/** Palavras que não carregam assunto em espanhol/português — não servem de ponte. */
const VAZIAS = new Set(
  (
    "a al algo alguem alguien algum alguna algunas alguno algunos ante antes aquel aquela aquele " +
    "aquella aquello asi assim aun aunque cada como con contra cual cuales cuando de del desde " +
    "donde dos el ela ele ella ellas ello ellos em en entre era eram eran es esa esas ese eso esos " +
    "esta estan estas este esto estos foi for fue fueron ha hace hacia han hasta hay isso isto la " +
    "las le les lo los mais mas me mesmo mi mientras mucho muito muy nada nao ni no nos nunca o os " +
    "otra otras otro otros para pelo pela pero poco por porque pra que quem se segun sem ser si sim " +
    "sin sob sobre solo son sua suas seu seus su sus tal tambem tambien tan tanto te tem tiene " +
    "tienen toda todas todo todos tras tu tua tuas tus um uma un una unas uno unos y ya"
  ).split(" "),
);

const semAcento = (s: string): string => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/**
 * Os radicais (5 primeiras letras) das palavras que CARREGAM assunto. Radical em vez da
 * palavra inteira porque «incertidumbre» tem de casar com «incertidumbres» e «engancha»
 * com «enganchado» — exigir igualdade jogaria fora pesquisa boa por causa de um plural.
 */
export function radicaisDoAssunto(texto: string): Set<string> {
  return new Set(
    semAcento(texto || "")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((p) => p.length >= 4 && !VAZIAS.has(p))
      .map((p) => p.slice(0, 5)),
  );
}

/**
 * Este resultado fala DO TEMA? Basta UM radical em comum entre o enunciado do tema e o
 * título + o começo do texto do resultado.
 *
 * Fail-open onde não dá para julgar: tema sem nenhuma palavra de assunto (só palavras
 * vazias) devolve `true` — não temos contra o que comparar, e barrar às cegas custaria
 * a vaga.
 */
export function pertinenteAoTema(topic: string, r: ResultadoPesquisa | null | undefined): boolean {
  if (!r) return false;
  const alvo = radicaisDoAssunto(topic);
  if (alvo.size === 0) return true;
  // Só o COMEÇO do texto: verbete comprido acaba encostando em qualquer palavra, e aí a
  // peneira aprovaria tudo — a régua tem de olhar do que o resultado TRATA, não o rodapé.
  const tem = radicaisDoAssunto(`${r.title || ""} ${(r.content || "").slice(0, 600)}`);
  for (const radical of alvo) if (tem.has(radical)) return true;
  return false;
}

/**
 * Filtra a pesquisa antes de ela virar "Contexto investigado" no prompt. Devolve também
 * o que caiu, para o registro do servidor DIZER — peneira silenciosa vira peneira que
 * ninguém sabe se está ligada.
 */
export function filtrarPesquisa<T extends ResultadoPesquisa>(
  topic: string,
  resultados: T[] | null | undefined,
): { mantidos: T[]; descartados: T[] } {
  const lista = Array.isArray(resultados) ? resultados.filter(Boolean) : [];
  const mantidos: T[] = [];
  const descartados: T[] = [];
  for (const r of lista) (pertinenteAoTema(topic, r) ? mantidos : descartados).push(r);
  return { mantidos, descartados };
}
