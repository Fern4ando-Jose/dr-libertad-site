// ─── Trava de PUREZA DE IDIOMA — "BR é BR; ES é ES" ──────────────────────────
// Por que existe: o `generateContent` (haiku) às vezes deixa ESPANHOL vazar no
// conteúdo PT — o caso clássico é REUTILIZAR a frase do TEMA (que é canônica em
// espanhol) literal como 1º slide/título, trocando uma palavra só. Saiu no Reel BR
// 25/06 ("Voar más alto no es traición: es lealtad a lo que eres") e em hashtags
// (#MenteLibre por #MenteLivre). É um defeito de QUALIDADE: não estoura, não quebra
// o CI, publica "com sucesso" — então nenhuma revisão de código o pegava. Esta trava
// é o detector determinístico que faltava (regenera/bloqueia antes de ir pro feed).
//
// ⛔ 04/08/2026 — ELA DEIXOU PASSAR "absuelve". O Reel BR foi ao ar com
// «Influência não absuelve:» (o tema em espanhol é "El ambiente te influye, no te
// absuelve"). A lista tinha ~150 palavras escolhidas caso a caso e não conhecia o
// verbo. O dono viu no feed: *"como que passa um erro grotesco desse?"*.
//
// O conserto NÃO foi acrescentar uma palavra. Três mudanças de fundo:
//  (1) as listas e os padrões saíram do código e viraram um ARQUIVO DE DADOS,
//      `lang-dict.json` — o MESMO que todos os outros motores da casa usam (X,
//      Threads, TikTok, LinkedIn, Pinterest, Facebook, YouTube, Um País de Merda,
//      Guerra Invisível, esteiras de comentário). Nenhum deles tinha conferência
//      de idioma até aquele dia: o defeito estava fechado em UM motor só.
//  (2) o dicionário passou a ser medido contra o corpus REAL — 706 mil palavras
//      dos manuscritos em português e 60 mil em espanhol — antes de entrar. Essa
//      passada mostrou a trava marcando "houve", "saía", "papéis", "silenciosa",
//      "doomscrolling" e o sobrenome "Schüll": nenhum é vazamento, e cada um teria
//      custado uma vaga de publicação.
//  (3) a varredura passou a incluir a NARRAÇÃO — o áudio do Reel. Uma palavra
//      espanhola ali é ouvida por todo mundo e ninguém a conferia.
//
// FONTE ÚNICA e por que existe um espelho: o dono do arquivo é
// `.claude/lib/idioma/dicionario-pureza.json`. O deploy da Vercel não enxerga
// `.claude/`, então este projeto carrega uma cópia byte a byte em
// `src/lib/lang-dict.json`. Quem garante que as duas são iguais é
// `node .claude/lib/idioma/verificar-espelho.mjs`, que reprova se divergirem.
// **Editar a lista aqui não adianta — edite a fonte única e espelhe.**
//
// Projeto: ALTA PRECISÃO > recall. Só marca o que é INEQUÍVOCO do outro idioma.
// Preferimos DEIXAR PASSAR um vazamento sutil a BLOQUEAR um post legítimo.
// Função PURA → testável por invariante, sem rede.

import dict from "./lang-dict.json";

export type Lang = "es" | "br";

const ES_WORDS = new Set<string>(dict.es);
const PT_WORDS = new Set<string>(dict.pt);
const ES_PATTERNS: RegExp[] = dict.morfologia_es.map((re: string) => new RegExp(re, "u"));
const PT_PATTERNS: RegExp[] = dict.morfologia_pt.map((re: string) => new RegExp(re, "u"));

// Palavra SEM idioma — termo de internet que a marca usa ("doomscrolling",
// "stories", "feed") e inglês corrente. O padrão do dígrafo "ll" marcava
// scroll/skill/full como espanhol até a caça ao falso positivo pegar isso.
const NEUTRAL = new Set<string>((dict as { neutras?: string[] }).neutras ?? []);
// O espanhol escreve "inhibición"/"desinhibida" com n+h de prefixo — não é o
// dígrafo português de "caminho". Só estas escapam do padrão (lh|nh).
const PT_ESCAPES: RegExp[] = ((dict as { excecoes_pt?: string[] }).excecoes_pt ?? []).map(
  (re: string) => new RegExp(re, "u"),
);

function targetSets(lang: Lang): { words: Set<string>; patterns: RegExp[]; escapes: RegExp[] } {
  // lang = idioma do conteúdo → procuramos marcadores do idioma OPOSTO.
  return lang === "br"
    ? { words: ES_WORDS, patterns: ES_PATTERNS, escapes: [] }
    : { words: PT_WORDS, patterns: PT_PATTERNS, escapes: PT_ESCAPES };
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

/**
 * NOME PRÓPRIO NÃO TEM IDIOMA. "María", "Sofía", "León" e o sobrenome "Schüll"
 * (a autora citada em *I Love Dopamina*) eram marcados como espanhol vazando.
 * A assinatura de nome próprio é a maiúscula NO MEIO da frase.
 *
 * Salvaguarda: título de capa costuma vir TODO EM MAIÚSCULAS — ali a pista não
 * distingue nada (tudo pareceria nome próprio) e a regra se desliga, senão a
 * trava ficaria cega justo na capa, que é onde o erro de 04/08 apareceu.
 */
function properNouns(text: string): Set<string> {
  const letters = text.match(/\p{L}/gu) ?? [];
  const uppers = text.match(/\p{Lu}/gu) ?? [];
  if (letters.length && uppers.length / letters.length > 0.6) return new Set();

  const names = new Set<string>();
  for (const sentence of text.split(/[.!?:;\n–—]+/)) {
    const words = sentence.trim().match(/[\p{L}]+/gu) ?? [];
    for (let i = 1; i < words.length; i++) {
      if (/^\p{Lu}[\p{Ll}]+$/u.test(words[i])) names.add(words[i].toLowerCase());
    }
  }
  return names;
}

/** Palavras do idioma OPOSTO encontradas no texto (vazio = limpo). */
export function foreignTokens(text: string, lang: Lang): string[] {
  if (!text) return [];
  const { words, patterns, escapes } = targetSets(lang);
  const names = properNouns(text);
  const hits: string[] = [];
  for (const tok of tokenize(text)) {
    if (NEUTRAL.has(tok) || names.has(tok)) continue;
    if (escapes.some((re) => re.test(tok))) continue;
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
  narration?: string;
  // postBody (artigo do site, não vai pro IG/Reel) é DE PROPÓSITO ignorado:
  // texto longo = mais risco de falso positivo, e não renderiza no feed/vídeo.
}

export interface ForeignHit {
  field: string;
  tokens: string[];
}

/**
 * Varre os campos que REALMENTE renderizam no IG + Reel (título, slides, cta,
 * legenda, hashtags e a NARRAÇÃO falada) procurando vazamento do outro idioma.
 * Retorna a lista de ocorrências (vazia = conteúdo puro no idioma-alvo).
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
  add("narration", content.narration);
  return hits;
}

/** Resumo curto p/ log e p/ a nota de regeneração ("slides[0]: más, traición"). */
export function summarizeHits(hits: ForeignHit[]): string {
  return hits.map((h) => `${h.field}: ${h.tokens.join(", ")}`).join(" | ");
}
