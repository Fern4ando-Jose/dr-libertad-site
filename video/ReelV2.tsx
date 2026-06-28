// ─── ReelV2 — composição EXPERIMENTAL de RETENÇÃO (separada da produção) ───────
// NÃO roda em produção (os workflows renderizam "Reel"). É a versão de teste pra atacar
// o gargalo medido no /insights: watch médio 4,3s de ~25s (17%) → a galera sai DURANTE
// a capa de 5s. Mudanças vs. o Reel de produção:
//   1. CAPA 5,0s → 3,0s: mata o "vão" parado e leva a pessoa pro 1º insight rápido
//      (curta o bastante p/ retenção, longa o bastante p/ o gancho cinético landar).
//   2. LEGENDA CINÉTICA: capa E insights entram palavra-por-palavra (movimento constante
//      = retenção; o olho não "para" como num slide estático).
//   3. CAPA VIVA, COR DE MARCA: kicker da marca em acento no topo + palavra-chave do
//      gancho na cor da marca + glow do acento (a capa branca/"morta" foi rejeitada).
//   4. DE-DUP (dedupeSlides): a geração às vezes faz slides[0] === título → capa e
//      insight 1 mostravam a MESMA frase (~8s repetidos). Aqui o insight ~igual ao
//      título é descartado (e a duração ajusta, sem cena preta no fim).
// Reusa a CENA/GRADE comprovada do Reel (mesma cara de marca) via `Scene` exportado —
// sem copiar, sem drift. A produção (composição "Reel") fica intocada.
//
// PENDENTE p/ promover a produção (decisão do dono): trocar a composição renderizada
// nos workflows; de-dup na ORIGEM (prompt, conserta o carrossel também); loop; voz/TTS.
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
// DE-DUP compartilhado (componente E Root.calculateMetadata usam o MESMO) → a duração
// da composição bate com o nº de insights REALMENTE renderizados (senão sobra cena preta
// no fim). A geração às vezes faz slides[0] === título; aqui descartamos os ~iguais.
export function dedupeSlides(title: string, slides: string[] | undefined): string[] {
  const raw = (slides && slides.length ? slides : reelDefaultProps.slides).slice(0, 3);
  const norm = (s: string) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const tnorm = norm(title);
  const distinct = raw.filter((s) => norm(s) !== tnorm);
  return distinct.length ? distinct : raw;
}

export function reelDurationsV2(slidesCount: number, hasFunnel = false) {
  const COVER = Math.round(FPS * 3.0); // era 5,0 — capa curta, mas com tempo do gancho cinético LANDAR
  const INSIGHT = Math.round(FPS * 5.6);
  const CTA = Math.round(FPS * 4.6);
  const FUNNEL = hasFunnel ? Math.round(FPS * 4.8) : 0; // end-card do funil (comment→DM) com a arte do livro
  const n = Math.min(Math.max(slidesCount || 1, 1), 3);
  return { COVER, INSIGHT, CTA, FUNNEL, n, total: COVER + INSIGHT * n + CTA + FUNNEL };
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

// Palavra de realce da CAPA: o kw da marca se aparece no título; senão a última
// palavra (a "essência" do dono costuma cair no fim da frase). Vai na cor da marca.
function pickCoverAccent(title: string, kw: string): string {
  const words = (title || "").split(/\s+/).filter(Boolean);
  const strip = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, "");
  if (kw) {
    const m = words.find((w) => strip(w).includes(strip(kw)) && strip(kw).length > 2);
    if (m) return strip(m);
  }
  return strip(words[words.length - 1] || "");
}

// ─── Capa V2: gancho cinético + IDENTIDADE DE MARCA (cor, kicker, movimento) ───
// Antes a capa era "morta": título branco embaixo + "Nº" no topo (ruído p/ quem
// chega frio). Agora: kicker da marca em ACENTO no topo, gancho que entra palavra
// a palavra com a palavra-chave na cor da marca, fundo com glow do acento. Frame 0
// segue limpo (o texto entra no play ~0,1s) — respeita a capa-de-grid sem título.
function CoverTextV2({ title, accent, brand, handle, kw }: { title: string; accent: string; brand: string; handle: string; kw: string }) {
  const frame = useCurrentFrame();
  const coverAccent = pickCoverAccent(title, kw);
  const kickerO = interpolate(frame, [1, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barW = interpolate(frame, [2, 14], [0, 96], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      {/* Glow do acento atrás do texto → tira o "morto", dá profundidade de marca */}
      <AbsoluteFill style={{ background: `radial-gradient(60% 38% at 26% 78%, ${accent}38 0%, rgba(0,0,0,0) 70%)` }} />
      {/* Kicker da marca no topo, EM COR DE ACENTO (identidade sem o "Nº") */}
      <div style={{ position: "absolute", top: SAFE_TOP, left: 90, display: "flex", alignItems: "center", gap: 22, opacity: kickerO }}>
        <div style={{ width: barW, height: 7, backgroundColor: accent, borderRadius: 4 }} />
        <div style={{ fontFamily: FRAUNCES, fontSize: 36, fontWeight: 700, letterSpacing: 5, color: accent }}>
          {brand.toUpperCase()}
        </div>
      </div>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "flex-start", padding: `0 90px ${SAFE_BOTTOM_TEXT}px` }}>
        {/* Gancho cinético, maior, com a palavra-chave na cor da marca */}
        <KineticText text={title} accent={coverAccent} accentColor={accent} startFrame={3} perWord={2} fontSize={108} />
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

// ─── End-card do FUNIL (comment→DM): "Comenta [palavra]" PULSANDO sobre a arte do livro ─
// Só entra quando o funil está ligado (a API manda `funnel` no preview). Fundo = a CAPA
// do "I Love Dopamina" (cérebro + gradiente) via <Scene img>. A palavra-chave pulsa
// (escala + halo) pra chamar o olho — o "movimento" que o dono pediu.
const FUNNEL_MAGENTA = "#D4357E"; // magenta do gradiente da capa (= pílula do carrossel)
function FunnelTextV2({ keyword, action, note, handle }: { keyword: string; action: string; note: string; handle: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 22 });
  const rise = interpolate(entry, [0, 1], [44, 0]);
  // PULSO da palavra-chave: escala ±7% + halo que respira (~1,1 Hz)
  const t = (frame / fps) * Math.PI * 2 * 1.1;
  const pulse = 1 + 0.07 * Math.sin(t);
  const halo = 34 + 48 * (0.5 + 0.5 * Math.sin(t));
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", padding: `0 80px ${SAFE_BOTTOM_TEXT}px` }}>
      <div style={{ opacity: entry, transform: `translateY(${rise}px)`, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: 50, color: WHITE, textShadow: "0 2px 22px rgba(0,0,0,0.6)", marginBottom: 38 }}>
          {action}
        </div>
        <div style={{ transform: `scale(${pulse})`, borderRadius: 9999, padding: "32px 86px", background: FUNNEL_MAGENTA, boxShadow: `0 0 ${halo}px ${FUNNEL_MAGENTA}` }}>
          <div style={{ fontFamily: FRAUNCES, fontWeight: 800, fontSize: 104, letterSpacing: 8, color: WHITE, textTransform: "uppercase" }}>
            {keyword}
          </div>
        </div>
        <div style={{ fontFamily: FRAUNCES, fontWeight: 400, fontSize: 46, color: PAPER, opacity: 0.92, marginTop: 38, maxWidth: 900, textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>
          {note}
        </div>
      </div>
      <div style={{ position: "absolute", bottom: SAFE_BOTTOM_HANDLE, left: 90 }}>
        <Handle color={PAPER} handle={handle} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Composição V2 ─────────────────────────────────────────────────────────────
export const ReelV2: React.FC<ReelProps> = ({ title, slides, accentWords, cta, kw, img, clips, clip, music, cat, funnel, handle = "@dr.liberdad", brand = "Dr. Libertad" }) => {
  const accent = CAT_ACCENT[cat ?? "freedom"] ?? RED;
  // DE-DUP (mesmo helper do Root.calculateMetadata) → capa e insight 1 nunca repetem,
  // e a duração da composição bate com os insights de verdade (sem cena preta no fim).
  const safeSlides = dedupeSlides(title, slides);
  const { COVER, INSIGHT, CTA, FUNNEL, n, total } = reelDurationsV2(safeSlides.length, !!funnel);
  const usedSlides = safeSlides.slice(0, n);
  const funnelCover = funnel?.cover
    ? (/^https?:\/\//.test(funnel.cover) ? funnel.cover : staticFile(funnel.cover))
    : undefined;

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
          <CoverTextV2 title={title} accent={accent} brand={brand} handle={handle} kw={kw} />
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

      {funnel && (
        <Sequence from={next(FUNNEL)} durationInFrames={FUNNEL}>
          {/* fundo = ARTE DO LIVRO (capa) em vez de footage → end-card do funil */}
          <Scene img={funnelCover} kw={kw} accent={accent} dur={FUNNEL}>
            <FunnelTextV2 keyword={funnel.keyword} action={funnel.action} note={funnel.note} handle={handle} />
          </Scene>
        </Sequence>
      )}

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
