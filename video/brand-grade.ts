// ─── Grade de cor da marca — FONTE ÚNICA (2026-07-16) ──────────────────────────
// Antes, `video/Reel.tsx` e `video/KenBurns.tsx` (POC) REDECLARAVAM as mesmas 4
// constantes (GRADE_FILTER/DUO_FLOOR/DUO_HIGHLIGHT/WARM_WASH) cada um por conta
// própria — risco de drift confirmado no próprio comentário do KenBurns.tsx. Com
// 4 fontes de footage (Pexels vídeo/foto + Pixabay vídeo/foto) todas passando por
// `Scene`/`PhotoKenBurns`, a MESMA cara precisa vir de UM lugar só.
//
// Revisão de neuromarketing (estrategista-de-atenção, 2026-07-16): manter o
// matiz quente e o mecanismo duotone (fluência de processamento entre as 4
// fontes) — variar SÓ intensidade (brilho/contraste/saturação/opacidade) por
// PILAR, nunca trocar hex/matiz. Não reabre o acento único #A45A5A (travado
// 2026-07-14) nem introduz frio (rejeitado nas capas 2026-07-15). ⚠️ Os deltas de
// `dopamine` (mais vívido) são extrapolação editorial do estrategista — o pilar
// que narra o loop viciante fica visualmente no limite do vívido DE PROPÓSITO,
// pra ecoar o próprio mecanismo que o texto denuncia; não é achado de paper. Isto
// NÃO é uma decisão fechada sozinha — vai no material de prova (render por
// pilar) que o dono aprova antes de ir ao ar (P4).
//
// Import RELATIVO nos consumidores de video/*.tsx (webpack do Remotion não
// resolve `@/`); este módulo em si não importa nada do Next/DB — só tipos e as
// camadas de overlay (React/Remotion puro), seguro no bundle.
import React from "react";
import { AbsoluteFill } from "remotion";

export type Pillar = "freedom" | "dopamine" | "anxiety" | "network" | "self" | "mind";

// Piso/teto/wash — cor fixa dos 3, SÓ a opacidade varia por pilar (ver PILLAR_GRADE).
export const DUO_FLOOR = "#1F1A18"; // piso levemente quente (matte, sem laranja)
export const DUO_HIGHLIGHT = "#ECDCC4"; // teto creme quente suave
export const WARM_WASH = "#5A4636"; // unificador quente discreto

const BASE = {
  saturate: 0.52,
  contrast: 1.16,
  brightness: 0.95,
  sepia: 0.2,
  floorOpacity: 1.0,
  highlightOpacity: 1.0,
  washOpacity: 0.18,
};

type Grade = typeof BASE;

// Deltas por pilar — SÓ intensidade (nunca hex/matiz). `mind` = BASE exata (o
// pilar "padrão" antes desta mudança já rendia nesses valores).
const PILLAR_GRADE: Record<Pillar, Partial<Grade>> = {
  mind: {},
  anxiety: { brightness: 0.87, contrast: 1.24, saturate: 0.44, highlightOpacity: 0.85, washOpacity: 0.2 },
  network: { saturate: 0.4, contrast: 1.12, brightness: 0.93, sepia: 0.14, highlightOpacity: 0.9 },
  self: { contrast: 1.08, brightness: 0.97, floorOpacity: 0.92 },
  freedom: { brightness: 1.02, saturate: 0.58, sepia: 0.22, washOpacity: 0.12 },
  dopamine: { saturate: 0.62, contrast: 1.18, brightness: 1.0, washOpacity: 0.14 },
};

export function resolveGrade(pillar: Pillar | string | undefined): Grade {
  const key = (pillar && pillar in PILLAR_GRADE ? pillar : "mind") as Pillar;
  return { ...BASE, ...(PILLAR_GRADE[key] ?? {}) };
}

export function gradeFilterCss(pillar: Pillar | string | undefined): string {
  const g = resolveGrade(pillar);
  return `saturate(${g.saturate}) contrast(${g.contrast}) brightness(${g.brightness}) sepia(${g.sepia})`;
}

// ─── Camadas de duotone (piso/teto/wash/acento) — usadas por CIMA do footage já
// filtrado (vídeo com `filter: gradeFilterCss()` ou foto dentro de KenBurns). Um
// ÚNICO componente para as 4 fontes: troca o `pillar` e a mesma composição de
// camadas se aplica a vídeo Pexels, vídeo Pixabay, foto Pexels ou foto Pixabay —
// é isto que garante "visual idêntico independente de onde veio a mídia".
export function GradeOverlay({ pillar, accent }: { pillar?: Pillar | string; accent?: string }) {
  const g = resolveGrade(pillar);
  return React.createElement(
    React.Fragment,
    null,
    // PISO quente: screen — pretos viram matte vintage (nunca cinza lavado)
    React.createElement(AbsoluteFill, { style: { backgroundColor: DUO_FLOOR, mixBlendMode: "screen", opacity: g.floorOpacity } }),
    // TETO âmbar: multiply — luzes viram dourado quente (nunca estoura)
    React.createElement(AbsoluteFill, { style: { backgroundColor: DUO_HIGHLIGHT, mixBlendMode: "multiply", opacity: g.highlightOpacity } }),
    // WASH quente global — garante o tom "antigo/quente" mesmo em clipe/foto frio
    React.createElement(AbsoluteFill, { style: { backgroundColor: WARM_WASH, opacity: g.washOpacity, mixBlendMode: "soft-light" } }),
    // ACENTO da marca por cima (único, #A45A5A — travado 2026-07-14)
    accent ? React.createElement(AbsoluteFill, { style: { backgroundColor: accent, opacity: 0.18, mixBlendMode: "soft-light" } }) : null,
  );
}
