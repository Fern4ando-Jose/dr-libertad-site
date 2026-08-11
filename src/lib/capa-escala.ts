// ─── A CONTA DA MANCHETE: encher a largura sem estourar a altura ──────────────
// POR QUE EXISTE (2026-08-11): a manchete ocupava 74–76% da largura do quadro; as 10
// contas de referência do nicho ficam entre 85% e 95%. Letra pequena no feed é letra
// que ninguém lê no dedo — e o primeiro segundo é onde a pessoa decide.
//
// A conta nasceu dentro de `src/app/api/og/route.tsx` (a capa de IMAGEM) em 09/08 e
// vivia SÓ lá. O Reel — que é a peça de produção do Instagram — continuava com tamanho
// FIXO (108 na capa, 88 nos insights) e `maxWidth` menor que a largura útil: frase curta
// saía minúscula. Aqui a conta vira fonte única, para os dois motores medirem igual.
//
// ⚠️ É ESTIMATIVA, não medição de pixel: o navegador/Remotion é quem sabe a largura real
// de cada glifo. Por isso o fator de largura média entra como PARÂMETRO — cada fonte tem
// o seu, e o valor só se troca depois de MEDIR num quadro renderizado de verdade.

/**
 * Largura média de um caractere, em fração do tamanho da fonte.
 * `og` = a fonte da capa de imagem (calibrada em 09/08, não mexer sem medir de novo).
 * `anton` = a condensada da frase no vídeo — mede ~30% mais estreita que a do OG.
 */
export const FATOR_LARGURA = {
  og: 0.66,
  anton: 0.46,
} as const;

/**
 * O tamanho de fonte que faz o texto ENCHER a largura disponível sem passar da altura
 * reservada nem quebrar uma palavra longa ao meio.
 *
 * @param maxWidth   largura útil em px (o quadro MENOS as margens laterais)
 * @param maxLines   em quantas linhas o texto pode se espalhar
 * @param teto       tamanho máximo (uma frase de 3 palavras não vira outdoor)
 * @param maxAlturaPx altura reservada; 0 = sem limite de altura
 * @param fator      largura média por caractere (ver FATOR_LARGURA)
 */
export function fitTitleFill(
  text: string,
  maxWidth: number,
  maxLines = 5,
  teto = 210,
  maxAlturaPx = 0,
  fator: number = FATOR_LARGURA.og,
): number {
  const L = Math.max(text.replace(/\s+/g, " ").trim().length, 1);
  const longest = text.split(/\s+/).reduce((m, w) => Math.max(m, w.length), 1);
  // A palavra mais longa não pode estourar a linha sozinha…
  const byWord = Math.floor(maxWidth / longest / fator);
  // …e o texto inteiro tem de caber no número de linhas permitido.
  const porLinhas = Math.floor((maxWidth * maxLines) / (L * fator));
  let size = Math.max(40, Math.min(teto, byWord, porLinhas));
  if (maxAlturaPx > 0) {
    const linhas = (f: number) => Math.ceil(L / Math.max(1, Math.floor(maxWidth / (f * fator))));
    while (size > 40 && linhas(size) * size * 1.02 > maxAlturaPx) size -= 2;
  }
  return Math.max(40, size);
}

/**
 * Quanto da largura ÚTIL o texto deve ocupar com esse tamanho — de 0 a 1. É a medida que
 * a régua das 10 contas cobra. Serve para o teste travar o piso; a prova final continua
 * sendo medir o quadro publicado.
 */
export function preenchimentoEstimado(
  text: string,
  maxWidth: number,
  size: number,
  fator: number = FATOR_LARGURA.og,
): number {
  const L = Math.max(text.replace(/\s+/g, " ").trim().length, 1);
  const porLinha = Math.max(1, Math.floor(maxWidth / (size * fator)));
  const linhas = Math.max(1, Math.ceil(L / porLinha));
  return Math.min(1, ((L / linhas) * fator * size) / maxWidth);
}

// ─── A geometria do REEL (1080×1920) ──────────────────────────────────────────
// A margem lateral era 90px de cada lado → largura útil 900px, ou seja **83,3% do
// quadro no melhor caso possível**: com 90px de margem a régua de 85% era inalcançável
// mesmo com a frase perfeita. Com 40px a largura útil vai a 1000px (92,6% do quadro) e
// a faixa de 85–96% passa a existir.
export const REEL_W = 1080;
export const REEL_MARGEM_LATERAL = 40;
export const REEL_LARGURA_UTIL = REEL_W - 2 * REEL_MARGEM_LATERAL; // 1000

// ─── ONDE O TEXTO FICA ────────────────────────────────────────────────────────
// ⛔ 2026-08-11 (ordem do dono, vendo o próprio grid): *"o texto do reel deveria descer
// igual ao do carrossel"*. O carrossel ancora a manchete EMBAIXO, logo acima do @handle
// (`api/og/route.tsx`: coluna com `space-between` — marca no topo, frase + handle na
// base), e no grid do perfil o Reel com texto no alto destoava dos vizinhos.
//
// Eu havia subido o texto para o miolo por um motivo real — a coluna de curtir/comentar/
// enviar que o Instagram desenha na DIREITA, de y≈1180 a y≈1720. Disse isso a ele; ele
// viu e decidiu pela coerência do perfil, que é o que a pessoa julga primeiro. Registrado
// aqui para a próxima sessão não "corrigir" de volta achando que foi descuido.
export const REEL_TEXTO_BOTTOM = 380; // base do bloco: y = 1920 − 380 = 1540, acima do @
export const REEL_ALTURA_MANCHETE = 740;

/** Espaço entre palavras, em fração do corpo da fonte (o `marginRight` do KineticText). */
export const ESPACO_ENTRE_PALAVRAS = 0.26;
/** Entrelinha do bloco de texto do Reel (o `lineHeight` do KineticText). */
export const ENTRELINHA = 1.12;

export interface Quebra {
  linhas: string[];
  /** Largura da linha mais LONGA, em px — é ela que define a ocupação do quadro. */
  larguraMaxima: number;
  altura: number;
}

/**
 * Simula a quebra de linha do navegador: gulosa, POR PALAVRA.
 *
 * ⛔ 2026-08-11 — É AQUI QUE A PRIMEIRA TENTATIVA ERROU, e o erro só apareceu quando o
 * quadro foi renderizado de verdade. A conta anterior dividia o texto por CARACTERE e
 * previa 88% de ocupação; medido no quadro, deu **69%**. O motivo é simples e some numa
 * estimativa: o navegador não corta palavra ao meio. "Ninguém te prendeu:" não cabia na
 * linha, então a linha ficou com "Ninguém te" e sobrou um terço do quadro vazio à direita
 * — com o corpo de letra no máximo. Corpo grande e linha curta é o pior dos dois mundos.
 */
export function quebrarPorPalavra(text: string, size: number, maxWidth: number, fator: number): Quebra {
  const palavras = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const espaco = ESPACO_ENTRE_PALAVRAS * size;
  // ⚠️ CADA palavra carrega o seu espaço à direita — inclusive a ÚLTIMA da linha. No
  // `KineticText` o espaço é `marginRight` em todo pedaço, e o navegador soma essa margem
  // ao decidir se a próxima palavra cabe. Modelar o espaço só ENTRE palavras fazia a conta
  // acreditar que cabia mais uma, escolher um corpo pequeno para "aproveitar" essa palavra
  // extra — e o navegador quebrava assim mesmo, deixando a linha curta com letra miúda.
  // Medido no quadro: previsto 90%, entregue 72%.
  const custo = (w: string) => w.length * fator * size + espaco;
  const linhas: string[] = [];
  const larguras: number[] = [];
  let atual = "";
  let ocupado = 0; // com o espaço à direita incluído
  for (const p of palavras) {
    const c = custo(p);
    if (!atual) {
      atual = p;
      ocupado = c;
    } else if (ocupado + c <= maxWidth) {
      atual += ` ${p}`;
      ocupado += c;
    } else {
      linhas.push(atual);
      larguras.push(ocupado - espaco); // a tinta visível não inclui a margem final
      atual = p;
      ocupado = c;
    }
  }
  if (atual) {
    linhas.push(atual);
    larguras.push(ocupado - espaco);
  }
  return {
    linhas,
    larguraMaxima: larguras.length ? Math.max(...larguras) : 0,
    altura: linhas.length * size * ENTRELINHA,
  };
}

/**
 * A régua das 10 contas de referência: a letra ocupa de 85% a 95% da largura do quadro.
 *
 * ⚠️ Este é o alvo da ESTIMATIVA, e a estimativa é ~4% otimista: no quadro renderizado,
 * 88,9% previstos entregaram **85,0% reais** (a largura de cada glifo varia — o fator
 * médio medido oscila entre 0,438 e 0,459 conforme as letras da frase). Subir este número
 * para "compensar" foi TENTADO e PIOROU: com 0,89 nenhum corpo alcançava o alvo, a busca
 * caía no plano B e a ocupação real desabava para 71,4%. Alvo inalcançável não é rigor, é
 * desligar a regra. Medir com `node scripts/medir-manchete.mjs` antes de tocar aqui.
 */
export const OCUPACAO_ALVO = 0.85;

/**
 * O MAIOR corpo de letra que ainda cumpre a régua de ocupação, dentro da altura livre.
 *
 * Duas armadilhas, as duas descobertas medindo o quadro renderizado e não a estimativa:
 *
 *   1. `fitTitleFill` (a conta da capa de imagem) escolhe o maior corpo que CABE — e com
 *      quebra por palavra "maior" não é "mais cheio": subir o corpo empurra uma palavra
 *      inteira para a linha seguinte e ENCOLHE a linha mais longa. Corpo 170 deu 69% de
 *      ocupação onde corpo 116 dá 90%.
 *   2. Só maximizar a ocupação leva ao extremo oposto: o corpo despenca para 56–84px
 *      (letra miúda num quadro de 1080) porque frases longas "encaixam" melhor pequenas.
 *      Ocupar 90% com letra minúscula não é o que a referência faz.
 *
 * Então o critério é: percorrer do maior corpo para o menor e ficar com o PRIMEIRO que
 * atinge o alvo. Só se nenhum atingir é que vale o de maior ocupação — assim uma frase
 * impossível degrada para o melhor disponível em vez de sair fora da régua sem aviso.
 */
export function tamanhoQueEnche(
  text: string,
  maxWidth: number,
  maxAlturaPx: number,
  teto = 190,
  piso = 56,
  fator: number = FATOR_LARGURA.anton,
  alvoDoQuadro: number = OCUPACAO_ALVO,
  quadro: number = REEL_W,
): number {
  const alvo = (alvoDoQuadro * quadro) / maxWidth;
  let melhor = piso;
  let melhorEnche = -1;
  for (let s = teto; s >= piso; s -= 2) {
    const q = quebrarPorPalavra(text, s, maxWidth, fator);
    // Palavra que não cabe sozinha na linha vaza para fora do quadro.
    if (q.larguraMaxima > maxWidth) continue;
    if (maxAlturaPx > 0 && q.altura > maxAlturaPx) continue;
    const enche = q.larguraMaxima / maxWidth;
    if (enche >= alvo) return s; // o maior corpo que cumpre a régua
    if (enche > melhorEnche + 1e-9) {
      melhorEnche = enche;
      melhor = s;
    }
  }
  return melhor;
}

/** Quanto da largura do QUADRO a frase ocupa com esse corpo — a régua das 10 contas. */
export function ocupacaoDoQuadro(text: string, size: number, maxWidth = REEL_LARGURA_UTIL, quadro = REEL_W): number {
  return quebrarPorPalavra(text, size, maxWidth, FATOR_LARGURA.anton).larguraMaxima / quadro;
}

/** O tamanho da manchete da CAPA do Reel. Fonte Anton, no miolo livre do quadro. */
export function tamanhoManchete(title: string): number {
  return tamanhoQueEnche(title, REEL_LARGURA_UTIL, REEL_ALTURA_MANCHETE, 190, 56);
}

/** O tamanho de cada insight do Reel — mesma largura útil, teto um pouco menor. */
export function tamanhoInsight(text: string): number {
  return tamanhoQueEnche(text, REEL_LARGURA_UTIL, REEL_ALTURA_MANCHETE, 170, 52);
}
