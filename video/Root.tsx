// ─── Catálogo de composições Remotion ─────────────────────────────────────────
// Registra a composição "Reel" — 1080x1920 (9:16), 30fps. A duração total vem de
// reelDurations() (fonte única em Reel.tsx) p/ não duplicar a matemática.

import React from "react";
import { Composition } from "remotion";
import { Reel, reelDefaultProps, reelDurations, ReelProps, FPS } from "./Reel";

export const RemotionRoot: React.FC = () => {
  return (
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
  );
};
