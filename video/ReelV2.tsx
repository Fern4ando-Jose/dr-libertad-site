// ─── ReelV2 — composição EXPERIMENTAL de RETENÇÃO (separada da produção) ───────
// NÃO roda em produção. É a versão de teste pra atacar o gargalo medido no /insights:
// watch médio 4,3s de ~25s (17%) → a galera sai DURANTE a capa de 5s. Mudanças:
//   1. CAPA 5,0s → 2,6s: mata o "vão" parado e leva a pessoa pro 1º insight rápido.
//   2. LEGENDA CINÉTICA: o insight entra palavra-por-palavra (movimento constante =
//      retenção; o olho não "para" como num slide estático).
//   3. RITMO / MOVIMENTO (esta tanda): a CENA NUNCA fica estática. Cada cena tem
//      câmera DIFERENTE (push-in/out, pan L↔R, ângulo) pela posição, e os insights
//      ganham um "CORTE"/reframe no meio (~2,6s) — um pulo de escala/posição que
//      simula um corte duro (Reels que retêm trocam de imagem a cada 1-2s). Assim
//      o olho registra uma mudança bem no ponto em que ele costumava sair.
// Reusa a CENA/GRADE comprovada do Reel (mesma cara de marca) via primitivos
// exportados (SCRIM, Texture, constantes do duotone) — sem copiar valores, sem drift.
// A produção (composição "Reel") fica intocada.
//
// (Stretch / próximo PR) LOCUÇÃO TTS — ver nota no fim do arquivo.
//
// Render de teste: `render-reel.mjs --composition=ReelV2` (CI), publish:no.

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
import {
  reelDefaultProps,
  type ReelProps,
  FPS,
  SCRIM,
  Texture,
  GRADE_FILTER,
  DUO_FLOOR,
  DUO_HIGHLIGHT,
  WARM_WASH,
} from "./Reel";

const { fontFamily: FRAUNCES } = loadFraunces();

// Constantes de texto (espelham o Reel; valores simples, isolados no V2 — não tocam
// a produção). A grade/footage vêm dos primitivos exportados.
const INK = "#0B0B0C";
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

// ─── Câmera V2: movimento VARIADO por cena (o olho não "para") ─────────────────
// A produção faz SEMPRE o mesmo push-in (zoom 1.06→1.16 + drift -28px) em toda
// cena → cenas vizinhas parecem iguais e o quadro "anda" igual. Aqui cada cena
// recebe um MOVIMENTO distinto pela posição (`variant`): empurra/afasta, gira a
// direção do pan e o ponto de origem. Além disso, nos insights há um "CORTE" no
// meio da cena — um salto de escala/posição (não-linear) que finge um corte duro.
type CamVariant = 0 | 1 | 2 | 3 | 4;

function cameraTransform(
  frame: number,
  dur: number,
  variant: CamVariant,
  withMidCut: boolean
): string {
  // Progresso 0→1 ao longo da cena.
  const p = interpolate(frame, [0, dur], [0, 1], { extrapolateRight: "clamp" });

  // Cada variante = uma câmera diferente (escala inicial/final, pan X, pan Y).
  // Mantém amplitude moderada (footage 9:16 cover-crop tem folga p/ pan sem barra).
  const PRESETS: Record<
    CamVariant,
    { z0: number; z1: number; x0: number; x1: number; y0: number; y1: number }
  > = {
    0: { z0: 1.06, z1: 1.2, x0: 0, x1: -34, y0: 0, y1: 0 }, // push-in + pan ←
    1: { z0: 1.22, z1: 1.08, x0: -28, x1: 18, y0: 0, y1: 0 }, // push-OUT + pan →
    2: { z0: 1.1, z1: 1.22, x0: 26, x1: -10, y0: -14, y1: 6 }, // push-in + diagonal
    3: { z0: 1.18, z1: 1.06, x0: 18, x1: -22, y0: 8, y1: -8 }, // push-out + pan ←↑
    4: { z0: 1.08, z1: 1.18, x0: -20, x1: 28, y0: 6, y1: -6 }, // push-in + pan →
  };
  const c = PRESETS[variant];

  let scale = interpolate(p, [0, 1], [c.z0, c.z1]);
  let x = interpolate(p, [0, 1], [c.x0, c.x1]);
  let y = interpolate(p, [0, 1], [c.y0, c.y1]);

  if (withMidCut) {
    // "Corte" no meio: ~no centro da cena o quadro PULA pra outro enquadramento
    // (reframe) num intervalo curtíssimo (~4 frames) → leitura de corte duro, sem
    // troca de clipe. Antes do corte uma câmera; depois, outra (mais fechada e
    // deslocada). A transição é rápida o bastante p/ parecer hard cut, não pan.
    const mid = Math.round(dur * 0.5);
    const cutIn = interpolate(frame, [mid, mid + 4], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    // Pós-corte: empurra +0.12 de escala e desloca o quadro (sente "outra imagem").
    scale += interpolate(cutIn, [0, 1], [0, 0.12]);
    x += interpolate(cutIn, [0, 1], [0, variant % 2 === 0 ? 36 : -36]);
    y += interpolate(cutIn, [0, 1], [0, variant % 2 === 0 ? -22 : 18]);
  }

  return `scale(${scale}) translateX(${x}px) translateY(${y}px)`;
}

// ─── Fundo graded de UMA cena V2 — MESMA grade da marca, câmera própria ────────
// Replica os 4 mix-blends da grade (constantes exportadas do Reel → sem drift),
// mas a CÂMERA vem de `cameraTransform` (varia por cena + corte no meio). Fallback
// img → watermark, como na produção.
function SceneBgV2({
  clip,
  img,
  kw,
  accent,
  dur,
  variant,
  withMidCut,
}: {
  clip?: string;
  img?: string;
  kw: string;
  accent: string;
  dur: number;
  variant: CamVariant;
  withMidCut: boolean;
}) {
  const frame = useCurrentFrame();
  const cam = cameraTransform(frame, dur, variant, withMidCut);

  if (clip) {
    return (
      <AbsoluteFill style={{ backgroundColor: DUO_FLOOR, overflow: "hidden", isolation: "isolate" }}>
        <AbsoluteFill style={{ transform: cam }}>
          <OffthreadVideo
            src={clip}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover", filter: GRADE_FILTER }}
          />
        </AbsoluteFill>
        {/* Grade da marca — MESMA ordem/valores do Reel (constantes exportadas). */}
        <AbsoluteFill style={{ backgroundColor: DUO_FLOOR, mixBlendMode: "screen" }} />
        <AbsoluteFill style={{ backgroundColor: DUO_HIGHLIGHT, mixBlendMode: "multiply" }} />
        <AbsoluteFill style={{ backgroundColor: WARM_WASH, opacity: 0.16, mixBlendMode: "soft-light" }} />
        <AbsoluteFill style={{ backgroundColor: accent, opacity: 0.18, mixBlendMode: "soft-light" }} />
      </AbsoluteFill>
    );
  }

  if (img) {
    return (
      <AbsoluteFill style={{ backgroundColor: INK, overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: cam }}>
          <Img src={img} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  const drift = interpolate(frame, [0, dur], [-20, 20], { extrapolateRight: "clamp" });
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

// Envelope de cena V2: fundo (câmera própria) + scrim + textura + conteúdo.
function SceneV2({
  clip,
  img,
  kw,
  accent,
  dur,
  variant,
  withMidCut,
  children,
}: {
  clip?: string;
  img?: string;
  kw: string;
  accent: string;
  dur: number;
  variant: CamVariant;
  withMidCut: boolean;
  children: React.ReactNode;
}) {
  return (
    <AbsoluteFill>
      <SceneBgV2 clip={clip} img={img} kw={kw} accent={accent} dur={dur} variant={variant} withMidCut={withMidCut} />
      <AbsoluteFill style={{ background: SCRIM }} />
      <Texture />
      {children}
    </AbsoluteFill>
  );
}

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

// ─── Insight V2: legenda cinética + "flash" de acento no corte do meio ─────────
function InsightTextV2({ text, accent, accentColor, index, total, handle, dur }: { text: string; accent: string; accentColor: string; index: number; total: number; handle: string; dur: number }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Acompanha o "corte" do fundo (meio da cena) com um leve reacento do contador
  // → reforça a sensação de mudança no exato ponto em que o público costuma sair.
  const mid = Math.round(dur * 0.5);
  const cutPulse = interpolate(frame, [mid - 2, mid + 2, mid + 8], [1, 1.18, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", top: SAFE_TOP, left: 90, fontFamily: FRAUNCES, fontSize: 40, fontWeight: 700, color: accentColor, opacity: o, transform: `scale(${cutPulse})`, transformOrigin: "left center" }}>
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
  // Câmera distinta por cena: cada uma pega a variante pelo índice (cobre 0..4).
  const variantFor = (i: number): CamVariant => (i % 5) as CamVariant;

  return (
    <AbsoluteFill style={{ backgroundColor: INK }}>
      <Sequence from={next(COVER)} durationInFrames={COVER}>
        <SceneV2 clip={sceneClip(sceneIdx)} img={img} kw={kw} accent={accent} dur={COVER} variant={variantFor(sceneIdx++)} withMidCut={false}>
          <CoverTextV2 title={title} ed={ed} accent={accent} brand={brand} handle={handle} />
        </SceneV2>
      </Sequence>

      {usedSlides.map((text, i) => (
        <Sequence key={i} from={next(INSIGHT)} durationInFrames={INSIGHT}>
          <SceneV2 clip={sceneClip(sceneIdx)} img={img} kw={kw} accent={accent} dur={INSIGHT} variant={variantFor(sceneIdx++)} withMidCut>
            <InsightTextV2 text={text} accent={accentWords?.[i] ?? ""} accentColor={accent} index={i + 1} total={n} handle={handle} dur={INSIGHT} />
          </SceneV2>
        </Sequence>
      ))}

      <Sequence from={next(CTA)} durationInFrames={CTA}>
        <SceneV2 clip={sceneClip(sceneIdx)} img={img} kw={kw} accent={accent} dur={CTA} variant={variantFor(sceneIdx++)} withMidCut={false}>
          <CtaTextV2 cta={cta} accent={accent} handle={handle} />
        </SceneV2>
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

// ─── (Stretch) LOCUÇÃO TTS — PLANO p/ o PRÓXIMO PR (NÃO implementado aqui) ──────
// Por que ficou de fora desta tanda: TTS exige um passo NOVO no pipeline do CI
// (gerar o áudio ANTES do render e empacotar em public/), sincronizar a fala com a
// legenda cinética por palavra, e mixar com a música — é alteração de pipeline, não
// só de composição. O escopo desta tanda é "movimento na cena, sem mexer na
// produção". Plano sugerido p/ o próximo PR, fail-open:
//   1. CI: `scripts/generate-vo.mjs` roda **edge-tts** (grátis, sem chave) a partir
//      do `title`+`slides`+`cta`, gerando `public/vo/<topic>.mp3` + um JSON de
//      timestamps por palavra (edge-tts expõe word boundaries). Cachear por
//      (topic, lang) como a música — reuso pra sempre, ES/PT separados (vozes
//      distintas: es-ES/pt-BR). Custo zero.
//   2. Composição: nova prop opcional `vo?: string` (caminho/URL) — se presente,
//      <Audio src={vo}> numa track própria + ABAIXAR a música (~0,7→0,25) sob a
//      locução (ducking via volume()). Sem `vo` → comportamento atual (só música).
//   3. Sincronia: alimentar o `startFrame`/`perWord` do KineticText pelos
//      timestamps do TTS (palavra acende quando é falada) → leitura guiada.
//   4. Riscos: vozes do edge-tts podem soar robóticas (validar amostra com o dono
//      antes de ligar); duração do VO pode passar da cena (clampar/cortar). Tudo
//      atrás de flag, fail-open: sem áudio gerado, o Reel sai como hoje.
