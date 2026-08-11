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
