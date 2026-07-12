// ─── Pesquisa "Redes Sociais e Relacionamentos" — esquema ÚNICO (P8) ─────────
// Fonte única da ESTRUTURA do funil (telas, perguntas, tipos e valores válidos),
// consumida pelo componente (src/components/survey) E pela validação do
// /api/survey. Os TEXTOS (PT/ES) moram em survey.content.ts — aqui só o esqueleto.
// Conteúdo aprovado pelo dono em 2026-07-11 (FUNIL-PERGUNTAS.md — 25 itens, 7 telas).
//
// Anonimato por construção: nenhum item identifica o respondente; o e-mail (item 25)
// é OPCIONAL e viaja/persiste em campo separado (nunca dentro de `answers`).

export type QuestionKind = "single" | "multi" | "freq" | "scale" | "yesno" | "open";

export type QuestionSpec = {
  id: string;
  kind: QuestionKind;
  /** Valores estáveis (iguais em PT e ES) — análise cruzada sem mapeamento. */
  values?: readonly string[];
  /** Item sensível com opção "prefiro não responder" (FUNIL, tela 5). */
  pnr?: boolean;
};

export type ScreenSpec = {
  key: string;
  questions: QuestionSpec[];
};

export const FREQ_VALUES = [
  "nunca",
  "raramente",
  "as_vezes",
  "frequentemente",
  "sempre",
] as const;

export const YESNO_VALUES = ["sim", "nao"] as const;

/** Código estável do "prefiro não responder / prefiero no responder". */
export const PNR = "pnr";

export const SCALE_MIN = 1;
export const SCALE_MAX = 5;

/** Tamanho máximo de uma resposta aberta (telas 6) — corta abuso sem podar história real. */
export const OPEN_MAX_LEN = 2000;

// Telas 1–5 (a tela 0 é o consentimento; a 6 é opcional — abertas + e-mail).
export const SCREENS: ScreenSpec[] = [
  {
    key: "sobre-voce",
    questions: [
      { id: "q1", kind: "single", values: ["18-24", "25-34", "35-44", "45-54", "55+"] },
      { id: "q2", kind: "single", values: ["feminino", "masculino", "outro", "prefiro_nao_dizer"] },
      { id: "q3", kind: "single", values: ["solteiro", "namorando", "casado", "separado", "complicado"] },
      {
        id: "q4",
        kind: "single",
        values: ["pessoalmente", "app_namoro", "redes_sociais", "amigos", "trabalho_estudo", "nunca_tive"],
      },
      { id: "q5", kind: "single", values: ["menos_1h", "1_3h", "3_5h", "mais_5h"] },
      { id: "q6", kind: "multi", values: ["instagram", "tiktok", "whatsapp", "facebook", "x", "apps_namoro"] },
    ],
  },
  {
    key: "voce-e-as-redes",
    questions: [
      { id: "q7", kind: "freq" },
      { id: "q8", kind: "freq" },
      { id: "q9", kind: "freq" },
    ],
  },
  {
    key: "comparacao-expectativa",
    questions: [
      { id: "q10", kind: "freq" },
      { id: "q11", kind: "scale" },
      { id: "q12", kind: "scale" },
      { id: "q13", kind: "freq" },
    ],
  },
  {
    key: "escolha-presenca",
    questions: [
      { id: "q14", kind: "scale" },
      { id: "q15", kind: "scale" },
      { id: "q16", kind: "scale" },
      { id: "q17", kind: "scale" },
    ],
  },
  {
    key: "confianca-fidelidade",
    questions: [
      { id: "q18", kind: "scale" },
      { id: "q19", kind: "freq", pnr: true },
      { id: "q20", kind: "scale" },
      { id: "q21", kind: "yesno", pnr: true },
      { id: "q22", kind: "yesno" },
    ],
  },
  {
    key: "sua-historia",
    questions: [
      { id: "q23", kind: "open" },
      { id: "q24", kind: "open" },
    ],
  },
];

const ALL_QUESTIONS: QuestionSpec[] = SCREENS.flatMap((s) => s.questions);

export type AnswerValue = string | number | string[];
export type Answers = Record<string, AnswerValue>;

/** Uma resposta é válida para o spec da pergunta? (puro — coberto por teste invariante) */
export function isValidAnswer(spec: QuestionSpec, value: unknown): boolean {
  switch (spec.kind) {
    case "single":
      return typeof value === "string" && (spec.values ?? []).includes(value);
    case "multi":
      return (
        Array.isArray(value) &&
        value.length > 0 &&
        value.length <= (spec.values?.length ?? 0) &&
        new Set(value).size === value.length &&
        value.every((v) => typeof v === "string" && (spec.values ?? []).includes(v))
      );
    case "freq":
      return (
        typeof value === "string" &&
        ((FREQ_VALUES as readonly string[]).includes(value) || (spec.pnr === true && value === PNR))
      );
    case "scale":
      return typeof value === "number" && Number.isInteger(value) && value >= SCALE_MIN && value <= SCALE_MAX;
    case "yesno":
      return (
        typeof value === "string" &&
        ((YESNO_VALUES as readonly string[]).includes(value) || (spec.pnr === true && value === PNR))
      );
    case "open":
      return typeof value === "string" && value.length <= OPEN_MAX_LEN;
  }
}

export type ValidationResult = { ok: true; clean: Answers } | { ok: false; error: string };

/**
 * Valida o payload de respostas do POST /api/survey.
 * - Só aceita chaves conhecidas (q1..q24) com valor no domínio do item.
 * - Itens FECHADOS (telas 1–5) são obrigatórios; ABERTOS (q23/q24) são opcionais
 *   (entram só se não-vazios, aparados e com teto de tamanho).
 * - Devolve um objeto LIMPO (nada além do esquema chega ao banco).
 */
export function validateAnswers(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, error: "invalid_answers" };
  }
  const raw = input as Record<string, unknown>;
  const clean: Answers = {};

  for (const spec of ALL_QUESTIONS) {
    const value = raw[spec.id];
    if (spec.kind === "open") {
      if (value === undefined || value === null) continue;
      if (typeof value !== "string") return { ok: false, error: `invalid_${spec.id}` };
      const trimmed = value.trim().slice(0, OPEN_MAX_LEN);
      if (trimmed) clean[spec.id] = trimmed;
      continue;
    }
    if (value === undefined || value === null) return { ok: false, error: `missing_${spec.id}` };
    if (!isValidAnswer(spec, value)) return { ok: false, error: `invalid_${spec.id}` };
    clean[spec.id] = value as AnswerValue;
  }

  return { ok: true, clean };
}
