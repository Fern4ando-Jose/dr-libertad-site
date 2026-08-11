import { paraFalar } from "./fala";

// ─── O ROTEIRO QUE A VOZ FALA — fonte única ──────────────────────────────────
// A montagem morava DENTRO de `api/publish/route.ts`, e o teste que a travava tinha uma
// CÓPIA da função ("espelha `narrationSegments` de publish/route.ts"). Cópia não trava
// nada: em 2026-08-10 o fecho falado ES mudou na rota e o teste seguiu verde afirmando o
// contrário, porque estava conferindo a si mesmo. Agora rota e teste chamam ESTA função.
//
// Os blocos devolvidos são também as FRONTEIRAS DE CENA do render (`narrationSegments`):
// a cena vira quando a voz vira de frase. Por isso a lista é uma só — se o roteiro falado
// e a lista de cenas divergirem, a tela mostra um texto enquanto a voz narra outro.

/**
 * O fecho que a voz diz DEPOIS do último insight, por idioma.
 *
 * ⛔ Nenhum dos dois pode conter: a palavra-chave do funil (LIBERTAD/LIBERDADE), «Direct»
 * ou o @handle. Foram exatamente essas três que a voz embolou em 29/07 e fizeram o dono
 * mandar tirar o fecho da narração — o silêncio que sobrou virou a queixa de 10/08
 * ("áudio truncado" no ES: 8,6 s finais sem voz). Travado em `roteiro-falado.invariants.test.ts`.
 */
export const FECHO_FALADO: Record<string, string> = {
  br: "Me segue pra mais verdades incômodas.",
  es: "Sigue por aquí para más verdades incómodas.",
};

/**
 * Os blocos do roteiro NA ORDEM em que são falados: capa (título) + insights + fecho.
 * `cta` é a pergunta/convite do dia que abre o fecho; vazio → o fecho é só a frase da marca.
 */
export function blocosFalados(
  titulo: string,
  slides: string[],
  lang: string,
  cta = "",
): string[] {
  // Sem frase de fecho para este idioma, NÃO há bloco de fecho — nem com cta. O cta
  // sozinho não é fecho: ele é a pergunta do dia, e falá-lo solto deixaria o Reel
  // terminando numa pergunta sem convite. (O teste pegou isto: idioma desconhecido
  // produzia n+2 blocos com o cta ocupando o lugar do fecho.)
  const frase = String(FECHO_FALADO[lang] ?? "").trim();
  const fecho = !frase
    ? ""
    : [String(cta || "").trim(), frase].filter(Boolean).join(" ");
  return [titulo, ...slides, ...(fecho ? [fecho] : [])]
    .map((s) => String(s ?? "").trim())
    .filter(Boolean)
    // ⛔ 2026-08-11 — TELA E BOCA SÃO TEXTOS DIFERENTES. O dono ouviu a peça e disse:
    // *"a palavra (20 min) corta a palavra e fica estranho, não existe 20 min falado"*.
    // O bloco ia CRU para o motor de voz, então "scrolla 20 min" era lido como está
    // escrito. Na tela "20 min" é bom (curto, cabe); na boca é "vinte minutos".
    // Só o roteiro FALADO passa por aqui — o texto que aparece na tela continua o mesmo.
    .map((s) => paraFalar(s, lang))
    .map((s) => (/[.!?]$/.test(s) ? s : s + "."));
}

/** O texto contínuo entregue ao motor de voz — a junção dos mesmos blocos. */
export function roteiroFalado(titulo: string, slides: string[], lang: string, cta = ""): string {
  return blocosFalados(titulo, slides, lang, cta).join(" ");
}
