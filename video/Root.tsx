// ─── Catálogo de composições Remotion ─────────────────────────────────────────
// "Reel"        → motor NOVO (footage de banco + grade + música). Duração via
//                 reelDurations() (fonte única em Reel.tsx).
// "ReelClassic" → motor ANTIGO (slide animado sobre ilustração). Mantido para
//                 rodar em paralelo (1x/dia). Duração própria (COVER+SLIDE*n+CTA).

import React from "react";
import { Composition } from "remotion";
import { Reel, reelDefaultProps, reelDurations, ReelProps, FPS } from "./Reel";
import { ReelClassic, reelClassicDefaultProps, ReelClassicProps } from "./ReelClassic";
import { ReelV2, reelV2DefaultProps, reelDurationsV2, dedupeSlides } from "./ReelV2";
import { KenBurnsProof, kenBurnsProofDefaultProps, kenBurnsProofDuration, FPS as KB_FPS } from "./KenBurns";

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

      {/* Composição EXPERIMENTAL de retenção (capa curta + legenda cinética).
          NÃO usada em produção — só pra render de teste (--composition=ReelV2). */}
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
          const count = dedupeSlides(p.title, p.slides).length; // de-dup → duração bate c/ os insights reais
          return { durationInFrames: reelDurationsV2(count, !!p.funnel).total };
        }}
      />

      {/* POC (fora de produção): foto retrato → movimento Ken Burns suave via CSS
          transform no Remotion. Prova a 2ª fonte de footage (banco de FOTO). Não
          é usada por nenhum workflow — só render de teste (--composition=KenBurnsProof). */}
      <Composition
        id="KenBurnsProof"
        component={KenBurnsProof}
        durationInFrames={kenBurnsProofDuration(kenBurnsProofDefaultProps.photos.length)}
        fps={KB_FPS}
        width={1080}
        height={1920}
        defaultProps={kenBurnsProofDefaultProps}
        calculateMetadata={({ props }) => {
          const p = props as typeof kenBurnsProofDefaultProps;
          const count = p.photos && p.photos.length ? p.photos.length : kenBurnsProofDefaultProps.photos.length;
          return { durationInFrames: kenBurnsProofDuration(count) };
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
    </>
  );
};
