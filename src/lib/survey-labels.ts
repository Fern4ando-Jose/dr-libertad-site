// ─── Rótulos legíveis dos itens da pesquisa (para o painel) ──────────────────
// O banco guarda CÓDIGO estável ("as_vezes", "app_namoro", "pnr") — é isso que
// torna BR e ES comparáveis. O painel precisa do texto humano; esta é a ponte
// entre o esqueleto (survey-schema.ts) e os textos (survey.content.ts), sem
// duplicar nenhum dos dois.

import { surveyContent } from "@/components/survey/survey.content";
import type { Lang } from "./i18n/dictionaries";
import { FREQ_VALUES, PNR, SCALE_MAX, SCALE_MIN, SCREENS, YESNO_VALUES, type QuestionSpec } from "./survey-schema";

const SPEC_BY_ID = new Map<string, QuestionSpec>(
  SCREENS.flatMap((s) => s.questions).map((q) => [q.id, q])
);

const SCREEN_INDEX_BY_ID = new Map<string, number>(
  SCREENS.flatMap((s, i) => s.questions.map((q) => [q.id, i] as [string, number]))
);

export function questionSpec(id: string): QuestionSpec | undefined {
  return SPEC_BY_ID.get(id);
}

/** Texto da pergunta (o mesmo que a pessoa leu na tela). */
export function questionText(id: string, lang: Lang = "br"): string {
  const screen = SCREEN_INDEX_BY_ID.get(id);
  if (screen === undefined) return id;
  return surveyContent[lang].screens[screen]?.questions[id]?.text ?? id;
}

/** Título da tela a que o item pertence — agrupa o painel como o funil. */
export function screenTitle(id: string, lang: Lang = "br"): string {
  const screen = SCREEN_INDEX_BY_ID.get(id);
  if (screen === undefined) return "";
  return surveyContent[lang].screens[screen]?.title ?? "";
}

/**
 * Domínio ORDENADO do item (a ordem que a pessoa viu na tela) — o painel desenha
 * as barras nesta ordem, inclusive as opções com zero resposta. Sem isto, "nunca"
 * apareceria depois de "sempre" só porque ninguém marcou "raramente".
 */
export function orderedValues(id: string): string[] {
  const spec = SPEC_BY_ID.get(id);
  if (!spec) return [];
  const out: string[] = [];
  switch (spec.kind) {
    case "single":
    case "multi":
      out.push(...(spec.values ?? []));
      break;
    case "freq":
      out.push(...FREQ_VALUES);
      break;
    case "yesno":
      out.push(...YESNO_VALUES);
      break;
    case "scale":
      for (let i = SCALE_MIN; i <= SCALE_MAX; i++) out.push(String(i));
      break;
    case "open":
      return [];
  }
  if (spec.extra) out.push(spec.extra);
  if (spec.pnr) out.push(PNR);
  return out;
}

/** Rótulo humano de um valor gravado ("as_vezes" → "Às vezes"). */
export function optionLabel(id: string, value: string, lang: Lang = "br"): string {
  const spec = SPEC_BY_ID.get(id);
  const c = surveyContent[lang];
  const screen = SCREEN_INDEX_BY_ID.get(id);
  const copy = screen === undefined ? undefined : c.screens[screen]?.questions[id];

  if (value === PNR) return c.pnrLabel;
  if (!spec) return value;
  if (spec.extra && value === spec.extra) return copy?.extraLabel ?? value;

  switch (spec.kind) {
    case "single":
    case "multi":
      return copy?.options?.[value] ?? value;
    case "freq":
      return c.freqLabels[value] ?? value;
    case "yesno":
      return c.yesnoLabels[value] ?? value;
    case "scale":
      // 1 e 5 têm âncora escrita na tela; 2–4 são só o número.
      if (value === String(SCALE_MIN)) return `${SCALE_MIN} — ${c.scaleAnchors.low}`;
      if (value === String(SCALE_MAX)) return `${SCALE_MAX} — ${c.scaleAnchors.high}`;
      return value;
    case "open":
      return value;
  }
}
