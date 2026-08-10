// ─── O VERIFICADOR DE FORMATO — nenhuma peça sai fora do molde ───────────────
// POR QUE EXISTE (2026-08-09, ordem do dono: "inclua um verificador que cada peça que saia
// passe por ele e que todas estejam no formato que definimos hoje").
//
// As regras de formato entraram no motor às 22:53 e 22:57 UTC. Às 23:19 — vinte e dois minutos
// DEPOIS — o motor gerou o Reel Nº 362 **sem molde nenhum**, e quem percebeu foi o dono, não eu.
// A causa era o cache da copy (24h, versão não subida), já corrigida em `content-cache.ts` v5.
// Mas a lição maior é outra: **regra escrita no prompt é pedido, não garantia.** O redator é um
// modelo de linguagem; ele obedece quase sempre, e "quase sempre" não é o que o dono comprou.
// Este arquivo é a diferença entre pedir e exigir.
//
// COMO ELE DECIDE — de propósito, em dois níveis:
//   · BLOQUEIA (regenerar e, persistindo, não publicar) só o que é **objetivo e verificável**:
//     o formato carimbado e o título-molde. Não há juízo estético aqui.
//   · AVISA (registra, deixa passar) o que depende de leitura — abrir pela dor, a tese fora da
//     primeira tela. Falso positivo aí custaria uma vaga, e vaga perdida é pior que peça imperfeita.
// Essa separação não é covardia: é a mesma régua do `lang-guard`, que bloqueia palavra do idioma
// errado (objetivo) e não bloqueia "texto pouco natural" (leitura).
//
// ⚠️ TEMA-CONVICÇÃO É EXCEÇÃO, e tem de ser: nesses temas a frase do autor sai **verbatim** na
// primeira tela — o molde CEDE à âncora (a verdade manda na forma). Verificar molde ali reprovaria
// justamente a peça mais fiel à marca.

import type { Formato } from "./formatos-peca";

export type Gravidade = "bloqueia" | "avisa";

export interface Achado {
  regra: string;
  gravidade: Gravidade;
  detalhe: string;
}

export interface PecaParaConferir {
  /** o esqueleto que esta peça deveria seguir */
  formato?: Formato | null;
  /** a primeira linha — manchete do carrossel / capa do Reel */
  titulo?: string | null;
  /** as telas, em ordem. A [0] é a primeira que a pessoa lê. */
  slides?: (string | null | undefined)[] | null;
  /** tema-convicção: a âncora do autor manda e o molde cede */
  temaLiteral?: boolean;
  /** idioma da peça — muda as palavras de 2ª pessoa */
  lang?: string;
}

/** As partes FIXAS de um molde: o que sobra quando se tiram as lacunas. */
export function partesFixasDoMolde(molde: string): string[] {
  return molde
    .split("___")
    // tira aspas, pontuação e TRAVESSÃO das bordas — «___» — RESPONDENDO tem de virar
    // só "RESPONDENDO", senão o travessão vira parte "fixa" e nenhum título casaria
    .map((p) => p.trim().replace(/^[«»"'\s:,.!?¡¿—–-]+|[«»"'\s:,.!?¡¿—–-]+$/g, ""))
    .filter((p) => p.length >= 3);
}

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/** A 2ª pessoa — o sinal de que a peça fala COM alguém, não SOBRE algo. */
const SEGUNDA_PESSOA: Record<string, RegExp> = {
  br: /\b(voce|vc|te|teu|tua|seu|sua|contigo|ti)\b/,
  es: /\b(tu|te|ti|tus|contigo|usted)\b/,
};

export function conferirFormato(p: PecaParaConferir): Achado[] {
  const achados: Achado[] = [];
  const titulo = (p.titulo || "").trim();
  const slides = (p.slides || []).map((s) => (s || "").trim()).filter(Boolean);
  const lang = p.lang === "es" ? "es" : "br";

  // 1) FORMATO CARIMBADO — sem isto não há placar, não há lapidação, e a peça é
  //    incomparável com as outras. É a base de tudo, então bloqueia.
  if (!p.formato || !p.formato.id) {
    achados.push({
      regra: "formato-carimbado",
      gravidade: "bloqueia",
      detalhe: "a peça saiu sem declarar qual esqueleto usou — sem isso não há como medir nem repetir",
    });
    return achados; // sem formato, as regras seguintes não têm contra o que conferir
  }

  // 2) PRIMEIRA LINHA EXISTE — a capa tem de funcionar parada, sem a peça rodar.
  if (!titulo) {
    achados.push({
      regra: "texto-no-primeiro-quadro",
      gravidade: "bloqueia",
      detalhe: "a peça saiu sem primeira linha — não há o que ler no primeiro quadro",
    });
  }

  // 3) TÍTULO-MOLDE — a forma fixa que faz reconhecer antes de entender.
  //    Pulado em tema-convicção: ali a âncora do autor manda.
  if (titulo && !p.temaLiteral) {
    const fixas = partesFixasDoMolde(p.formato.tituloMolde);
    const t = norm(titulo);
    const bate = fixas.length === 0 || fixas.some((f) => t.includes(norm(f)));
    if (!bate) {
      achados.push({
        regra: "titulo-molde",
        gravidade: "bloqueia",
        detalhe: `a primeira linha não segue a forma «${p.formato.tituloMolde}» do formato ${p.formato.nome}`,
      });
    }
  }

  // 4) CONFLITO ANTES DA TESE — a tela 1 fala COM a pessoa. Avisa, não bloqueia:
  //    depende de leitura, e reprovar peça boa custa uma vaga.
  const primeira = slides[0] || titulo;
  if (primeira && !p.temaLiteral && !SEGUNDA_PESSOA[lang].test(norm(primeira))) {
    achados.push({
      regra: "conflito-antes-da-tese",
      gravidade: "avisa",
      detalhe: "a primeira tela não fala em segunda pessoa — provavelmente abriu pela conclusão, não pela dor",
    });
  }

  // 5) A VENDA NÃO OCUPA O LUGAR DO CONTEÚDO — o convite é a ÚLTIMA batida, nunca a primeira.
  //    Esta é objetiva (são expressões de oferta) e é o defeito mais caro que medimos:
  //    @salesadestramento tem 286 mil seguidores e entrega 2 a 8 mil views desde que virou anúncio.
  const CONVITE = /\b(link na bio|link en la bio|comenta|comente|comenta ya|arrasta pra cima|clique aqui|clica no link|compre|compra ya|assine|suscr[ií]bete|inscreva-se)\b/;
  if (primeira && CONVITE.test(norm(primeira))) {
    achados.push({
      regra: "venda-dentro-do-molde",
      gravidade: "bloqueia",
      detalhe: "a primeira tela é convite/oferta — a venda entra como última batida, nunca no lugar do conteúdo",
    });
  }

  return achados;
}

/** Reprova a peça? Só o que é objetivo derruba. */
export function reprovado(achados: Achado[]): boolean {
  return achados.some((a) => a.gravidade === "bloqueia");
}

/** Uma linha para o registro — quem lê o log amanhã tem de entender sem abrir código. */
export function resumoDoVeredito(achados: Achado[]): string {
  if (!achados.length) return "formato ✓ — a peça está no molde";
  const b = achados.filter((a) => a.gravidade === "bloqueia");
  const a = achados.filter((x) => x.gravidade === "avisa");
  const partes: string[] = [];
  if (b.length) partes.push(`REPROVADA: ${b.map((x) => x.regra).join(", ")}`);
  if (a.length) partes.push(`avisos: ${a.map((x) => x.regra).join(", ")}`);
  return partes.join(" · ");
}
