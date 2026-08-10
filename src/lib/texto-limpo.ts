// ─── Caracteres INVISÍVEIS: o que ninguém vê, a voz lê em voz alta ───────────
// POR QUE EXISTE (2026-08-10, o dono ouviu o Reel ES e disse "a voz não faz nem
// 1 sentido"):
//
// O redator escreveu «Revisas el móvil sin saber qué busca[U+00AD]s.» — um HÍFEN
// SUAVE (soft hyphen) no meio da palavra "buscas". Na tela ele é INVISÍVEL: o
// quadro do Reel mostra "buscas" perfeito, e a legenda no feed também. Só que o
// motor de voz não pula caractere invisível — ele QUEBRA a palavra ali. A prova
// não é opinião: a transcrição do próprio áudio que foi ao ar, guardada em
// `narration_cache.words`, registrou «qué busca H» no lugar de «qué buscas».
//
// Nenhuma trava da casa pegava isso, e não é descuido delas: a de idioma procura
// PALAVRA do outro idioma, a de formato procura MOLDE, o QA visual olha a TELA — e
// na tela o caractere não existe. Defeito que só aparece no ouvido não é achado
// por nenhum olho.
//
// A limpeza mora aqui, sozinha e pura, porque vale para TUDO que o redator devolve
// — título, slides, legenda, CTA — e não só para a voz: o mesmo caractere invisível
// viaja para o Instagram dentro da legenda e para o banco dentro do cache. Aplicada
// em `normalizeContentJson`, ela pega carrossel e Reel de uma vez só.

/**
 * Os invisíveis que já chegaram (ou podem chegar) no texto de um modelo de linguagem.
 * São APAGADOS: nenhum deles separa palavras, então tirar não cola nada.
 *   00AD hífen suave (o caso real) · 200B-200D largura zero · 2060 juntador de palavra
 *   FEFF marca de ordem de byte · 180E separador mongol · 202A-202E e 2066-2069 bidi
 */
const INVISIVEIS = new RegExp("[\\u00AD\\u200B-\\u200D\\u2060\\uFEFF\\u180E\\u202A-\\u202E\\u2066-\\u2069]", "g");

/**
 * Espaços que NÃO são o espaço comum (duro, fino, de largura zero-quebrável…). Estes
 * SEPARAM palavras: viram espaço normal em vez de sumir, senão colariam duas palavras.
 */
const ESPACOS_ESTRANHOS = new RegExp("[\\u00A0\\u1680\\u2000-\\u200A\\u202F\\u205F\\u3000]", "g");

/** Tira o que é invisível na tela mas audível na voz. Texto normal sai idêntico. */
export function limparInvisiveis(texto: string): string {
  if (typeof texto !== "string" || !texto) return "";
  return texto.replace(INVISIVEIS, "").replace(ESPACOS_ESTRANHOS, " ");
}

/**
 * Diz SE havia algo invisível — para o registro do servidor ACUSAR em vez de calar.
 * Usa `limparInvisiveis` em vez de `.test()` de propósito: expressão com a marca `g`
 * guarda a posição da última busca entre chamadas e responderia alternando true/false.
 */
export function temInvisivel(texto: string): boolean {
  if (typeof texto !== "string" || !texto) return false;
  return limparInvisiveis(texto) !== texto;
}
