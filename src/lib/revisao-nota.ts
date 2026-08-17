// ─── A ESCALA 0–100 DO INSTAGRAM ─────────────────────────────────────────────
//
// POR QUE EXISTE (ordem do dono, 17/08/2026): *"todos eles devem ter uma escala de 0 a 100, e
// a peça que vai ao ar deve ter pelo menos 95% para seguir adiante"* — e, no mesmo dia:
// *"todas as plataformas devem ter os revisores"*.
//
// As outras sete redes da casa recebem isto de `.claude/lib/revisao/`. O Instagram publica
// **pelo site**, que roda na Vercel e **não enxerga a pasta `.claude/`** — mesma situação do
// dicionário de idioma e dos esqueletos de peça. Então aqui vive um ESPELHO verificado:
// `revisao-regras.json` é cópia da fonte, e `node .claude/lib/revisao/verificar-espelho.mjs`
// reprova se os dois divergirem. **Editar o número aqui não adianta** — edite a fonte.
//
// ⚠️ AUSÊNCIA NÃO É ZERO. Revisor que não pôde olhar devolve `nota: null` com `rodou: false`,
// e isso NUNCA é lido como 100 nem como 0. Zero é medição; ausência é ignorância.

import REGRAS from "@/lib/revisao-regras.json";

export type Gravidade = "reprova" | "ajuste";
export interface AchadoNota {
  gravidade: Gravidade;
  oQue: string;
  onde?: string;
}
export interface VeredictoNota {
  etapa: string;
  /** null = não consegui olhar. Nunca 0, nunca 100. */
  nota: number | null;
  rodou: boolean;
  /** Pode seguir para a etapa seguinte? */
  seguiu: boolean;
  achados: AchadoNota[];
  motivo?: string;
  custoUsd?: number;
  /** Etapa que não existe nesta peça (voz num carrossel, por exemplo). */
  naoSeAplica?: boolean;
  /** O que o revisor LEU em cada imagem, antes de julgar. É prova, não enfeite. */
  telas?: string[] | null;
}

export const CORTE = REGRAS.corte;
export const VOLTAS_POR_ETAPA = REGRAS.voltasPorEtapa;
export const MODELO_REVISOR = REGRAS.modeloRevisor;
export const MODELO_REVISOR_PRECO = REGRAS.modeloRevisorPreco;
export const CUSTO_ESTIMADO = REGRAS.custoEstimadoPorRevisaoUSD;

/**
 * A nota: 100 menos o peso dos achados.
 *
 * Um "reprova" custa 25 — derruba para 75, bem abaixo do corte: defeito grave não se compensa
 * com acerto em outro lugar. Um "ajuste" custa 5 e, sozinho, **passa no limite** (95), porque
 * ajuste é por definição o defeito menor que não impede o ar; peso maior faria o revisor
 * contradizer a própria régua e mandar refazer peça publicável. **Dois** ajustes reprovam.
 */
export function notaDe(achados: AchadoNota[]): number {
  const total = (achados || []).reduce(
    (s, a) => s + (a?.gravidade === "reprova" ? REGRAS.pesos.reprova : REGRAS.pesos.ajuste),
    0
  );
  return Math.max(0, Math.min(100, 100 - total));
}

/** Passou? `null` NUNCA passa por nota — passa por declaração, e o registro tem de dizer. */
export function passou(nota: number | null): boolean {
  return typeof nota === "number" && nota >= CORTE;
}

/** Monta o veredito de um revisor que rodou de verdade. */
export function veredito(etapa: string, achados: AchadoNota[], extra: Partial<VeredictoNota> = {}): VeredictoNota {
  const nota = notaDe(achados);
  return { etapa, nota, rodou: true, seguiu: passou(nota), achados: achados || [], ...extra };
}

/**
 * "Não consegui olhar" — um lugar só, para nenhum caminho inventar outro formato.
 *
 * `seguiu: true` com `rodou: false` é deliberado e é o ponto mais delicado do desenho: um
 * revisor que DERRUBA a linha quando ele próprio falha troca "peça ruim" por "peça nenhuma",
 * e peça nenhuma já parou as duas contas do Instagram por quatro dias em agosto. A peça segue
 * MARCADA, e quem registra é obrigado a dizer "NÃO REVISADO".
 */
export const naoOlhou = (etapa: string, motivo: string, extra: Partial<VeredictoNota> = {}): VeredictoNota => ({
  etapa,
  nota: null,
  rodou: false,
  seguiu: true,
  achados: [],
  motivo,
  ...extra,
});

/** A etapa que não existe nesta peça. Declarada — nunca contada como aprovada. */
export const naoSeAplica = (etapa: string, porque: string): VeredictoNota => ({
  etapa,
  nota: null,
  rodou: false,
  seguiu: true,
  naoSeAplica: true,
  achados: [],
  motivo: porque,
});

/** Uma linha curta para o registro do servidor. */
export function linhaDoVeredito(v: VeredictoNota): string {
  if (v.naoSeAplica) return `${v.etapa}: não se aplica (${v.motivo ?? "—"})`;
  if (v.nota === null) return `${v.etapa}: ⚠️ NÃO REVISADO (${v.motivo ?? "sem motivo"})`;
  const quais = (v.achados || []).slice(0, 2).map((a) => a.oQue).join(" · ");
  return `${v.etapa}: ${v.seguiu ? "✅" : "⛔"} ${v.nota}/100${quais ? ` — ${quais}` : ""}`;
}

/** O que volta ao redator quando a etapa reprova. */
export function instrucaoDeCorrecao(v: VeredictoNota): string {
  if (!v.achados?.length) return "";
  return [
    `O REVISOR DE ${v.etapa.toUpperCase()} REPROVOU (nota ${v.nota} de 100; o mínimo é ${CORTE}).`,
    "Corrija EXATAMENTE isto, sem mexer no resto:",
    ...v.achados.map((a) => `- [${a.gravidade}] ${a.oQue}`),
  ].join("\n");
}
