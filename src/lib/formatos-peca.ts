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

// ─── DELTA 2026-08-09 (ordem do dono: "aplique as mudanças, elas devem entrar agora") ───
// O estudo ganhou uma segunda fonte: os **8 perfis que a referência cita no próprio Reel**,
// lidos quadro a quadro do vídeo e medidos um a um (12 posts recentes de cada, com views,
// curtidas, comentários e duração). Levantamento em
// `Meus Projetos\Crescimento\DOSSIE-UNICO-Hanah-2026-08-09.html`.
//
// O que os 8 têm em comum e ainda faltava aqui:
//   · um **título-molde** repetido literalmente, que muda só o complemento;
//   · uma **assinatura fixa que não é o rosto** (emoji, frase ou número de série);
//   · o **gancho em três camadas** — fala, imagem e texto na tela apontando para o MESMO conflito;
//   · a venda **dentro** do molde, nunca no lugar dele.
//
// O contra-exemplo que justifica a última regra: @salesadestramento tem 286 mil seguidores e
// entrega 2 a 8 mil views por post desde que trocou o conteúdo pelo "comenta QUERO que eu
// mando o link" — menos de 3% dos próprios seguidores. @arthurpaek faz publicidade paga
// DENTRO do mesmo molde e bate 12,6 milhões.
//
// ⛔ REGRA DE PLATAFORMA (ordem do dono, 2026-08-09): **cada plataforma tem as suas regras de
// criação, separadas.** Este arquivo é o motor do INSTAGRAM (@dr.liberdad ES · @dr.liberdade.br
// BR) e carrega SÓ as regras de Instagram. A régua de YouTube Shorts (gancho entendível no
// mudo em 3 s, primeiro quadro claro e saturado, pergunta que se responde, anúncio do fim,
// progressão visível, virada do "mas") é de OUTRA fonte e de OUTRO motor — **não entra aqui**.
// Fonte-dona da separação: `.claude\marca\dr-libertad\REGRAS-POR-PLATAFORMA.md`.
// Misturar as duas já causou um erro registrado: régua de mercado apresentada como se fosse
// método da referência.

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
  /**
   * O TÍTULO-MOLDE do formato: a forma fixa da primeira linha, que se repete peça após peça
   * mudando só o complemento. É o que faz reconhecer antes de entender — nos 8 perfis medidos,
   * TODOS têm um ("COMO DANÇAR IGUAL O ___", "Diga para mim", "GAMBIGATO EP __").
   * ⚠️ Em tema-convicção (`literal: true`) a âncora do dono manda e este molde CEDE: a frase
   * dele sai verbatim. O molde é forma, nunca substitui a verdade.
   */
  tituloMolde: string;
}

export const FORMATOS: Formato[] = [
  {
    id: "palestrinha",
    nome: "Palestrinha",
    midia: ["carrossel", "reel"],
    roteiro:
      "Estruture como uma MINI-PALESTRA de uma ideia só: abre nomeando o conflito, desenvolve UM argumento em três passos encadeados (cada tela puxa a seguinte) e fecha com a virada. Nada de lista solta — é raciocínio contínuo, como quem convence alguém numa conversa.",
    tituloMolde: "NINGUÉM TE CONTOU QUE ___",
  },
  {
    id: "narrado",
    nome: "Narrado",
    midia: ["reel"],
    roteiro:
      "Escreva para ser OUVIDO: frases curtas, sujeito antes do verbo, zero subordinada longa. O texto na tela repete só a palavra-chave de cada frase, nunca a frase inteira. Abre nomeando o conflito em voz alta.",
    tituloMolde: "O QUE ACONTECE QUANDO ___",
  },
  {
    id: "analogia",
    nome: "Analogia",
    midia: ["carrossel", "reel"],
    roteiro:
      "Ancore a ideia numa IMAGEM CONCRETA do mundo físico (a gaiola sem grade, a corrente de ouro, a porta destrancada) e mantenha essa mesma imagem até o fim — a cada tela ela avança um passo. Proibido trocar de metáfora no meio.",
    tituloMolde: "___ É COMO ___",
  },
  {
    id: "comparacao",
    nome: "Comparação",
    midia: ["carrossel", "reel"],
    roteiro:
      "Monte em DOIS LADOS: o que a pessoa faz hoje × o que fazer. Cada tela é um par (isto × aquilo), sempre na mesma ordem. A antítese é a espinha da peça, não um enfeite no fim.",
    tituloMolde: "___ NÃO É ___",
  },
  {
    id: "polemica",
    nome: "Polêmica",
    midia: ["carrossel", "reel"],
    roteiro:
      "Abra com a afirmação que a maioria vai querer contestar — a tese incômoda, dita sem rodeio na primeira tela. As telas seguintes SUSTENTAM com argumento, não recuam. Provoca pela IDEIA, nunca por desprezo a pessoas ou grupos.",
    tituloMolde: "VOCÊ NÃO VAI GOSTAR: ___",
  },
  {
    id: "caixinha-polemica",
    nome: "Caixinha polêmica",
    midia: ["carrossel", "reel"],
    roteiro:
      "Abra citando a objeção mais comum contra a tese, entre aspas, como se fosse um comentário recebido. Depois responda a ela ponto a ponto. O conflito já vem embutido na citação.",
    tituloMolde: "«___» — RESPONDENDO",
  },
  {
    id: "tela-verde",
    nome: "Tela verde",
    midia: ["reel"],
    roteiro:
      "A peça comenta um FATO EXTERNO (um dado, uma manchete, um número) que aparece atrás do texto. Abre com o fato, nomeia por que ele incomoda e vira para a tese da marca.",
    tituloMolde: "O NÚMERO QUE NINGUÉM COMENTA: ___",
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
    "",
    "TÍTULO-MOLDE (a forma se repete, o assunto muda):",
    `A primeira linha segue a forma «${f.tituloMolde}», preenchendo o espaço com o que este tema pede.`,
    "É o que faz a peça ser reconhecida antes de ser entendida — a mesma forma, post após post.",
    "EXCEÇÃO ÚNICA: em tema-convicção, a frase do autor sai VERBATIM e o molde cede. A verdade",
    "manda na forma, nunca o contrário.",
    "",
    "GANCHO EM TRÊS CAMADAS — as três apontam para o MESMO conflito:",
    "1) a frase (o que se lê ou se ouve); 2) a imagem, escolhida para INTENSIFICAR o conflito, não",
    "para ilustrar o assunto; 3) o texto na tela, inteiro no PRIMEIRO quadro — a capa tem de",
    "funcionar parada, sem a peça rodar.",
    "Descrever cenário bonito que só decora é gancho de uma camada só: some no feed.",
    "",
    "A VENDA MORA DENTRO DO MOLDE — nunca no lugar dele:",
    "Se houver convite (livro, lista, link), ele entra como ÚLTIMA batida do mesmo esqueleto, com a",
    "mesma voz. Peça que troca o conteúdo pela oferta para de ser entregue: a referência medida tem",
    "286 mil seguidores e entrega 2 a 8 mil visualizações desde que virou anúncio.",
    "",
    "CARONA — ancore no que JÁ tem procura, quando houver:",
    "A pesquisa desta peça vem logo abaixo. Se ela trouxer um NOME PRÓPRIO, um NÚMERO ou uma DATA",
    "recente que caiba no tema sem forçar, ancore a PRIMEIRA batida nele — é audiência que já está",
    "procurando, e chega de graça. Não havendo nada que caiba, siga sem carona: forçar um nome que",
    "não tem a ver é pior do que não ter nenhum.",
    "A carona entra no CONFLITO, nunca na tese: o fato externo dá a cena; a verdade continua sendo",
    "nossa. E jamais julgar, expor ou ridicularizar a pessoa citada — a provocação é pela ideia.",
  ].join("\n");
}

/**
 * A CARONA (delta 2026-08-09) — o item que faltava do estudo dos 8 perfis.
 *
 * De onde veio: `@comodancar` tira os maiores números do perfil (3,4 mi · 1,7 mi · 705 mil)
 * ancorando a peça em quem JÁ está sendo procurado — Ronaldinho, Joelma, a Marciele do BBB —
 * enquanto a série sobre danças tradicionais, do mesmo perfil e mesmo capricho, fica num piso
 * estável de 87 a 117 mil. Mesma voz, mesmo formato: o que muda é a busca que já existe lá fora.
 *
 * O que esta função NÃO faz, de propósito: **não escolhe o tema**. A rotação dos 61 temas é
 * consolidada (saco de cartas, trava anti-duplicata, livro-razão) e não se mexe nela por causa
 * disto. A carona trabalha com o material de pesquisa que a peça JÁ recebe — é a versão honesta
 * do item, não a promessa grande.
 *
 * Função PURA: recebe o texto da pesquisa e devolve os ganchos aproveitáveis, para o prompt poder
 * cobrá-los explicitamente em vez de torcer para o redator reparar.
 */
export function ganchosDeCarona(pesquisa: string | null | undefined, max = 3): string[] {
  const txt = (pesquisa || "").trim();
  if (!txt) return [];

  const achados: string[] = [];
  const visto = new Set<string>();
  const guarda = (s: string) => {
    const limpo = s.trim().replace(/\s+/g, " ");
    const chave = limpo.toLowerCase();
    if (limpo.length < 3 || visto.has(chave)) return;
    visto.add(chave);
    achados.push(limpo);
  };

  // NOME PRÓPRIO: duas ou mais palavras capitalizadas seguidas (aceita acento e o "de/da/do"
  // do meio). Uma palavra só produziria lixo — todo início de frase é maiúsculo.
  const nome = /\b[A-ZÀ-Ý][a-zà-ÿ]{2,}(?:\s+(?:d[aeoi]s?|von|van)\s+[A-ZÀ-Ý][a-zà-ÿ]{2,}|\s+[A-ZÀ-Ý][a-zà-ÿ]{2,})+/g;
  for (const m of txt.matchAll(nome)) guarda(m[0]);

  // NÚMERO que vale citação: percentual, "N mil/milhões", ou valor com 4+ dígitos.
  const numero = /\b\d{1,3}(?:[.,]\d+)?\s?%|\b\d{1,3}(?:[.,]\d+)?\s+(?:mil|milh(?:ão|ões)|bilh(?:ão|ões))\b|\b\d{4,}\b/gi;
  for (const m of txt.matchAll(numero)) guarda(m[0]);

  // DATA recente: ano de 2020 em diante, ou mês por extenso com ano.
  const data = /\b(?:janeiro|fevereiro|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+de\s+20\d{2}\b|\b20[2-9]\d\b/gi;
  for (const m of txt.matchAll(data)) guarda(m[0]);

  return achados.slice(0, max);
}

/**
 * O bloco que entra no prompt DEPOIS da pesquisa. Vazio quando não há gancho — silêncio é melhor
 * que mandar o redator "usar a carona" sem ter nenhuma, que é como nasce nome inventado.
 */
export function diretrizDeCarona(pesquisa: string | null | undefined): string {
  const g = ganchosDeCarona(pesquisa);
  if (!g.length) return "";
  return [
    "CARONA DISPONÍVEL — a pesquisa acima trouxe isto, que já tem procura:",
    ...g.map((x) => `  · ${x}`),
    "Use UM deles na primeira batida SE couber no tema sem forçar. Não coube? Ignore esta lista —",
    "ela é oferta, não ordem.",
  ].join("\n");
}
