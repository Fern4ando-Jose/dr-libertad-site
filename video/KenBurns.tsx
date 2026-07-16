// ─── Cena "FOTO Ken Burns" — 2ª fonte de footage, PROMOVIDA a produção ─────────
// Nasceu como POC isolado (commit 771e7039, branch foto-ken-burns-poc, aprovado
// pelo dono) e foi promovida ao pipeline real em 2026-07-16 (mix de 4 fontes:
// Pexels vídeo/foto + Pixabay vídeo/foto). Transforma uma FOTO retrato 9:16
// (banco curado — 10-100× mais opções que o de vídeo) numa cena com movimento
// cinematográfico LENTO e SUAVE, do jeito que o Reel já renderiza (Remotion +
// CSS transform). NADA de ffmpeg zoompan: aquele arredonda pixel a cada frame e
// TREME (reprovado pelo dono). Aqui o movimento é `transform:
// scale()/translate3d()` interpolado por `useCurrentFrame()` → subpixel,
// acelerado por GPU (`will-change: transform`), liso por natureza.
//
// A grade quente da marca vem de `./brand-grade` (fonte única — antes redeclarada
// aqui, ver histórico do POC). `SceneBg` (Reel.tsx) detecta se um clipe é foto ou
// vídeo por extensão de URL (`isPhotoUrl`, src/lib/footage-media) e chama
// `<PhotoKenBurns>` no lugar de `<OffthreadVideo>` — mesma `Scene`, mesmo pilar,
// mesmo acento, cara idêntica independente da fonte.
//
// `KenBurnsProof` (composição de prova, `--composition=KenBurnsProof`) continua
// registrada em Root.tsx para QA visual manual isolado (não é usada em produção).

import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { GradeOverlay, gradeFilterCss, DUO_FLOOR, type Pillar } from "./brand-grade";
import { hashStr } from "../src/lib/footage-media";

const INK = "#0B0B0C";

const SCRIM =
  "linear-gradient(180deg, rgba(11,11,12,0.42) 0%, rgba(11,11,12,0.10) 34%, rgba(11,11,12,0.14) 60%, rgba(11,11,12,0.72) 100%)";

// ─── Tipos de movimento Ken Burns ─────────────────────────────────────────────
// Cada modo define scale/translate no INÍCIO e no FIM da cena; a interpolação é
// LINEAR no frame (movimento de velocidade constante = sem "solavanco"). A escala
// base mínima é 1.06 para que o pan/zoom NUNCA revele a borda da foto (a foto já
// entra em `objectFit: cover`, então há folga de recorte suficiente).
export type KenBurnsMode = "zoom-in" | "zoom-out" | "pan-left" | "pan-up";

const KEN_BURNS_MODES: KenBurnsMode[] = ["zoom-in", "zoom-out", "pan-left", "pan-up"];

// Escolha DETERMINÍSTICA do modo a partir de um seed (a própria URL da foto,
// hasheada) — o mesmo clipe sempre se move do mesmo jeito, sem estado extra e
// sem repetir sempre o mesmo modo (a whitelist mistura URLs → hash distribui).
export function pickKenBurnsMode(seed: number): KenBurnsMode {
  return KEN_BURNS_MODES[((seed % KEN_BURNS_MODES.length) + KEN_BURNS_MODES.length) % KEN_BURNS_MODES.length];
}

type MoveState = { scale: number; x: number; y: number };

function moveFor(mode: KenBurnsMode): { from: MoveState; to: MoveState } {
  switch (mode) {
    case "zoom-in":
      // aproxima devagar, com deriva mínima p/ vida (1.06 → 1.15 em ~5s)
      return { from: { scale: 1.06, x: 0, y: 0 }, to: { scale: 1.15, x: -14, y: -8 } };
    case "zoom-out":
      // afasta devagar — revela o entorno (1.16 → 1.06)
      return { from: { scale: 1.16, x: 12, y: 10 }, to: { scale: 1.06, x: 0, y: 0 } };
    case "pan-left":
      // varredura horizontal com zoom quase parado (escala alta = folga p/ o pan)
      return { from: { scale: 1.14, x: 40, y: 0 }, to: { scale: 1.14, x: -40, y: 0 } };
    case "pan-up":
      // sobe devagar (rosto → céu / cabeça → contexto)
      return { from: { scale: 1.14, x: 0, y: 44 }, to: { scale: 1.14, x: 0, y: -44 } };
  }
}

// ─── Fundo: foto com Ken Burns + grade da marca (por pilar) ───────────────────
// `pillar`/`accent` — mesmos que a cena de vídeo recebe (Scene/SceneBg em
// Reel.tsx); com eles ausentes (ex.: KenBurnsProof) cai no grade "mind" (BASE).
export function PhotoKenBurns({
  src,
  mode,
  dur,
  pillar,
  accent,
}: {
  src: string;
  mode: KenBurnsMode;
  dur: number;
  pillar?: Pillar | string;
  accent?: string;
}) {
  const frame = useCurrentFrame();
  const { from, to } = moveFor(mode);
  // interpolação LINEAR no frame → velocidade constante, sem solavanco. `clamp`
  // nas pontas garante que o último frame fique parado no valor final (sem "pulo").
  const p = interpolate(frame, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = from.scale + (to.scale - from.scale) * p;
  const x = from.x + (to.x - from.x) * p;
  const y = from.y + (to.y - from.y) * p;

  return (
    <AbsoluteFill style={{ backgroundColor: DUO_FLOOR, overflow: "hidden", isolation: "isolate" }}>
      {/* Camada animada — o movimento é 100% CSS transform (subpixel, GPU) */}
      <AbsoluteFill
        style={{
          transform: `scale(${scale}) translate3d(${x}px, ${y}px, 0)`,
          willChange: "transform",
          backfaceVisibility: "hidden",
        }}
      >
        <Img
          src={src}
          style={{ width: "100%", height: "100%", objectFit: "cover", filter: gradeFilterCss(pillar) }}
        />
      </AbsoluteFill>
      {/* Grade quente da marca — MESMA fonte (brand-grade.ts) que o footage de vídeo */}
      <GradeOverlay pillar={pillar} accent={accent} />
    </AbsoluteFill>
  );
}

// ─── Composição de PROVA: N fotos em sequência ────────────────────────────────
// Continua registrada em Root.tsx (`--composition=KenBurnsProof`) para QA visual
// manual isolado do movimento — não roda em produção (produção usa PhotoKenBurns
// via SceneBg, dentro de Reel/ReelV2).
export type KenBurnsProofProps = {
  photos: { src: string; mode: KenBurnsMode; label: string }[];
};

export const FPS = 30;
export const PROOF_SCENE_FRAMES = Math.round(FPS * 4.5);

export const kenBurnsProofDefaultProps: KenBurnsProofProps = {
  photos: [
    { src: "https://images.pexels.com/photos/5668880/pexels-photo-5668880.jpeg", mode: "zoom-in", label: "zoom-in" },
    { src: "https://images.pexels.com/photos/34207120/pexels-photo-34207120.jpeg", mode: "zoom-out", label: "zoom-out" },
    { src: "https://images.pexels.com/photos/12748727/pexels-photo-12748727.jpeg", mode: "pan-up", label: "pan-up" },
  ],
};

export function kenBurnsProofDuration(count: number) {
  return PROOF_SCENE_FRAMES * Math.max(1, count);
}

export const KenBurnsProof: React.FC<KenBurnsProofProps> = ({ photos }) => {
  const list = photos && photos.length ? photos : kenBurnsProofDefaultProps.photos;
  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {list.map((ph, i) => (
        <Sequence key={i} from={i * PROOF_SCENE_FRAMES} durationInFrames={PROOF_SCENE_FRAMES}>
          <AbsoluteFill>
            <PhotoKenBurns src={ph.src} mode={ph.mode} dur={PROOF_SCENE_FRAMES} />
            <AbsoluteFill style={{ background: SCRIM }} />
            <div
              style={{
                position: "absolute",
                bottom: 90,
                left: 90,
                fontFamily: "monospace",
                fontSize: 34,
                letterSpacing: 2,
                color: "rgba(244,240,232,0.82)",
              }}
            >
              FOTO {i + 1}/{list.length} · Ken Burns · {ph.label} · seed={hashStr(ph.src)}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
