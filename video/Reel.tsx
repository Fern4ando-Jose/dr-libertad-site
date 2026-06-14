// ─── Composição do Reel Dr. Libertad ─────────────────────────────────────────
// Vídeo vertical 1080x1920 (9:16), 30fps. Régua: "vídeo de verdade, não slide
// animado" — o fundo é IMAGEM EM MOVIMENTO real (clipe i2v da fal gerado a
// partir da ilustração do dia), e o texto entra como CAMADA por cima, mínimo.
//
// Camadas (de baixo p/ cima):
//   1. Fundo em movimento  → <OffthreadVideo> do clipe i2v, cover-crop p/ 9:16,
//      desacelerado p/ durar o Reel inteiro, com reframe sutil a cada batida.
//      Fallback: ilustração estática (Ken Burns) → watermark gigante.
//   2. Scrim                → contraste do texto claro.
//   3. Grão + vinheta       → textura da marca.
//   4. Texto (3 batidas)    → Capa (gancho) → Insight(s) → CTA. Mínimo.
//   5. Música               → trilha royalty-free opcional (prop `music`).
//
// Fonte: Fraunces (mesma da marca) via @remotion/google-fonts. O render roda no
// Chromium do CI (não no edge do /api/og), então google-fonts não infla o edge.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";

const { fontFamily: FRAUNCES } = loadFraunces();

// ─── Cores da marca (espelham /api/og) ────────────────────────────────────────
const INK = "#0B0B0C";
const PAPER = "#F4F0E8";
const WHITE = "#ffffff";
const RED = "#A45A5A"; // acento default (freedom)

const CAT_ACCENT: Record<string, string> = {
  freedom: "#A45A5A",
  dopamine: "#BE7A2A",
  anxiety: "#3D6360",
  network: "#3F5E78",
  self: "#835A6E",
  mind: "#5B6B3C",
};

// Scrim global sobre o fundo em movimento — escurece topo e (forte) a base,
// onde mora o texto. Garante leitura do texto claro sobre qualquer imagem.
const SCRIM =
  "linear-gradient(180deg, rgba(11,11,12,0.55) 0%, rgba(11,11,12,0.18) 30%, rgba(11,11,12,0.20) 60%, rgba(11,11,12,0.88) 100%)";

// ─── Tempos (fonte única; Root.tsx importa reelDurations) ─────────────────────
export const FPS = 30;
const CLIP_SECONDS = 6; // duração que pedimos ao i2v (animate-clip.mjs)

// "Texto mínimo": no máximo 2 insights entre capa e CTA — Reel curto (~14s).
export function reelDurations(slidesCount: number) {
  const COVER = Math.round(FPS * 3.8);
  const INSIGHT = Math.round(FPS * 3.6);
  const CTA = Math.round(FPS * 3.0);
  const n = Math.min(Math.max(slidesCount || 1, 1), 2);
  return { COVER, INSIGHT, CTA, n, total: COVER + INSIGHT * n + CTA };
}

// ─── Props de entrada (inputProps) ────────────────────────────────────────────
export type ReelProps = {
  title: string; // gancho da capa
  slides: string[]; // frases dos insights (usamos só as 2 primeiras)
  accentWords: string[]; // palavra de destaque por insight (pode vir vazio)
  cta: string; // pergunta/chamada (cena final)
  kw: string; // keyword curta — watermark gigante (fallback sem imagem)
  ed: string; // número da edição (ex.: "012")
  img?: string; // URL da ilustração estática (fallback do fundo)
  clip?: string; // URL do clipe i2v (fundo em movimento — preferido)
  music?: string; // caminho staticFile (ex.: "music/bed.mp3") ou URL — opcional
  cat?: string; // categoria → cor de acento
};

export const reelDefaultProps: ReelProps = {
  title: "A liberdade começa onde o automático termina",
  slides: [
    "O algoritmo decide por você quando você não decide",
    "Atenção é a moeda; recupere o controle dela",
  ],
  accentWords: ["liberdade", "controle"],
  cta: "O que mais rouba a sua atenção hoje?",
  kw: "LIBERTAD",
  ed: "001",
  img: undefined,
  clip: undefined,
  music: undefined,
  cat: "freedom",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Realça `accent` dentro de `text` pintando-a na cor de destaque.
function Highlighted({ text, accent, color }: { text: string; accent: string; color: string }) {
  if (!accent) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(accent.toLowerCase());
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + accent.length);
  const after = text.slice(idx + accent.length);
  return (
    <>
      {before}
      <span style={{ color }}>{match}</span>
      {after}
    </>
  );
}

function Handle({ color = PAPER }: { color?: string }) {
  return (
    <div
      style={{
        fontFamily: FRAUNCES,
        fontSize: 38,
        fontWeight: 600,
        letterSpacing: 2,
        color,
        opacity: 0.85,
      }}
    >
      @drlibertad
    </div>
  );
}

// ─── Fundo em movimento ───────────────────────────────────────────────────────
// Um único clipe i2v atravessa o Reel inteiro, desacelerado p/ durar tudo, com
// reframe sutil a cada batida (sensação de corte/recadre sobre o mesmo material).
// Sem clipe → ilustração estática (Ken Burns). Sem nada → watermark.
function MovingBackground({
  clip,
  img,
  kw,
  accent,
  total,
  cover,
  insight,
  beats,
}: {
  clip?: string;
  img?: string;
  kw: string;
  accent: string;
  total: number;
  cover: number;
  insight: number;
  beats: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const COVER = cover;
  const INSIGHT = insight;
  const n = beats;

  // Push-in lento contínuo + deriva suave (Ken Burns sobre o vídeo).
  const baseScale = interpolate(frame, [0, total], [1.05, 1.18], { extrapolateRight: "clamp" });
  const driftX = interpolate(frame, [0, total], [0, -40]) + 22 * Math.sin(frame / (fps * 2.6));
  const driftY = interpolate(frame, [0, total], [12, -28], { extrapolateRight: "clamp" });

  // Reframe a cada batida: pequeno "assentar" (punch-in que relaxa) no início de
  // cada cena → leitura de corte/recadre, mesmo sendo um clipe só.
  const bounds = [0, COVER];
  for (let i = 1; i < n; i++) bounds.push(COVER + INSIGHT * i);
  bounds.push(COVER + INSIGHT * n); // início do CTA
  let beatStart = 0;
  for (const b of bounds) if (frame >= b) beatStart = b;
  const settle = spring({ frame: frame - beatStart, fps, config: { damping: 200 }, durationInFrames: 20 });
  const cutScale = interpolate(settle, [0, 1], [1.05, 1.0]);

  const transform = `scale(${baseScale * cutScale}) translate(${driftX}px, ${driftY}px)`;

  if (clip) {
    // Clipe 16:9 → cover-crop p/ 9:16 (objectFit cover). Desacelera p/ durar tudo.
    const totalSec = total / fps;
    const rate = Math.max(0.2, Math.min(1, CLIP_SECONDS / totalSec));
    return (
      <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
        <AbsoluteFill style={{ transform }}>
          <OffthreadVideo
            src={clip}
            playbackRate={rate}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (img) {
    return (
      <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
        <AbsoluteFill style={{ transform }}>
          <Img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // Sem imagem: watermark gigante translúcido no acento.
  const drift = interpolate(frame, [0, total], [-24, 24], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ backgroundColor: INK, justifyContent: "center", alignItems: "center" }}>
      <div
        style={{
          fontFamily: FRAUNCES,
          fontWeight: 900,
          fontSize: 320,
          color: accent,
          opacity: 0.14,
          whiteSpace: "nowrap",
          letterSpacing: -8,
          transform: `translateX(${drift}px) rotate(-8deg)`,
        }}
      >
        {kw}
      </div>
    </AbsoluteFill>
  );
}

// Grão + vinheta — textura sutil da marca por cima do fundo.
function Texture() {
  return (
    <>
      {/* Vinheta */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(120% 80% at 50% 42%, rgba(0,0,0,0) 55%, rgba(11,11,12,0.45) 100%)",
        }}
      />
      {/* Grão de filme (feTurbulence determinístico) */}
      <AbsoluteFill style={{ opacity: 0.07, mixBlendMode: "overlay" }}>
        <svg width="100%" height="100%">
          <filter id="reelGrain">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" stitchTiles="stitch" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#reelGrain)" />
        </svg>
      </AbsoluteFill>
    </>
  );
}

// ─── Batida 1 — Capa ──────────────────────────────────────────────────────────
function CoverText({ title, ed, accent }: { title: string; ed: string; accent: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 28 });
  const y = interpolate(entry, [0, 1], [60, 0]);
  const o = interpolate(entry, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 90,
          left: 90,
          fontFamily: FRAUNCES,
          fontSize: 34,
          letterSpacing: 6,
          color: PAPER,
          opacity: 0.7,
        }}
      >
        DR. LIBERTAD · Nº {ed}
      </div>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 90px 150px" }}>
        <div style={{ transform: `translateY(${y}px)`, opacity: o }}>
          <div style={{ width: 110, height: 8, backgroundColor: accent, marginBottom: 40, borderRadius: 4 }} />
          <div
            style={{
              fontFamily: FRAUNCES,
              fontWeight: 800,
              fontSize: 100,
              lineHeight: 1.05,
              color: WHITE,
              textShadow: "0 2px 28px rgba(0,0,0,0.5)",
              maxWidth: 920,
            }}
          >
            {title}
          </div>
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", bottom: 80, left: 90 }}>
        <Handle color={PAPER} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Batida de insight ────────────────────────────────────────────────────────
function InsightText({
  text,
  accent,
  accentColor,
  index,
  total,
}: {
  text: string;
  accent: string;
  accentColor: string;
  index: number;
  total: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const x = interpolate(entry, [0, 1], [-50, 0]);
  const o = interpolate(entry, [0, 1], [0, 1]);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 90,
          fontFamily: FRAUNCES,
          fontSize: 40,
          fontWeight: 700,
          color: accentColor,
          opacity: o,
        }}
      >
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: "0 90px 200px" }}>
        <div
          style={{
            transform: `translateX(${x}px)`,
            opacity: o,
            fontFamily: FRAUNCES,
            fontWeight: 800,
            fontSize: 88,
            lineHeight: 1.12,
            color: WHITE,
            textShadow: "0 2px 28px rgba(0,0,0,0.5)",
            maxWidth: 920,
          }}
        >
          <Highlighted text={text} accent={accent} color={accentColor} />
        </div>
      </AbsoluteFill>

      <div style={{ position: "absolute", bottom: 80, left: 90 }}>
        <Handle color={PAPER} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Batida final — CTA ───────────────────────────────────────────────────────
function CtaText({ cta, accent }: { cta: string; accent: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const scale = interpolate(entry, [0, 1], [0.85, 1]);
  const o = interpolate(entry, [0, 1], [0, 1]);
  const pulse = 1 + 0.02 * Math.sin((frame / fps) * Math.PI * 2);

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 90px", textAlign: "center" }}>
      <div style={{ transform: `scale(${scale})`, opacity: o, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ width: 110, height: 8, backgroundColor: accent, marginBottom: 50, borderRadius: 4 }} />
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 800,
            fontSize: 92,
            lineHeight: 1.1,
            color: WHITE,
            textShadow: "0 2px 28px rgba(0,0,0,0.5)",
            transform: `scale(${pulse})`,
          }}
        >
          Siga <span style={{ color: accent }}>@drlibertad</span>
        </div>
        <div
          style={{
            marginTop: 50,
            fontFamily: FRAUNCES,
            fontWeight: 400,
            fontSize: 50,
            lineHeight: 1.3,
            color: PAPER,
            opacity: 0.92,
            maxWidth: 880,
            textShadow: "0 2px 20px rgba(0,0,0,0.5)",
          }}
        >
          {cta}
        </div>
        <div
          style={{
            marginTop: 60,
            fontFamily: FRAUNCES,
            fontSize: 40,
            fontWeight: 600,
            letterSpacing: 2,
            color: accent,
          }}
        >
          → Mais no link da bio
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Composição completa ──────────────────────────────────────────────────────
export const Reel: React.FC<ReelProps> = ({ title, slides, accentWords, cta, kw, ed, img, clip, music, cat }) => {
  const accent = CAT_ACCENT[cat ?? "freedom"] ?? RED;
  const safeSlides = (slides && slides.length ? slides : reelDefaultProps.slides).slice(0, 2);
  const { COVER, INSIGHT, CTA, n, total } = reelDurations(safeSlides.length);
  const usedSlides = safeSlides.slice(0, n);

  let cursor = 0;
  const next = (dur: number) => {
    const from = cursor;
    cursor += dur;
    return from;
  };

  const musicSrc = music ? (/^https?:\/\//.test(music) ? music : staticFile(music)) : null;

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      {/* 1. Fundo em movimento (atravessa o Reel inteiro) */}
      <MovingBackground clip={clip} img={img} kw={kw} accent={accent} total={total} cover={COVER} insight={INSIGHT} beats={n} />

      {/* 2. Scrim + 3. textura */}
      <AbsoluteFill style={{ background: SCRIM }} />
      <Texture />

      {/* 4. Texto — 3 batidas */}
      <Sequence from={next(COVER)} durationInFrames={COVER}>
        <CoverText title={title} ed={ed} accent={accent} />
      </Sequence>

      {usedSlides.map((text, i) => (
        <Sequence key={i} from={next(INSIGHT)} durationInFrames={INSIGHT}>
          <InsightText
            text={text}
            accent={accentWords?.[i] ?? ""}
            accentColor={accent}
            index={i + 1}
            total={n}
          />
        </Sequence>
      ))}

      <Sequence from={next(CTA)} durationInFrames={CTA}>
        <CtaText cta={cta} accent={accent} />
      </Sequence>

      {/* 5. Música (opcional) com fade in/out */}
      {musicSrc && (
        <Audio
          src={musicSrc}
          volume={(f) =>
            interpolate(f, [0, 15, total - 24, total], [0, 0.7, 0.7, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      )}
    </AbsoluteFill>
  );
};
