// ─── O ASSUNTO DO DIA — a carona que faltava de verdade ──────────────────────
// POR QUE EXISTE (2026-08-11). O dono perguntou: *"não íamos criar os posts de acordo com
// uma polêmica do dia? como ficou isso?"* — e, medindo antes de responder, a resposta
// honesta era **nenhuma**. Havia duas coisas diferentes com o mesmo apelido:
//
//   · a `diretrizDeCarona` (ligada hoje) aproveita nome/número/data que já apareça na
//     pesquisa DA PEÇA — e essa pesquisa busca o TEMA, não o dia. Os temas vêm de um
//     catálogo fixo de 61 ("A monogamia não é automática", "Deixar de temer a morte"),
//     e o DuckDuckGo/Wikipédia respondem sobre o conceito, atemporalmente. Nenhuma peça
//     publicada até aqui teve carona de assunto quente, porque não havia de onde vir;
//   · o que ele imaginou: a peça ANCORADA no que o país está comentando hoje.
//
// Este módulo é a segunda coisa: uma busca do que está sendo discutido AGORA dentro dos
// assuntos da marca, para o redator ter o que aproveitar. Fonte: DuckDuckGo (grátis, sem
// chave, o mesmo já usado pela pesquisa da peça), com recorte de recência.
//
// ⛔ O QUE ELE **NÃO** FAZ, de propósito:
//   · não escolhe o TEMA da peça. A rotação dos 61 temas é consolidada (saco de cartas,
//     trava anti-duplicata, livro-razão) e não se mexe nela por causa disto;
//   · não obriga. Se o que voltar não couber no tema sem forçar, a peça sai igual —
//     mesma regra da carona: **oferta, nunca ordem**. Nome puxado à força é pior que
//     nenhum, e é assim que uma marca de ideias vira um perfil de notícia requentada;
//   · não ataca pessoa. A provocação é pela IDEIA — a trava da linha editorial vale
//     inteira aqui (nunca julgar, expor ou ridicularizar quem for citado).
//
// FAIL-OPEN em tudo: busca falhou, veio vazia ou fora do assunto → devolve lista vazia e
// a peça segue exatamente como sairia antes.

import { searchDuckDuckGo, type DdgResult } from "./ddg";

/** Onde a marca tem o que dizer. Sem isto, a busca traria a manchete do dia sobre futebol. */
const RECORTES: Record<string, string[]> = {
  br: [
    "polêmica redes sociais celular vício notícia",
    "debate saúde mental ansiedade redes sociais",
    "discussão tempo de tela adolescentes",
  ],
  es: [
    "polémica redes sociales móvil adicción noticia",
    "debate salud mental ansiedad redes sociales",
    "discusión tiempo de pantalla adolescentes",
  ],
};

export interface AssuntoQuente {
  titulo: string;
  resumo: string;
  fonte: string;
}

/**
 * Vale a pena citar? Filtra o que é ruído de busca — resultado sem substância, página de
 * loja, ou texto curto demais para dar contexto ao redator. Função PURA (testável).
 */
export function pertinente(r: DdgResult): boolean {
  const t = `${r.title} ${r.content}`.toLowerCase();
  if (r.title.trim().length < 12 || r.content.trim().length < 60) return false;
  // Lixo comercial e de plataforma — nada disso vira gancho de peça.
  if (/\b(comprar|preço|cupom|promoção|frete|oferta|melhores pre|amazon\.|mercadolivre|shopee)\b/.test(t)) return false;
  if (/^(vídeos?|videos?|imagens?|fotos?)\b/.test(r.title.trim().toLowerCase())) return false;
  return true;
}

/**
 * O que está sendo discutido agora, dentro dos assuntos da marca. Devolve no máximo `max`.
 * Nunca lança: qualquer falha vira lista vazia (a peça sai como sairia antes).
 */
export async function assuntosDoDia(lang: string, max = 3): Promise<AssuntoQuente[]> {
  const recortes = RECORTES[lang === "es" ? "es" : "br"];
  const achados: AssuntoQuente[] = [];
  const visto = new Set<string>();
  for (const recorte of recortes) {
    if (achados.length >= max) break;
    try {
      const res = await searchDuckDuckGo(recorte, 3);
      for (const r of res) {
        if (achados.length >= max) break;
        if (!pertinente(r)) continue;
        const chave = r.title.trim().toLowerCase();
        if (visto.has(chave)) continue;
        visto.add(chave);
        achados.push({
          titulo: r.title.trim(),
          resumo: r.content.trim().slice(0, 240),
          fonte: r.url,
        });
      }
    } catch {
      /* fail-open: uma busca que falha não pode impedir a peça de sair */
    }
  }
  return achados;
}

/**
 * O bloco que entra no prompt. VAZIO quando não há nada — silêncio é melhor que mandar o
 * redator "usar o assunto do dia" sem ter nenhum, que é como nasce nome inventado.
 */
export function diretrizDoAssuntoDoDia(assuntos: AssuntoQuente[]): string {
  if (!assuntos.length) return "";
  return [
    "O QUE ESTÁ SENDO DISCUTIDO HOJE (use SE couber no tema, sem forçar):",
    ...assuntos.map((a) => `  · ${a.titulo} — ${a.resumo}`),
    "Se um destes tocar o tema desta peça, ancore a PRIMEIRA batida nele: é conversa que já",
    "está acontecendo, e chega de graça. Não coube? Ignore a lista inteira e escreva a peça",
    "como escreveria sem ela — assunto puxado à força é pior que nenhum.",
    "A carona entra no CONFLITO, nunca na tese: o fato externo dá a cena; a verdade continua",
    "sendo nossa. E jamais julgar, expor ou ridicularizar quem aparecer citado — a provocação",
    "é pela IDEIA.",
  ].join("\n");
}

// ─── A CARONA GRANDE: a polêmica do dia vira o TEMA da reel (ordem do dono 15/08) ──
// Ordem do dono: *"no inicio do dia deve buscar algum tema que está polemico, e vamos
// criar o reel referente a esse tema, porem com nossa voz"*. Medido no mesmo dia
// (54 peças): a carona-pequena (diretrizDoAssuntoDoDia, OFERTA) deixava ZERO rastro —
// ela não escolhia o tema. Agora a polêmica escolhida VIRA o seed do tema da reel.
// Guardas que ficam (linha editorial inteira): a busca só nos assuntos da marca
// (RECORTES acima), provocação pela IDEIA (nunca julgar/ridicularizar citados) e
// FAIL-OPEN → se nada for achado ou for fora do assunto, a rotação segue intocada.
import { getDayTheme, setDayTheme } from "./run-ledger";

/** O TEMA do dia: a polêmica escolhida como seed da reel (com a categoria da marca). */
export interface TemaDoDia {
  /** Seed que entra no prompt como "Tema:" — a manchete limpa. */
  topic: string;
  /** Uma das 6 categorias reais do catálogo (fallback "freedom"). */
  cat: string;
  /** Descrição p/ a capa gerada — a própria manchete. */
  subject: string;
  fonte: string;
  resumo: string;
}

/** Limpa a manchete p/ virar seed de tema. CONSERVADORA: só tira aspas e cola espaço. */
export function limparTituloDeTema(t: string): string {
  return t.replace(/[“”"']/g, "").replace(/\s+/g, " ").trim();
}

// ⚠️ ISTO ESTOU INVENTANDO (P4): a categoria é uma heurística por palavra-chave e a
// lista é a MINHA leitura das 6 categorias reais. Sempre cai numa das 6 (fallback
// "freedom") — nunca estoura fora do catálogo.
const REGRAS_DE_CATEGORIA: [RegExp, string][] = [
  [/(dopamina|vício|vicio|celular|tela|pantalla|notifica|algoritmo|scroll)/i, "dopamine"],
  [/(ansiedade|ansiedad|estresse|estres|stress|insônia|insónia|insomnio|sono|sueño)/i, "anxiety"],
  [/(atenção|atencion|foco|distraí|distrai|distracción|concentra)/i, "mind"],
  [/(amor|relacionamento|relación|solidão|soledad|monogamia|casamento|identidade)/i, "self"],
  [/(rede social|redes sociales|instagram|tiktok|validação|validación|curtida|seguidor)/i, "network"],
  [/(liberdade|libertad|autonomia|autonomía|controle|control|escrav|esclav|servidão|servidumbre)/i, "freedom"],
];

/** Categoria da marca mais próxima da manchete. PURA (testável). Fallback: "freedom". */
export function categoriaDoTema(titulo: string): string {
  for (const [re, cat] of REGRAS_DE_CATEGORIA) if (re.test(titulo)) return cat;
  return "freedom";
}

/** Escolhe a polêmica que vira tema: a 1ª aproveitável da busca (as RECORTES já
 *  filtram o assunto da marca). PURA. Nada → null (a rotação segue intocada). */
export function escolherTemaDoDia(assuntos: AssuntoQuente[]): TemaDoDia | null {
  const a = assuntos[0];
  if (!a) return null;
  const topic = limparTituloDeTema(a.titulo);
  return { topic, cat: categoriaDoTema(topic), subject: topic, fonte: a.fonte, resumo: a.resumo };
}

/** Recompõe o TemaDoDia a partir da manchete cacheada (fonte/resumo não persistem). */
function temaDoDiaDaManchete(topic: string): TemaDoDia {
  return { topic, cat: categoriaDoTema(topic), subject: topic, fonte: "", resumo: "" };
}

/**
 * A PRIMEIRA TAREFA DO DIA (ordem do dono 15/08): busca a polêmica e a guarda como
 * tema do dia, cacheada em run_topics(day, 99). Só o 1º chamador do dia busca; os
 * demais LEEM o MESMO (ES e PT no mesmo assunto — o diagrama aprovado). NUNCA lança:
 * busca falhou / veio vazia / fora do assunto → null (a rotação dos temas segue).
 */
export async function garantirTemaDoDia(lang: string, dayStr: string): Promise<TemaDoDia | null> {
  const cacheado = await getDayTheme(dayStr);
  if (cacheado) return temaDoDiaDaManchete(cacheado);
  const escolhido = escolherTemaDoDia(await assuntosDoDia(lang));
  if (!escolhido) return null;
  await setDayTheme(dayStr, escolhido.topic);
  // Corrida: outro chamador gravou primeiro? Segue o que foi gravado (1º vence).
  const agora = await getDayTheme(dayStr);
  if (agora && agora !== escolhido.topic) return temaDoDiaDaManchete(agora);
  return escolhido;
}

/**
 * O bloco que entra no prompt QUANDO a polêmica É o tema da reel (ordem do dono). Não
 * é mais oferta: a peça é SOBRE a polêmica de hoje, com a NOSSA voz. Guardas de voz
 * que ficam inteiras: o fato externo dá a cena; a verdade continua sendo da marca;
 * provocar pela IDEIA — jamais julgar, expor ou ridicularizar quem for citado.
 */
export function diretrizDoTemaDoDia(tema: TemaDoDia): string {
  return [
    "O TEMA DE HOJE É A POLÊMICA DO DIA — a peça é SOBRE isto, com a NOSSA voz:",
    `  · ${tema.topic}`,
    ...(tema.resumo ? [`  · ${tema.resumo}`] : []),
    "Esta conversa JÁ está acontecendo lá fora — a peça abre nela e a devolve com a",
    "nossa verdade. O fato externo dá a cena; a tese continua sendo da marca.",
    "Nunca julgar, expor ou ridicularizar quem for citado — a provocação é pela IDEIA.",
  ].join("\n");
}
