// ─── Trava de PUREZA DE IDIOMA — "BR é BR; ES é ES" ──────────────────────────
// Por que existe: o `generateContent` (haiku) às vezes deixa ESPANHOL vazar no
// conteúdo PT — o caso clássico é REUTILIZAR a frase do TEMA (que é canônica em
// espanhol) literal como 1º slide/título, trocando uma palavra só. Saiu no Reel BR
// 25/06 ("Voar más alto no es traición: es lealtad a lo que eres") e em hashtags
// (#MenteLibre por #MenteLivre). É um defeito de QUALIDADE: não estoura, não quebra
// o CI, publica "com sucesso" — então nenhuma revisão de código o pegava. Esta trava
// é o detector determinístico que faltava (regenera/bloqueia antes de ir pro feed).
//
// Projeto: ALTA PRECISÃO > recall. Só marca o que é INEQUÍVOCO do outro idioma
// (palavra-função que não existe no idioma-alvo + morfologia exclusiva). Preferimos
// DEIXAR PASSAR um vazamento sutil a BLOQUEAR um post legítimo (falso positivo =
// vaga perdida). Função PURA → testável por invariante, sem rede.

export type Lang = "es" | "pt";

// Palavras INEQUÍVOCAS de cada idioma (jamais válidas no outro). Minúsculas, com
// acento quando o têm. Curadas à mão p/ não colidir com o idioma-alvo:
//  - excluídas de propósito por serem válidas em PT *e* ES: "no", "como", "para",
//    "por", "que", "se", "esta", "este", "está", "nunca", "nada", "vez", "cada",
//    "porque", "desde", "hasta"…
const ES_WORDS = new Set([
  "más", "muy", "pero", "también", "aunque", "entonces", "ahora", "hoy", "ayer",
  "luego", "siempre", "eres", "soy", "estás", "hay", "hacia", "donde", "cuando",
  "cuándo", "quién", "quien", "mismo", "misma", "mismos", "mismas", "mucho",
  "muchos", "mucha", "muchas", "tiempo", "mujer", "mujeres", "ella", "ellos",
  "ellas", "nosotros", "ustedes", "usted", "tú", "así", "aquí", "allí", "ahí",
  "algún", "ningún", "alguien", "nadie", "cosa", "cosas", "puede", "puedes",
  "libre", "móvil", "pantalla", "disfrutar", "disfruta", "disfrutas", "cita",
  "sin", "con", "una", "uno", "unos", "unas", "los", "las", "del", "esto", "eso",
  "esa", "ese", "es", "lo", "le", "les", "el", "la", "al",
]);

const PT_WORDS = new Set([
  "você", "vocês", "não", "então", "agora", "hoje", "mais", "muito", "muitos",
  "muita", "muitas", "aqui", "ali", "quem", "onde", "quando", "mulher", "ela",
  "eles", "elas", "nós", "ter", "fazer", "dizer", "livre", "celular", "tela",
  "aproveitar", "encontro", "sem", "com", "uma", "uns", "umas", "isso", "isto",
  "essa", "esse", "é", "são",
]);

// Morfologia EXCLUSIVA (sufixos/grafias que só existem num idioma). Aplicada por
// PALAVRA inteira (já tokenizada), case-insensitive.
const ES_PATTERNS: RegExp[] = [
  /^.+ciones?$/, // traición, validación, opciones
  /^.+(dad|tad)$/, // libertad, verdad, lealtad, realidad  (PT termina em -dade)
  /^.+miento$/, // aburrimiento, pensamiento  (PT -mento)
  /^.+ón$/, // corazón, razón, opción  (PT -ão)
  /ñ/, // mañana, niño
];
const PT_PATTERNS: RegExp[] = [
  /^.+ç(ão|ões)$/, // coração, opções
  /^.+dade$/, // liberdade, verdade  (ES termina em -dad/-tad)
  /[ãõ]/, // não, então, opções
  /(lh|nh)/, // trabalho, caminho  (ES usa ll/ñ)
];

function targetSets(lang: Lang): { words: Set<string>; patterns: RegExp[] } {
  // lang = idioma do conteúdo → procuramos marcadores do idioma OPOSTO.
  return lang === "pt"
    ? { words: ES_WORDS, patterns: ES_PATTERNS }
    : { words: PT_WORDS, patterns: PT_PATTERNS };
}

// Quebra um texto em palavras preservando acento (Unicode). Hashtags em camelCase
// ("#MenteLibre") são separadas antes ("Mente Libre") p/ a palavra "libre" ficar
// isolada e ser detectável por limite de palavra.
function tokenize(text: string): string[] {
  const split = text
    .replace(/([\p{Ll}\p{N}])([\p{Lu}])/gu, "$1 $2") // camelCase → camel Case
    .toLowerCase();
  return split.match(/[\p{L}]+/gu) ?? [];
}

/** Palavras do idioma OPOSTO encontradas no texto (vazio = limpo). */
export function foreignTokens(text: string, lang: Lang): string[] {
  if (!text) return [];
  const { words, patterns } = targetSets(lang);
  const hits: string[] = [];
  for (const tok of tokenize(text)) {
    if (words.has(tok) || patterns.some((re) => re.test(tok))) hits.push(tok);
  }
  return [...new Set(hits)];
}

export interface ForeignContent {
  postTitle?: string;
  slides?: string[];
  cta?: string;
  instagramCaption?: string;
  tags?: string[];
  // postBody (artigo do site, não vai pro IG/Reel) é DE PROPÓSITO ignorado:
  // texto longo = mais risco de falso positivo, e não renderiza no feed/vídeo.
}

export interface ForeignHit {
  field: string;
  tokens: string[];
}

/**
 * Varre os campos que REALMENTE renderizam no IG + Reel (título, slides, cta,
 * legenda, hashtags) procurando vazamento do outro idioma. Retorna a lista de
 * ocorrências (vazia = conteúdo puro no idioma-alvo).
 */
export function scanContentForeign(content: ForeignContent, lang: Lang): ForeignHit[] {
  const hits: ForeignHit[] = [];
  const add = (field: string, text: string | undefined) => {
    const t = foreignTokens(text ?? "", lang);
    if (t.length) hits.push({ field, tokens: t });
  };
  add("postTitle", content.postTitle);
  (content.slides ?? []).forEach((s, i) => add(`slides[${i}]`, s));
  add("cta", content.cta);
  add("instagramCaption", content.instagramCaption);
  add("tags", (content.tags ?? []).join(" "));
  return hits;
}

/** Resumo curto p/ log e p/ a nota de regeneração ("slides[0]: más, traición"). */
export function summarizeHits(hits: ForeignHit[]): string {
  return hits.map((h) => `${h.field}: ${h.tokens.join(", ")}`).join(" | ");
}
