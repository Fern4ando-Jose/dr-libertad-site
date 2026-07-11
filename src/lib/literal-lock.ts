// ─── Trava anti-amenização (temas-convicção) ──────────────────────────────────
// Para os temas que SÃO uma frase-verdade do dono (flag `literal: true` no THEMES,
// fonte única — `api/publish/route.ts`), o modelo NÃO pode suavizar, reformular nem
// trocar a frase por "libertad"/palavra de marca. Foi o bug do ED 106: o tema
// "El hombre no necesita ser amado: necesita cariño, respeto y admiración" saiu como
// "No necesitas ser amado: necesitas LIBERTAD" — a regra de marca (título DEVE
// conectar com a libertad) atropelou a convicção literal. A diretiva abaixo é
// injetada no prompt SÓ para temas-convicção e ANULA, neles, a exigência de libertad
// no título (a libertad vai num insight).
//
// É uma função PURA (testável); a DATA de quais temas são convicção mora no flag
// `literal` de cada entrada do THEMES (viaja com a string do tema → não dessincroniza).
// A linha editorial do dono é INVIOLÁVEL: a provocação vem da IDEIA, e a frase-verdade
// é mantida íntegra. Atualizar a linha = marcar/desmarcar `literal` nos temas + ajustar
// o prompt; é assim que a automação passa a respeitar a visão reestruturada.

export function buildLiteralDirective(
  isLiteral: boolean,
  freedom: string,
  opts?: { lang?: "es" | "pt"; anchorPt?: string },
): string {
  if (!isLiteral) return "";
  const lang = opts?.lang ?? "es";
  const anchorPt = opts?.anchorPt?.trim();

  // PT com âncora canônica do dono: a frase-verdade JÁ EXISTE em português (verbatim
  // do §4 da LINHA-EDITORIAL) — o modelo NÃO traduz nem regenera a convicção, usa a
  // frase dada. Anula a colisão marketBrief ("zero espanhol") × trava ("preserva a
  // frase [em ES]") que FORÇAVA tradução livre (bug "cariño"→"cuidado").
  if (lang === "pt" && anchorPt) {
    return `
TEMA-CONVICÇÃO (INVIOLÁVEL) — este tema É uma frase-verdade do autor, e a versão CANÔNICA em português é: «${anchorPt}». A força está nas palavras EXATAS desta frase em português — NÃO traduza o "Tema" em espanhol; use a frase canônica dada:
- O "postTitle" PRESERVA as palavras da frase canônica, intactas. Se não couber em 55 caracteres, corte enchimento mas NUNCA o núcleo; jamais reformule, suavize, troque palavra crua por eufemismo, nem substitua a frase por "${freedom}" ou outra palavra de marca.
- O PRIMEIRO elemento de "slides" contém a frase canônica COMPLETA, textual: «${anchorPt}».
- PROIBIDO amaciar: nada de eufemismo, nada de explicar depois do fecho (a frase TERMINA NO OSSO — a última palavra é a que fica), nada de quebrar a antítese/travessão, nada de embrulhar em pergunta-reflexão.
- A conexão com a ${freedom} vai em OUTRO insight (2 ou 3), NUNCA no título nem no lugar da frase. Isto ANULA, SÓ para este tema, DUAS exigências gerais do prompt: (a) conectar o título com a liberdade, e (b) o título ser PERGUNTA ou reenquadre — aqui o título é a AFIRMAÇÃO textual da frase canônica, nem pergunta nem reformulação. (O insight 2/3 pode ser pergunta; o título não.)
`;
  }

  // PT SEM âncora canônica (o dono ainda não fixou o verbatim PT): tradução FIEL
  // obrigatória — os 3 modos de suavização que JÁ vazaram no feed são proibidos
  // (§7 LINHA-EDITORIAL: eufemismo · estufar o golpe · andaime de coach).
  const ptTranslationRule = lang === "pt"
    ? `\n- A frase do Tema está em espanhol: traduza-a ao português FIEL, PALAVRA POR PALAVRA — mesma crueza (palavra crua fica crua, NUNCA eufemismo), mesma mecânica (antítese/travessão/dois-pontos intactos), mesmo fecho (termina no osso; PROIBIDO acrescentar explicação depois do golpe). Traduzir ≠ reescrever.`
    : "";

  return `
TEMA-CONVICCIÓN (INVIOLABLE) — este tema ES una frase-verdad del autor; su fuerza está en las palabras EXACTAS:
- El "postTitle" PRESERVA las palabras clave de la frase del tema, intactas. Si no cabe en 55 caracteres, recorta relleno pero NUNCA el núcleo; jamás reformules, suavices ni sustituyas la frase por "${freedom}"/"libertad" u otra palabra de marca.
- El PRIMER elemento de "slides" contiene la frase COMPLETA del tema, textual.${ptTranslationRule}
- La conexión con la ${freedom} va en OTRO insight (2 o 3), NUNCA en el título ni en lugar de la frase. Esto ANULA, SOLO para este tema, TRES exigencias generales del prompt: (a) conectar el título con la libertad, (b) que el título sea una PREGUNTA o un reencuadre — aquí el título es la AFIRMACIÓN textual de la frase del tema, ni pregunta ni reformulación (el insight 2/3 sí puede ser pregunta, el título no) — y (c) la regla "PROHIBIDO copiar el enunciado del Tema literal": en un tema-convicción en su MISMO idioma la frase SÍ va copiada textual.
`;
}

// ─── Guardião do texto GERADO (a trava cobria só o prompt) ────────────────────
// Vazamentos reais no feed provaram que a diretiva sozinha não basta (27/06:
// "transar"→"deita"; 01/07: antítese quebrada + fecho estufado). Este check
// DETERMINÍSTICO valida a saída: em tema-convicção com âncora conhecida (ES = o
// próprio topic; PT = literalPt), o 1º slide TEM de conter a frase-âncora
// verbatim (normalização leve: caixa, aspas/travessões tipográficos, espaços,
// pontuação de borda). Falhou → regenera; esgotou → BLOQUEIA (suavizar a
// convicção é o "pecado-mor" da linha editorial — não vai ao feed).
export function normalizeAnchorText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[«»"""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[—–]/g, "-")
    .replace(/[.,;:!?¿¡"'()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Âncora p/ validar a saída: PT usa a canônica (se existir); ES usa o próprio tema.
// PT sem âncora → null (não há verbatim p/ comparar; vale só a regra de tradução fiel).
export function anchorForLang(topic: string, lang: "es" | "pt", anchorPt?: string): string | null {
  if (lang === "pt") return anchorPt?.trim() || null;
  return topic;
}

// true = a convicção NÃO saiu íntegra no 1º slide (violação → regenerar/bloquear).
// "Termina no osso": o slide tem de TERMINAR na âncora — conter mas continuar depois
// é o modo (B) da suavização ("estufar o golpe", vazou 01/07: fecho + explicação).
// Prefixo leve antes da âncora é tolerado; sufixo depois dela, nunca.
export function anchorViolated(slides: string[], anchor: string | null): boolean {
  if (!anchor) return false;
  const first = normalizeAnchorText(slides[0] ?? "");
  return !first.endsWith(normalizeAnchorText(anchor));
}
