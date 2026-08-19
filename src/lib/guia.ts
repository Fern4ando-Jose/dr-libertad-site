// Camada de conteúdo do guia "100 Dias para a Liberdade".
// Lê o JSON gerado por scripts/port-guia.mjs (fonte: markdowns do projeto Livros-Escrevendo).
// Nenhuma afirmação/marcador interno chega aqui — o porte já limpou.
import ptDays from "@/content/guia/pt.json";
import type { Lang } from "@/lib/i18n/dictionaries";

export type GuideDay = {
  phase: string;
  phaseLabel: string;
  prep: boolean;
  day: number;
  order: number;
  title: string;
  promise: string;
  science: string;
  action: string;
  trap: string;
  sourceFile: string;
};

export type GuidePhase = {
  key: string;
  idx: string;
  label: string;
  sub: string;
  range: string;
};

// As 5 fases, na ordem da jornada. `sub` e `range` alimentam o hub.
export const GUIDE_PHASES: GuidePhase[] = [
  { key: "preparacao",   idx: "00", label: "Antes de começar", sub: "Conhecer o inimigo e preparar o terreno antes do Dia 1.", range: "Preparação · 4 dias" },
  { key: "choque",       idx: "01", label: "O Choque",         sub: "Sobreviver à fissura aguda. Os dias mais duros — e como atravessá-los.", range: "Dias 1–14" },
  { key: "travessia",    idx: "02", label: "A Travessia",      sub: "O inimigo já não é a fissura — é o tédio e o vazio. Reconstruir rotina e prazeres reais.", range: "Dias 15–45" },
  { key: "consolidacao", idx: "03", label: "Consolidação",     sub: "A vida maior que o hábito. O vínculo, o sentido, a identidade nova.", range: "Dias 46–90" },
  { key: "vida-depois",  idx: "04", label: "A Vida Depois",    sub: "Manutenção e fechamento. Não é cura — é uma vida mudada.", range: "Dias 91–100" },
];

const BY_LANG: Record<Lang, GuideDay[]> = {
  pt: ptDays as GuideDay[],
  // ES ainda não traduzido (§1.13 — voz ES pendente). Cai vazio até existir.
  es: [],
};

/** Slug estável de um dia: prep → "p1".."p4"; jornada → "1".."100". */
export function daySlug(d: Pick<GuideDay, "prep" | "day">): string {
  return d.prep ? `p${d.day}` : String(d.day);
}

export function getGuideDays(lang: Lang): GuideDay[] {
  return BY_LANG[lang] ?? [];
}

export function getGuideDay(lang: Lang, slug: string): GuideDay | undefined {
  return getGuideDays(lang).find((d) => daySlug(d) === slug);
}

/** Dias de uma fase, em ordem. */
export function daysOfPhase(lang: Lang, phaseKey: string): GuideDay[] {
  return getGuideDays(lang).filter((d) => d.phase === phaseKey);
}

/** Vizinhos na sequência global (para anterior/próximo). */
export function neighbours(lang: Lang, slug: string): { prev?: GuideDay; next?: GuideDay } {
  const days = getGuideDays(lang);
  const i = days.findIndex((d) => daySlug(d) === slug);
  if (i === -1) return {};
  return { prev: days[i - 1], next: days[i + 1] };
}

/** Rótulo curto de um dia ("Preparação · 2" ou "Dia 14"). */
export function dayLabel(d: GuideDay): string {
  return d.prep ? `Preparação · ${d.day}` : `Dia ${d.day}`;
}

/** Marcador do quadradinho no hub ("P1" ou "14"). */
export function dayBadge(d: GuideDay): string {
  return d.prep ? `P${d.day}` : String(d.day);
}
