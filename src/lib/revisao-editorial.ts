// ─── O REVISOR — a etapa que NÃO existia ─────────────────────────────────────
// POR QUE EXISTE (ordem do dono, 2026-08-09): *"vai passar por um revisor antes de subir
// para o instagram e o primeiro revisor vai ser após a criação do texto"*. Até aqui a peça
// saía da máquina direto para o feed: uma passada do modelo mais barato decidia título,
// telas, chamada e legenda, e o primeiro humano a ver era o dono — no feed. Os defeitos de
// 09/08 (frase-verdade encurtada na capa, palavra solta no rodapé, peça sem conflito)
// passaram por AUSÊNCIA DE REVISÃO, não por falta de regra.
//
// ⚠️ A diferença entre "o agente existe" e "o agente funciona": os cargos da casa
// (`.claude/agents/*.md`) rodam no Claude Code, na máquina do dono. O que publica é o SITE,
// na nuvem — ele nunca leu aqueles arquivos. Ligar um cargo na linha de produção significa
// **executar o crivo dele aqui**, a cada peça. É o que este módulo faz, com as lentes dos
// cargos que já existiam parados: guardião da voz · estrategista de atenção · redator da
// marca. (O curador de imagens tem módulo próprio; o analista de métricas age depois.)
//
// DESENHO DE CUSTO: UMA chamada só, com as 3 lentes juntas, no modelo que já é usado —
// ~US$ 0,004 por peça. Três chamadas separadas triplicariam a conta sem melhorar o veredito.

import { logSpend, type Automation } from "@/lib/spend";
import { chamarIATexto, custoIATexto, temChaveIATexto } from "@/lib/ia-texto";

export interface AchadoRevisao {
  lente: "voz" | "atencao" | "formato";
  gravidade: "reprova" | "ajuste";
  oQue: string;
}

export interface VeredictoRevisao {
  aprovado: boolean;
  achados: AchadoRevisao[];
  /** null quando a revisão não pôde rodar (sem chave, erro de rede) — fail-open. */
  rodou: boolean;
}

export interface PecaParaRevisar {
  postTitle: string;
  slides: string[];
  cta: string;
  caption?: string;
}

const MODELO = "claude-haiku-4-5-20251001";

function prompt(p: PecaParaRevisar, formatoNome: string, ancora: string | null, lang: string): string {
  const idioma = lang === "es" ? "espanhol" : "português do Brasil";
  return `Você é o revisor de uma marca. A peça abaixo vai ao Instagram em ${idioma} daqui a instantes.
Sua função é REPROVAR o que não serve. Não elogie, não reescreva: aponte.

PEÇA
título: ${p.postTitle}
telas:
${p.slides.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
chamada final: ${p.cta}

Aplique TRÊS crivos, nesta ordem:

1. VOZ DA MARCA — a marca é direta, corajosa, diz verdades incômodas e não teme a polêmica.
   REPROVE se o texto: suavizar a verdade com eufemismo; soar a "conteúdo motivacional" genérico;
   usar as muletas de IA ("em um mundo cada vez mais", "não é apenas... é", "a verdade é que");
   terminar em conselho morno; ou pedir desculpa pela própria tese.

2. ATENÇÃO — a primeira tela decide se alguém para o dedo.
   REPROVE se a primeira tela: não nomear um CONFLITO concreto que o leitor já vive; abrir com a
   conclusão em vez da dor; for pergunta retórica genérica; ou precisar de contexto para ser entendida.
   ${ancora ? `A frase-verdade do dono é: "${ancora}". REPROVE se ela aparecer cortada, encurtada ou parafraseada.` : ""}

3. FORMATO — esta peça devia seguir o esqueleto ${formatoNome.toUpperCase()}.
   REPROVE se as telas não seguirem esse esqueleto, se cada tela for um pensamento solto sem
   encadeamento, ou se a última tela não fechar o que a primeira abriu.

Responda SÓ com JSON, sem cercas de código:
{"aprovado": true|false, "achados": [{"lente":"voz"|"atencao"|"formato","gravidade":"reprova"|"ajuste","oQue":"<uma frase objetiva do que corrigir>"}]}
"aprovado" é false se houver QUALQUER achado com gravidade "reprova". Máximo 5 achados.`;
}

export async function revisarTexto(
  peca: PecaParaRevisar,
  opts: { formatoNome: string; ancora?: string | null; lang: string; automation: Automation }
): Promise<VeredictoRevisao> {
  // FAIL-OPEN: sem chave ou com erro, a revisão não bloqueia a publicação. Um revisor que
  // derruba a linha quando ele próprio falha troca "peça ruim" por "peça nenhuma".
  // TEXTO via ia-texto.ts (2026-08-16): DeepSeek quando há DEEPSEEK_API_KEY; senão Anthropic.
  if (!temChaveIATexto()) return { aprovado: true, achados: [], rodou: false };

  try {
    const r = await chamarIATexto(
      {
        model: MODELO,
        max_tokens: 700,
        messages: [{ role: "user", content: prompt(peca, opts.formatoNome, opts.ancora ?? null, opts.lang) }],
      },
      { timeoutMs: 45000 }
    );
    if (!r.ok) return { aprovado: true, achados: [], rodou: false };
    const data = r.dados;

    await logSpend({
      automation: opts.automation,
      platform: r.provedor,
      operation: "revisao-editorial",
      model: r.modelo,
      units: (data?.usage?.input_tokens ?? 0) + (data?.usage?.output_tokens ?? 0),
      costUsd: custoIATexto(r.provedor, r.modelo, data?.usage),
    });

    const txt: string = data?.content?.[0]?.text ?? "";
    const bruto = txt.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const j = JSON.parse(bruto);
    const achados: AchadoRevisao[] = Array.isArray(j?.achados)
      ? j.achados
          .filter((a: unknown): a is AchadoRevisao => !!a && typeof (a as AchadoRevisao).oQue === "string")
          .slice(0, 5)
      : [];
    // O veredito NÃO é a palavra "aprovado" do modelo: é derivado dos achados. Modelo que
    // lista uma reprovação e diz "aprovado: true" no mesmo fôlego já foi visto.
    const reprovou = achados.some((a) => a.gravidade === "reprova");
    return { aprovado: !reprovou, achados, rodou: true };
  } catch {
    return { aprovado: true, achados: [], rodou: false };
  }
}

/** O bloco de correção que volta ao redator na regeneração. */
export function instrucaoDeCorrecao(v: VeredictoRevisao): string {
  if (!v.achados.length) return "";
  return [
    "O REVISOR REPROVOU a versão anterior. Corrija EXATAMENTE isto, sem mexer no resto:",
    ...v.achados.map((a) => `- [${a.lente}] ${a.oQue}`),
  ].join("\n");
}
