// ─── ReelV2 — composição EXPERIMENTAL de RETENÇÃO (separada da produção) ───────
// NÃO roda em produção. É a versão de teste pra atacar o gargalo medido no /insights:
// watch médio 4,3s de ~25s (17%) → a galera sai DURANTE a capa de 5s. Mudanças:
//   1. CAPA 5,0s → 2,6s: mata o "vão" parado e leva a pessoa pro 1º insight rápido.
//   2. LEGENDA CINÉTICA: o insight entra palavra-por-palavra (movimento constante =
//      retenção; o olho não "para" como num slide estático).
//   3. Ritmo: insights um tico mais longos (onde mora o valor), capa curta.
// Reusa a CENA/GRADE comprovada do Reel (mesma cara de marca) via `Scene` exportado —
// sem copiar, sem drift. A produção (composição "Reel") fica intocada.
//
// Render de teste: `render-reel.mjs --composition=ReelV2` (CI), publish:no.

import React from "react";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { Scene, reelDefaultProps, type ReelProps, FPS } from "./Reel";

const { fontFamily: FRAUNCES } = loadFraunces();

// Constantes de texto (espelham o Reel; valores simples, isolados no V2 — não tocam
// a produção). A grade/footage vêm de `Scene`, então nada de cor de vídeo aqui.
const PAPER = "#F4F0E8";
const WHITE = "#ffffff";
const RED = "#A45A5A";
const CAT_ACCENT: Record<string, string> = {
  freedom: "#A45A5A",
  dopamine: "#BE7A2A",
  anxiety: "#3D6360",
  network: "#3F5E78",
  self: "#835A6E",
  mind: "#5B6B3C",
};
const SAFE_TOP = 340;
const SAFE_BOTTOM_TEXT = 420;
const SAFE_BOTTOM_HANDLE = 300;

// ─── Tempos V2 (capa curta) ───────────────────────────────────────────────────
export function reelDurationsV2(slidesCount: number) {
  const COVER = Math.round(FPS * 2.6); // era 5,0 — mata o vão
  const INSIGHT = Math.round(FPS * 5.6);
  const CTA = Math.round(FPS * 4.6);
  const n = Math.min(Math.max(slidesCount || 1, 1), 3);
  return { COVER, INSIGHT, CTA, n, total: COVER + INSIGHT * n + CTA };
}

export const reelV2DefaultProps: ReelProps = reelDefaultProps;

function Handle({ color = PAPER, handle = "@dr.liberdad" }: { color?: string; handle?: string }) {
  return (
    <div style={{ fontFamily: FRAUNCES, fontSize: 38, fontWeight: 600, letterSpacing: 2, color, opacity: 0.85 }}>
      {handle}
    </div>
  );
}

// ─── Legenda cinética: revela palavra-por-palavra (movimento = retenção) ───────
function KineticText({
  text,
  accent,
  accentColor,
  startFrame = 3,
  perWord = 3,
  fontSize = 88,
}: {
  text: string;
  accent: string;
  accentColor: string;
  startFrame?: number;
  perWord?: number;
  fontSize?: number;
}) {
  const frame = useCurrentFrame();
  const words = (text || "").split(" ");
  const clean = (w: string) => w.toLowerCase().replace(/[.,;:!?¿¡"']/g, "");
  return (
    <div style={{ fontFamily: FRAUNCES, fontWeight: 800, fontSize, lineHeight: 1.12, color: WHITE, textShadow: "0 2px 28px rgba(0,0,0,0.55)", maxWidth: 920 }}>
      {words.map((w, i) => {
        const f0 = startFrame + i * perWord;
        const o = interpolate(frame, [f0, f0 + 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const y = interpolate(frame, [f0, f0 + 7], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const isAccent = !!accent && clean(w).includes(accent.toLowerCase());
        return (
          <span
            key={i}
            style={{ display: "inline-block", opacity: o, transform: `translateY(${y}px)`, color: isAccent ? accentColor : WHITE, marginRight: "0.26em" }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
}

// ─── Capa V2: gancho quase imediato (capa só 2,6s) ────────────────────────────
function CoverTextV2({ title, ed, accent, brand, handle }: { title: string; ed: string; accent: string; brand: string; handle: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 200, stiffness: 260 }, durationInFrames: 10 });
  const y = interpolate(settle, [0, 1], [26, 0]);
  const scale = interpolate(settle, [0, 1], [1.04, 1]);
  const o = interpolate(frame, [1, 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: SAFE_TOP, left: 90, fontFamily: FRAUNCES, fontSize: 34, letterSpacing: 6, color: PAPER, opacity: 0.7 }}>
        {brand.toUpperCase()} · Nº {ed}
      </div>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: `0 90px ${SAFE_BOTTOM_TEXT}px` }}>
        <div style={{ transform: `translateY(${y}px) scale(${scale})`, transformOrigin: "left bottom", opacity: o }}>
          <div style={{ width: 110, height: 8, backgroundColor: accent, marginBottom: 40, borderRadius: 4 }} />
          <div style={{ fontFamily: FRAUNCES, fontWeight: 800, fontSize: 100, lineHeight: 1.05, color: WHITE, textShadow: "0 2px 28px rgba(0,0,0,0.55)", maxWidth: 920 }}>
            {title}
          </div>
        </div>
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM_HANDLE, left: 90 }}>
        <Handle color={PAPER} handle={handle} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Insight V2: legenda cinética ──────────────────────────────────────────────
function InsightTextV2({ text, accent, accentColor, index, total, handle }: { text: string; accent: string; accentColor: string; index: number; total: number; handle: string }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: SAFE_TOP, left: 90, fontFamily: FRAUNCES, fontSize: 40, fontWeight: 700, color: accentColor, opacity: o }}>
        {String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}
      </div>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: `0 90px ${SAFE_BOTTOM_TEXT}px` }}>
        <KineticText text={text} accent={accent} accentColor={accentColor} startFrame={3} perWord={3} />
      </AbsoluteFill>
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM_HANDLE, left: 90 }}>
        <Handle color={PAPER} handle={handle} />
      </div>
    </AbsoluteFill>
  );
}

// ─── CTA V2 (mantém o da produção) ─────────────────────────────────────────────
function CtaTextV2({ cta, accent, handle }: { cta: string; accent: string; handle: string }) {
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
        <div style={{ fontFamily: FRAUNCES, fontWeight: 800, fontSize: 92, lineHeight: 1.1, color: WHITE, textShadow: "0 2px 28px rgba(0,0,0,0.55)", transform: `scale(${pulse})` }}>
          Siga <span style={{ color: accent }}>{handle}</span>
        </div>
        <div style={{ marginTop: 50, fontFamily: FRAUNCES, fontWeight: 400, fontSize: 50, lineHeight: 1.3, color: PAPER, opacity: 0.92, maxWidth: 880, textShadow: "0 2px 20px rgba(0,0,0,0.55)" }}>
          {cta}
        </div>
        <div style={{ marginTop: 60, fontFamily: FRAUNCES, fontSize: 40, fontWeight: 600, letterSpacing: 2, color: accent }}>
          → Mais no link da bio
        </div>
      </div>
    </AbsoluteFill>
  );
}

// ─── Composição V2 ─────────────────────────────────────────────────────────────
export const ReelV2: React.FC<ReelProps> = ({ title, slides, accentWords, cta, kw, ed, img, clips, clip, music, cat, handle = "@dr.liberdad", brand = "Dr. Libertad" }) => {
  const accent = CAT_ACCENT[cat ?? "freedom"] ?? RED;
  const safeSlides = (slides && slides.length ? slides : reelDefaultProps.slides).slice(0, 3);
  const { COVER, INSIGHT, CTA, n, total } = reelDurationsV2(safeSlides.length);
  const usedSlides = safeSlides.slice(0, n);

  const pool = clips && clips.length ? clips : clip ? [clip] : [];
  const sceneClip = (i: number) => (pool.length ? pool[i % pool.length] : undefined);

  let cursor = 0;
  const next = (dur: number) => {
    const from = cursor;
    cursor += dur;
    return from;
  };

  const musicSrc = music ? (/^https?:\/\//.test(music) ? music : staticFile(music)) : null;
  let sceneIdx = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0B0C" }}>
      <Sequence from={next(COVER)} durationInFrames={COVER}>
        <Scene clip={sceneClip(sceneIdx++)} img={img} kw={kw} accent={accent} dur={COVER}>
          <CoverTextV2 title={title} ed={ed} accent={accent} brand={brand} handle={handle} />
        </Scene>
      </Sequence>

      {usedSlides.map((text, i) => (
        <Sequence key={i} from={next(INSIGHT)} durationInFrames={INSIGHT}>
          <Scene clip={sceneClip(sceneIdx++)} img={img} kw={kw} accent={accent} dur={INSIGHT}>
            <InsightTextV2 text={text} accent={accentWords?.[i] ?? ""} accentColor={accent} index={i + 1} total={n} handle={handle} />
          </Scene>
        </Sequence>
      ))}

      <Sequence from={next(CTA)} durationInFrames={CTA}>
        <Scene clip={sceneClip(sceneIdx++)} img={img} kw={kw} accent={accent} dur={CTA}>
          <CtaTextV2 cta={cta} accent={accent} handle={handle} />
        </Scene>
      </Sequence>

      {musicSrc && (
        <Audio
          src={musicSrc}
          volume={(f) =>
            interpolate(f, [0, 15, total - 24, total], [0, 0.7, 0.7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
          }
        />
      )}
    </AbsoluteFill>
  );
};
