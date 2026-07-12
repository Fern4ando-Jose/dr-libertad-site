// ─── Pesquisa "Redes Sociais e Relacionamentos" — esquema ÚNICO (P8) ─────────
// Fonte única da ESTRUTURA do funil (telas, perguntas, tipos e valores válidos),
// consumida pelo componente (src/components/survey) E pela validação do
// /api/survey. Os TEXTOS (PT/ES) moram em survey.content.ts — aqui só o esqueleto.
//
// ⚠️ FUNIL v2 (2026-07-11, reestruturado sob ordem do dono — FUNIL-PERGUNTAS.md
// da pasta Pesquisa-Funil do livro): item "costumo postar" CORTADO; q9 é o item
// NOVO INVERTIDO ("as redes me aproximaram…") — flag `reverse` abaixo; q13 ganha
// a opção "nunca conheci alguém que vi primeiro online" (`extra`); q17 reescrito
// (frequência, comportamento observável); tela 5 REORDENADA (comportamento →
// percepção → opinião → desfecho) e o item de ciúme (q19, escala) TAMBÉM aceita
// "prefiro não responder". As chaves q1..q24 seguem a numeração v2 — resposta
// gravada antes da v2 (se houver) não é comparável chave a chave.
//
// Anonimato por construção: nenhum item identifica o respondente; o e-mail (item 25)
// é OPCIONAL e viaja/persiste em campo separado (nunca dentro de `answers`).

export type QuestionKind = "single" | "multi" | "freq" | "scale" | "yesno" | "open";

export type QuestionSpec = {
  id: string;
  kind: QuestionKind;
  /** Valores estáveis (iguais em PT e ES) — análise cruzada sem mapeamento. */
  values?: readonly string[];
  /** Item sensível com opção "prefiro não responder" (tela 5). */
  pnr?: boolean;
  /** Opção extra de "não se aplica" (código estável) — ex.: q13 na v2. */
  extra?: string;
  /**
   * Item REVERSO (v2): mede a direção OPOSTA do índice — na ANÁLISE, inverter a
   * escala antes de agregar (1↔5, 2↔4). Quebra viés de aquiescência e mede o
   * lado "para melhor" (q9). Ver mapa item→hipótese no FUNIL-PERGUNTAS.md.
   */
  reverse?: boolean;
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

/** Tamanho máximo de uma resposta aberta (tela 6) — corta abuso sem podar história real. */
export const OPEN_MAX_LEN = 2000;

// Telas 1–5 (a tela 0 é o consentimento; a 6 é opcional — abertas + e-mail).
// Numeração dos itens = FUNIL v2 (q7 = "acompanho…"; o antigo "costumo postar" saiu).
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
      { id: "q7", kind: "freq" }, // acompanho a vida amorosa de outros
      { id: "q8", kind: "freq" }, // conversei com quem não conheço pessoalmente
      { id: "q9", kind: "scale", reverse: true }, // NOVO v2 — "as redes me aproximaram…" (INVERTIDO)
    ],
  },
  {
    key: "o-que-ve-x-o-que-vive",
    questions: [
      { id: "q10", kind: "freq" },
      { id: "q11", kind: "scale" },
      { id: "q12", kind: "scale" },
      { id: "q13", kind: "freq", extra: "nunca_conheci_online" }, // v2: + "nunca conheci alguém que vi primeiro online"
    ],
  },
  {
    key: "opcoes-e-presenca",
    questions: [
      { id: "q14", kind: "scale" },
      { id: "q15", kind: "scale" },
      { id: "q16", kind: "scale" },
      { id: "q17", kind: "freq" }, // v2 REESCRITO: "o celular já foi motivo de reclamação…" (era item duplo em escala)
    ],
  },
  {
    // v2 REORDENADA: comportamento (18) → percepção (19) → comportamento (20) →
    // opinião (21) → desfecho (22). PNR em 18, 19 (NOVO) e 20.
    key: "a-parte-que-ninguem-conta",
    questions: [
      { id: "q18", kind: "freq", pnr: true }, // checagem por desconfiança
      { id: "q19", kind: "scale", pnr: true }, // ciúme/desconfiança — PNR NOVO na v2
      { id: "q20", kind: "yesno", pnr: true }, // flerte/conversa escondida
      { id: "q21", kind: "scale" }, // opinião: apps facilitam traições
      { id: "q22", kind: "yesno" }, // desfecho: já vi terminar
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
        ((FREQ_VALUES as readonly string[]).includes(value) ||
          (spec.pnr === true && value === PNR) ||
          (spec.extra !== undefined && value === spec.extra))
      );
    case "scale":
      // v2: escala sensível (q19) também aceita "prefiro não responder".
      if (spec.pnr === true && value === PNR) return true;
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
