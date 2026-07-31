// ─── Agregação das respostas da pesquisa (leitura do painel) ─────────────────
// Puro: recebe as linhas de survey_responses e devolve o que o painel /admin/pesquisa
// desenha — totais, série por dia, quebra por campanha e distribuição item a item.
// Fica aqui (e não em SQL) porque o volume é de centenas/milhares e porque assim a
// conta é testável sem banco (padrão dos .invariants.test.ts do repo).
//
// Regra de análise herdada do esquema (survey-schema.ts):
//   • "prefiro não responder" (PNR) é MISSING — nunca entra em média nem em %;
//   • item REVERSO (q9) mede a direção oposta — a média crua NÃO é comparável às
//     outras; o painel mostra a média invertida (6 − x) ao lado, sinalizada.

import {
  PNR,
  SCALE_MAX,
  SCALE_MIN,
  SCREENS,
  type Answers,
  type QuestionKind,
  type QuestionSpec,
} from "./survey-schema";
import { sourceKey, type SurveySource } from "./survey-source";

export type SurveyRow = {
  id: number;
  lang: string;
  answers: Answers;
  email: string | null;
  source: SurveySource | null;
  created_at: string;
};

export type QuestionStat = {
  id: string;
  /** Número global do item (1..24), igual ao FUNIL-PERGUNTAS.md. */
  number: number;
  kind: QuestionKind;
  /** Quantas respostas trouxeram este item (PNR conta como respondido). */
  answered: number;
  /** Quantas marcaram "prefiro não responder". */
  pnr: number;
  /** Contagem por valor (multi conta uma vez por marcação). */
  counts: Record<string, number>;
  /** Média da escala, PNR fora. null quando não é escala ou ninguém respondeu. */
  mean: number | null;
  /** Item invertido (q9): média já corrigida (6 − x) para comparar com o resto. */
  meanReversed: number | null;
  reverse: boolean;
  /** Respostas abertas (só itens `open`), mais novas primeiro. */
  open: { id: number; lang: string; text: string; created_at: string }[];
};

export type SurveyAggregate = {
  totals: {
    total: number;
    br: number;
    es: number;
    /** Deixaram e-mail para a entrevista (item 25). */
    withEmail: number;
    /** Escreveram pelo menos uma resposta aberta (q23/q24). */
    withOpen: number;
    first: string | null;
    last: string | null;
  };
  byDay: { day: string; br: number; es: number; total: number }[];
  bySource: { key: string; br: number; es: number; total: number }[];
  questions: QuestionStat[];
};

const ALL_QUESTIONS: QuestionSpec[] = SCREENS.flatMap((s) => s.questions);

const QUESTION_NUMBER: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  let n = 1;
  for (const q of ALL_QUESTIONS) map[q.id] = n++;
  return map;
})();

/** Linhas antigas gravadas como "pt" contam como BR (mesma decisão do GET /api/survey). */
function langOf(row: SurveyRow): "br" | "es" {
  return row.lang === "es" ? "es" : "br";
}

function dayOf(createdAt: string): string {
  return String(createdAt).slice(0, 10); // ISO → YYYY-MM-DD
}

function bump(map: Record<string, number>, key: string) {
  map[key] = (map[key] ?? 0) + 1;
}

export function aggregate(rows: SurveyRow[]): SurveyAggregate {
  const totals = { total: 0, br: 0, es: 0, withEmail: 0, withOpen: 0, first: null as string | null, last: null as string | null };
  const dayMap = new Map<string, { br: number; es: number }>();
  const sourceMap = new Map<string, { br: number; es: number }>();

  const stats = new Map<string, QuestionStat>();
  const scaleSum: Record<string, { sum: number; n: number }> = {};
  for (const spec of ALL_QUESTIONS) {
    stats.set(spec.id, {
      id: spec.id,
      number: QUESTION_NUMBER[spec.id],
      kind: spec.kind,
      answered: 0,
      pnr: 0,
      counts: {},
      mean: null,
      meanReversed: null,
      reverse: spec.reverse === true,
      open: [],
    });
    scaleSum[spec.id] = { sum: 0, n: 0 };
  }

  for (const row of rows) {
    const lang = langOf(row);
    totals.total += 1;
    totals[lang] += 1;
    if (row.email) totals.withEmail += 1;

    const created = String(row.created_at);
    if (!totals.first || created < totals.first) totals.first = created;
    if (!totals.last || created > totals.last) totals.last = created;

    const day = dayOf(created);
    const dayEntry = dayMap.get(day) ?? { br: 0, es: 0 };
    dayEntry[lang] += 1;
    dayMap.set(day, dayEntry);

    const key = sourceKey(row.source);
    const srcEntry = sourceMap.get(key) ?? { br: 0, es: 0 };
    srcEntry[lang] += 1;
    sourceMap.set(key, srcEntry);

    const answers = (row.answers ?? {}) as Answers;
    let hasOpen = false;

    for (const spec of ALL_QUESTIONS) {
      const value = answers[spec.id];
      if (value === undefined || value === null) continue;
      const stat = stats.get(spec.id)!;

      if (spec.kind === "open") {
        const text = String(value).trim();
        if (!text) continue;
        hasOpen = true;
        stat.answered += 1;
        stat.open.push({ id: row.id, lang, text, created_at: created });
        continue;
      }

      stat.answered += 1;

      if (value === PNR) {
        stat.pnr += 1;
        bump(stat.counts, PNR);
        continue;
      }

      if (Array.isArray(value)) {
        for (const v of value) bump(stat.counts, String(v));
        continue;
      }

      bump(stat.counts, String(value));

      if (spec.kind === "scale" && typeof value === "number") {
        scaleSum[spec.id].sum += value;
        scaleSum[spec.id].n += 1;
      }
    }

    if (hasOpen) totals.withOpen += 1;
  }

  for (const spec of ALL_QUESTIONS) {
    if (spec.kind !== "scale") continue;
    const { sum, n } = scaleSum[spec.id];
    if (n === 0) continue;
    const stat = stats.get(spec.id)!;
    stat.mean = Math.round((sum / n) * 100) / 100;
    if (spec.reverse) {
      stat.meanReversed = Math.round((SCALE_MIN + SCALE_MAX - sum / n) * 100) / 100;
    }
  }

  for (const stat of stats.values()) {
    stat.open.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }

  return {
    totals,
    byDay: [...dayMap.entries()]
      .map(([day, v]) => ({ day, br: v.br, es: v.es, total: v.br + v.es }))
      .sort((a, b) => (a.day < b.day ? -1 : 1)),
    bySource: [...sourceMap.entries()]
      .map(([key, v]) => ({ key, br: v.br, es: v.es, total: v.br + v.es }))
      .sort((a, b) => b.total - a.total),
    questions: [...stats.values()],
  };
}

// ─── CSV (uma linha por resposta) — para abrir no Excel/Sheets e analisar fora ──

function csvCell(value: unknown): string {
  const s = value === undefined || value === null ? "" : String(value);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV completo: metadados + q1..q24 (multi separado por `|`).
 * `includeEmail=false` deixa a coluna de e-mail fora (export para compartilhar).
 */
export function toCsv(rows: SurveyRow[], includeEmail = true): string {
  const header = [
    "id",
    "created_at",
    "lang",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    ...(includeEmail ? ["email"] : []),
    ...ALL_QUESTIONS.map((q) => q.id),
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    const src = row.source ?? {};
    const answers = (row.answers ?? {}) as Answers;
    const cells = [
      row.id,
      row.created_at,
      langOf(row),
      src.s ?? "",
      src.m ?? "",
      src.c ?? "",
      src.n ?? "",
      ...(includeEmail ? [row.email ?? ""] : []),
      ...ALL_QUESTIONS.map((q) => {
        const v = answers[q.id];
        if (v === undefined || v === null) return "";
        return Array.isArray(v) ? v.join("|") : v;
      }),
    ];
    lines.push(cells.map(csvCell).join(","));
  }
  return lines.join("\n");
}
