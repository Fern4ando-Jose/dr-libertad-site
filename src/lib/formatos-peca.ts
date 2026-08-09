// ─── O REDATOR DA MARCA: formato + conflito ──────────────────────────────────
// POR QUE EXISTE (2026-08-09): o motor escrevia cada peça LIVRE — mesma voz, arquitetura
// diferente a cada post. 4 peças/dia × 2 idiomas, todas diferentes, nenhuma comparável: é
// impossível saber o que funciona. O estudo da referência (1 milhão de seguidores depois de
// 2 anos travada em mil) diz o oposto, e é a frase dela: **formato = visual fixo + estrutura
// de roteiro fixa, repetidos**. Não é tema, não é estilo — é o mesmo esqueleto, peça após
// peça, até virar assinatura.
//
// A segunda descoberta, que ela chama de "um dos maiores segredos" e repete 53 vezes nas
// aulas: **CONFLITO UNIVERSAL** — nomear a dor que a pessoa JÁ sente antes de entregar a
// tese. Sem isso a peça abre entregando resposta a uma pergunta que ninguém fez.
//
// Fonte única do estudo: `.claude\marca\dr-libertad\BIBLIOTECA-FORMATOS.md` §2.2.
// Os formatos que exigiriam rosto (dinamismo, diálogo, telepatia, conversa de bar, the
// office) estão FORA por trava do dono: ele não aparece.

export type FormatoId =
  | "palestrinha"
  | "narrado"
  | "analogia"
  | "comparacao"
  | "polemica"
  | "caixinha-polemica"
  | "tela-verde";

export interface Formato {
  id: FormatoId;
  nome: string;
  /** Onde este esqueleto funciona. */
  midia: ("carrossel" | "reel")[];
  /** A instrução que entra no prompt — em português, imperativa, sem jargão. */
  roteiro: string;
}

export const FORMATOS: Formato[] = [
  {
    id: "palestrinha",
    nome: "Palestrinha",
    midia: ["carrossel", "reel"],
    roteiro:
      "Estruture como uma MINI-PALESTRA de uma ideia só: abre nomeando o conflito, desenvolve UM argumento em três passos encadeados (cada tela puxa a seguinte) e fecha com a virada. Nada de lista solta — é raciocínio contínuo, como quem convence alguém numa conversa.",
  },
  {
    id: "narrado",
    nome: "Narrado",
    midia: ["reel"],
    roteiro:
      "Escreva para ser OUVIDO: frases curtas, sujeito antes do verbo, zero subordinada longa. O texto na tela repete só a palavra-chave de cada frase, nunca a frase inteira. Abre nomeando o conflito em voz alta.",
  },
  {
    id: "analogia",
    nome: "Analogia",
    midia: ["carrossel", "reel"],
    roteiro:
      "Ancore a ideia numa IMAGEM CONCRETA do mundo físico (a gaiola sem grade, a corrente de ouro, a porta destrancada) e mantenha essa mesma imagem até o fim — a cada tela ela avança um passo. Proibido trocar de metáfora no meio.",
  },
  {
    id: "comparacao",
    nome: "Comparação",
    midia: ["carrossel", "reel"],
    roteiro:
      "Monte em DOIS LADOS: o que a pessoa faz hoje × o que fazer. Cada tela é um par (isto × aquilo), sempre na mesma ordem. A antítese é a espinha da peça, não um enfeite no fim.",
  },
  {
    id: "polemica",
    nome: "Polêmica",
    midia: ["carrossel", "reel"],
    roteiro:
      "Abra com a afirmação que a maioria vai querer contestar — a tese incômoda, dita sem rodeio na primeira tela. As telas seguintes SUSTENTAM com argumento, não recuam. Provoca pela IDEIA, nunca por desprezo a pessoas ou grupos.",
  },
  {
    id: "caixinha-polemica",
    nome: "Caixinha polêmica",
    midia: ["carrossel", "reel"],
    roteiro:
      "Abra citando a objeção mais comum contra a tese, entre aspas, como se fosse um comentário recebido. Depois responda a ela ponto a ponto. O conflito já vem embutido na citação.",
  },
  {
    id: "tela-verde",
    nome: "Tela verde",
    midia: ["reel"],
    roteiro:
      "A peça comenta um FATO EXTERNO (um dado, uma manchete, um número) que aparece atrás do texto. Abre com o fato, nomeia por que ele incomoda e vira para a tese da marca.",
  },
];

/** Só os formatos que servem à mídia pedida. */
export function formatosPara(midia: "carrossel" | "reel"): Formato[] {
  return FORMATOS.filter((f) => f.midia.includes(midia));
}

/**
 * Sorteia o formato de forma DETERMINÍSTICA por (tópico, dia) — sem o idioma, para ES e BR
 * da mesma vaga saírem no MESMO esqueleto. `Math.random` aqui faria o par divergir.
 */
export function formatoDaVaga(midia: "carrossel" | "reel", chave: string): Formato {
  const lista = formatosPara(midia);
  let h = 5381;
  for (let i = 0; i < chave.length; i++) h = ((h << 5) + h + chave.charCodeAt(i)) >>> 0;
  return lista[h % lista.length];
}

/**
 * O bloco que entra no prompt do redator. Traz o esqueleto do formato + a exigência de
 * conflito. Vai ANTES das regras de voz — o formato manda na arquitetura, a voz manda na frase.
 */
export function diretrizDoRedator(f: Formato): string {
  return [
    `FORMATO OBRIGATÓRIO DESTA PEÇA: ${f.nome.toUpperCase()}.`,
    f.roteiro,
    "",
    "CONFLITO ANTES DA TESE (regra dura, vale para qualquer formato):",
    "A PRIMEIRA tela nomeia a DOR que o leitor já sente — em segunda pessoa, no presente, uma",
    "situação concreta que ele reconhece em si. Só a partir da segunda tela vem a tese.",
    "Abrir com a conclusão é responder a uma pergunta que ninguém fez: a peça é descartada no dedo.",
    "O conflito NÃO é uma pergunta retórica genérica — é o atrito específico deste tema.",
  ].join("\n");
}
