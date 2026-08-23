// ─── Catálogo de composições Remotion ─────────────────────────────────────────
// "Reel"        → motor NOVO (footage de banco + grade + música). Duração via
//                 reelDurations() (fonte única em Reel.tsx).
// "ReelClassic" → motor ANTIGO (slide animado sobre ilustração). Mantido para
//                 rodar em paralelo (1x/dia). Duração própria (COVER+SLIDE*n+CTA).

import React from "react";
import { Composition } from "remotion";
import { Reel, reelDefaultProps, reelDurations, ReelProps, FPS } from "./Reel";
import { ReelClassic, reelClassicDefaultProps, ReelClassicProps } from "./ReelClassic";
import { ReelV2, reelV2DefaultProps, reelDurationsV2, reelPlanV2 } from "./ReelV2";
import { KenBurnsProof, kenBurnsProofDefaultProps, kenBurnsProofDuration } from "./KenBurns";
import { ReelPassos, reelPassosDefaultProps, reelPlanPassos, ReelPassosProps } from "./ReelPassos";

// Duração do motor clássico (mesma matemática inline do componente original).
function classicDuration(slidesCount: number): number {
  const COVER = Math.round(FPS * 2.8);
  const SLIDE = Math.round(FPS * 2.6);
  const CTA = Math.round(FPS * 3.0);
  return COVER + SLIDE * Math.max(1, slidesCount) + CTA;
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Reel"
        component={Reel}
        durationInFrames={reelDurations(reelDefaultProps.slides.length).total}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={reelDefaultProps}
        calculateMetadata={({ props }) => {
          const p = props as ReelProps;
          const count = p.slides && p.slides.length ? p.slides.length : reelDefaultProps.slides.length;
          return { durationInFrames: reelDurations(count).total };
        }}
      />

      {/* PRODUÇÃO dos Reels de footage (capa curta + legenda cinética + voz).
          A duração sai do MESMO plano que o componente usa (reelPlanV2): com voz
          medida, o vídeo tem o tamanho da FALA (o áudio é o relógio); sem voz, a
          fórmula de slides de sempre. Uma só fonte → nunca sobra cena preta no fim
          nem a voz é cortada. */}
      <Composition
        id="ReelV2"
        component={ReelV2}
        durationInFrames={reelDurationsV2(reelV2DefaultProps.slides.length).total}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={reelV2DefaultProps}
        calculateMetadata={({ props }) => {
          const p = props as ReelProps;
          return { durationInFrames: reelPlanV2(p, FPS).total };
        }}
      />

      <Composition
        id="ReelClassic"
        component={ReelClassic}
        durationInFrames={classicDuration(reelClassicDefaultProps.slides.length)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={reelClassicDefaultProps}
        calculateMetadata={({ props }) => {
          const p = props as ReelClassicProps;
          const count = p.slides && p.slides.length ? p.slides.length : reelClassicDefaultProps.slides.length;
          return { durationInFrames: classicDuration(count) };
        }}
      />

      {/* ReelPassos — composição NOVA (grid+numeral+barra-de-progresso), NÃO é
          produção (P1.5: a automação segue no ReelV2). Disponível para adoção
          futura; ver CLAUDE.md/registro da tarefa 2026-08-23 (padrão observado
          em @estoicodiario/@HONORESTOICO). Render de teste isolado:
          `render-reel.mjs --composition=ReelPassos`. */}
      <Composition
        id="ReelPassos"
        component={ReelPassos}
        durationInFrames={reelPlanPassos(reelPassosDefaultProps.steps.length).total}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={reelPassosDefaultProps}
        calculateMetadata={({ props }) => {
          const p = props as ReelPassosProps;
          const count = p.steps && p.steps.length ? p.steps.length : reelPassosDefaultProps.steps.length;
          return { durationInFrames: reelPlanPassos(count).total };
        }}
      />

      {/* Composição de PROVA isolada da 2ª fonte de footage (foto + Ken Burns).
          NÃO usada em produção — QA visual manual (--composition=KenBurnsProof).
          Produção usa PhotoKenBurns via SceneBg (Reel.tsx), fonte da mesma grade. */}
      <Composition
        id="KenBurnsProof"
        component={KenBurnsProof}
        durationInFrames={kenBurnsProofDuration(kenBurnsProofDefaultProps.photos.length)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={kenBurnsProofDefaultProps}
        calculateMetadata={({ props }) => {
          const p = props as { photos?: unknown[] };
          const count = Array.isArray(p.photos) ? p.photos.length : kenBurnsProofDefaultProps.photos.length;
          return { durationInFrames: kenBurnsProofDuration(count) };
        }}
      />
    </>
  );
};
