// ─── Capa do ACERVO — fundo de imagem com custo ZERO ─────────────────────────
// POR QUE EXISTE (2026-08-09): a capa do carrossel só sabia nascer de geração por IA
// (`illustration.ts`, fal.ai ≈ US$0,16/vaga), e o carrossel NÃO publica sem capa. Com o
// teto de gasto zerado pelo dono em 05/08, isso parou as DUAS contas por 4 dias — a
// medição está no log do workflow: `{"blocked":true,"reason":"Orçamento diário ig-posts
// estourado (gasto US$0.000 + est US$0.200 > teto US$0.00)"}`. Freio de dinheiro
// derrubando trabalho que podia ser de graça é a lição `freio-de-gasto-derruba-em-
// cascata-o-trabalho-gratuito`.
//
// A saída já estava dentro de casa: FOOTAGE_LIBRARY tem 69 mídias curadas à mão por
// pilar, e CADA UMA carrega um `poster` — uma FOTO pronta do Pexels, licença livre. Os
// pilares dela são os MESMOS 6 de /api/og (freedom · dopamine · anxiety · network · self
// · mind), então o casamento é direto, sem tabela de tradução.
//
// Não substitui a ilustração por IA: é o degrau de baixo. Havendo orçamento, a IA continua
// sendo a primeira escolha (a arte é autoral). Sem orçamento, a marca publica com foto em
// vez de não publicar.

import { FOOTAGE_LIBRARY } from "@/lib/footage-library";
import { isPhotoUrl } from "@/lib/footage-media";

export type Pilar = keyof typeof FOOTAGE_LIBRARY;

/** Hash estável (djb2). Determinístico entre processos — `Math.random` orfanaria o par ES+BR. */
function semente(texto: string): number {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  return h;
}

/** Todas as fotos utilizáveis de um pilar (poster do clipe, ou a própria url quando já é foto). */
export function fotosDoPilar(cat: string): string[] {
  const lista = FOOTAGE_LIBRARY[cat as Pilar] ?? [];
  const fotos: string[] = [];
  for (const c of lista) {
    if (c.poster) fotos.push(c.poster);
    else if (isPhotoUrl(c.url)) fotos.push(c.url);
  }
  return fotos;
}

/**
 * Escolhe a foto de fundo da capa. Determinística por `chave` — passe algo que ES e BR do
 * MESMO tema compartilhem (o tópico + o dia), nunca o idioma: senão o par sai com capas
 * diferentes e o feed perde a paridade que o dono exige.
 *
 * Devolve `null` quando o pilar não tem foto — quem chama decide o que fazer (nunca
 * inventar uma imagem de outro pilar: o sujeito da imagem tem que ser o sujeito da frase).
 */
export function capaDoAcervo(cat: string, chave: string): string | null {
  const fotos = fotosDoPilar(cat);
  if (!fotos.length) return null;
  return fotos[semente(chave) % fotos.length];
}
