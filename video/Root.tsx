// ─── Catálogo de composições Remotion ─────────────────────────────────────────
// Registra a composição "Reel" — 1080x1920 (9:16), 30fps. A duração total é
// calculada dinamicamente a partir do nº de slides (calculateMetadata).

import React from "react";
import { Composition } from "remotion";
import { Reel, reelDefaultProps, ReelProps } from "./Reel";

const FPS = 30;

// Mesma matemática de duração usada dentro de Reel.tsx (mantida em sincronia).
function totalDurationInFrames(slidesCount: number): number {
  const COVER = Math.round(FPS * 2.8);
  const SLIDE = Math.round(FPS * 2.6);
  const CTA = Math.round(FPS * 3.0);
  return COVER + SLIDE * Math.max(1, slidesCount) + CTA;
}

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Reel"
      component={Reel}
      durationInFrames={totalDurationInFrames(reelDefaultProps.slides.length)}
      fps={FPS}
      width={1080}
      height={1920}
      defaultProps={reelDefaultProps}
      calculateMetadata={({ props }) => {
        const p = props as ReelProps;
        const count = p.slides && p.slides.length ? p.slides.length : reelDefaultProps.slides.length;
        return { durationInFrames: totalDurationInFrames(count) };
      }}
    />
  );
};
