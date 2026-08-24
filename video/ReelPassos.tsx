// ─── ReelPassos — composição NOVA, grid+numeral+barra-de-progresso ────────────
// ⚠️ NÃO É PRODUÇÃO. Composição adicional, disponível para adoção futura — a
// automação (`instagram-reels.yml`/`instagram-reels-pt.yml`) segue renderizando
// `ReelV2` (P1.5: o que funciona não se toca). Ver CLAUDE.md/registro desta tarefa
// para o que falta para "ligar" esta composição como padrão.
//
// Origem: engenharia reversa (23/08/2026) de 2 contas do nicho que estão
// CRESCENDO DE VERDADE agora — @estoicodiario (streak de 9 dias, 330K) e
// @HONORESTOICO (263K→481K). Post de referência: instagram.com/estoicodiario/
// reel/DcYTYyGs1Po/. O padrão vencedor confirmado ao vivo:
//   • fundo preto puro em toda a peça;
//   • grid de linhas verticais finas cobrindo o fundo (papel milimetrado);
//   • numeral gigante em contorno fino, marca-d'água do "passo" atual, canto
//     inferior direito;
//   • label "PASSO 0X" cinza translúcido, caixa alta, letter-spacing aberto,
//     acima de uma linha divisória curta;
//   • título grande, alinhado à esquerda, 3-4 linhas curtas;
//   • barra de progresso customizada no rodapé (não a nativa do Reels);
//   • vários blocos curtos no MESMO molde (só o texto do passo muda), com um
//     bloco final mais longo de CTA.
//
// Paleta é a NOSSA marca (cores dadas pelo dono na tarefa — não as da referência):
// preto #0A0A0A, off-white #F2EEE6, acento âmbar #C8922E.
//
// Tipografia: SÓ Fraunces (fonte única já embutida no projeto — não adiciona
// peso novo; usa os mesmos pesos que Reel.tsx/ReelV2.tsx já carregam com esta
// MESMA chamada `loadFraunces()`).
//
// Timing/testabilidade: TODA a lógica de tempo/progresso é PURA (sem JSX) —
// `reelDurationsPassos`, `reelPlanPassos`, `activeIndexAtFrame`, `numeralFor`,
// `labelFor` — testada em `ReelPassos.test.ts` sem precisar renderizar nada.

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
import { FPS } from "./Reel";
// Reusa a MESMA função do ReelV2 (fonte única) — o idioma da peça é lido do @ da
// conta, nunca hardcoded. Corrige o bug pego no QA visual local (23/08): a label
// saía "PASSO" (PT) por baixo de `@dr.liberdad`/"Sigue" (ES) — mistura de idioma
// na mesma peça é o defeito que `lang-guard.ts` existe para barrar em produção.
import { langDoHandle } from "./ReelV2";

const { fontFamily: FRAUNCES } = loadFraunces();

// ─── Paleta da marca (dada pelo dono nesta tarefa) ────────────────────────────
export const PASSOS_BLACK = "#0A0A0A";
export const PASSOS_OFFWHITE = "#F2EEE6";
export const PASSOS_AMBER = "#C8922E";

const MARGIN = 96;
const CONTENT_WIDTH = 1080 - MARGIN * 2;
const SAFE_TOP = 260;
const TEXT_BOTTOM = 400;
const PROGRESS_BOTTOM = 190;
const HANDLE_BOTTOM = 90;

// ─── Props ──────────────────────────────────────────────────────────────────
export type ReelPassosStep = {
  text: string; // corpo curto do passo (3-4 linhas curtas na tela)
  label?: string; // override de "PASSO 0X" (default = gerado do índice)
};

export type ReelPassosProps = {
  steps: ReelPassosStep[];
  cta: string;
  ctaNote?: string; // linha curta abaixo do CTA (ex.: convite pro link/comentário)
  handle?: string;
  brand?: string;
  ctaFollow?: string; // verbo "seguir" por idioma
  ctaBio?: string; // linha "link da bio" por idioma
  // Cama musical (mesmo mecanismo de ReelV2/pick-music.cjs — UMA faixa por TEMA,
  // já resolvida antes do render; custo zero, arquivo reusado). SEM narração
  // aqui de propósito (P1.5 do escopo desta tarefa: o timing de cada passo é
  // FIXO — reelDurationsPassos —, não medido pela fala; sincronizar narração
  // exigiria a mesma engenharia de reelPlanV2/wordFrames do ReelV2, fora do
  // escopo pedido). Sem música → peça muda (fail-open; mesmo risco que ReelV2
  // já corre quando pick-music.cjs não acha faixa nenhuma).
  music?: string;
};

export const reelPassosDefaultProps: ReelPassosProps = {
  steps: [
    { text: "Identifica el gatillo que te hace abrir la app sin pensar" },
    { text: "Cuenta hasta tres antes de tocar la pantalla" },
    { text: "Cambia el hábito por algo que te cueste el mismo esfuerzo" },
    { text: "Repite hasta que la libertad sea automática" },
  ],
  cta: "¿Cuál es tu primer paso hoy?",
  // ⚠️ 2026-08-23 — SEM ctaNote default de propósito. Remotion faz MERGE raso do
  // `--props` com o defaultProps (não substitui por inteiro) — um Reel BR real
  // renderizado sem `ctaNote` no reel-props.json (o pipeline não gera essa linha)
  // ACENDEU o valor default em ESPANHOL por baixo do handle @dr.liberdade.br
  // (achado no 1º render de teste com conteúdo real, run 32676723055). É a MESMA
  // classe de defeito que lang-guard.ts existe pra barrar ("Influência não
  // absuelve", 04/08). Workflow também manda `ctaNote: ""` explícito (defesa em
  // profundidade) — mas o default aqui NUNCA pode ser uma frase só-ES.
  handle: "@dr.liberdad",
  brand: "Dr. Libertad",
  ctaFollow: "Sigue",
  ctaBio: "→ Más en el link de la bio",
  music: "music/bed-0.mp3", // QA local/preview — produção manda a faixa do TEMA (pick-music.cjs)
};

// ─── Tempos — fonte única (componente + Root.calculateMetadata) ──────────────
// Blocos de passo ~4,5s cada (régua "~4-5s cada" do padrão observado); bloco
// final de CTA mais longo (~6s), como no post de referência.
export function reelDurationsPassos(stepsCount: number) {
  const STEP = Math.round(FPS * 4.5);
  const CTA = Math.round(FPS * 6.0);
  const n = Math.max(1, Math.min(stepsCount || 1, 8));
  return { STEP, CTA, n, total: STEP * n + CTA };
}

export type ReelPassosScene =
  | { kind: "step"; stepIndex: number; fromFrame: number; durationInFrames: number }
  | { kind: "cta"; fromFrame: number; durationInFrames: number };

export interface ReelPassosPlan {
  scenes: ReelPassosScene[];
  n: number; // nº de passos realmente usados
  total: number;
}

/**
 * O PLANO — cenas contíguas, sem buraco: passo 0..n-1 (STEP frames cada) + cta
 * (CTA frames). Usada pelo componente E pelo `Root.calculateMetadata` (mesma
 * fonte, nunca diverge — é o mesmo padrão de `reelPlanV2`).
 */
export function reelPlanPassos(stepsCount: number): ReelPassosPlan {
  const { STEP, CTA, n, total } = reelDurationsPassos(stepsCount);
  const scenes: ReelPassosScene[] = [];
  let cursor = 0;
  for (let i = 0; i < n; i++) {
    scenes.push({ kind: "step", stepIndex: i, fromFrame: cursor, durationInFrames: STEP });
    cursor += STEP;
  }
  scenes.push({ kind: "cta", fromFrame: cursor, durationInFrames: CTA });
  cursor += CTA;
  return { scenes, n, total };
}

/**
 * O índice ATIVO da barra de progresso num frame GLOBAL da peça: 0..n-1 durante
 * o passo correspondente, e `n` (= "concluído") durante o bloco final de CTA.
 * Pura — é o que o teste de invariante trava, sem precisar renderizar nada.
 */
export function activeIndexAtFrame(frame: number, plan: ReelPassosPlan): number {
  const f = Math.max(0, Math.min(frame, plan.total - 1));
  const scene = plan.scenes.find((s) => f >= s.fromFrame && f < s.fromFrame + s.durationInFrames);
  if (!scene) return plan.n; // fail-safe: nunca deixa a barra "sem posição"
  return scene.kind === "step" ? scene.stepIndex : plan.n;
}

/** "01", "02", … — o numeral gigante e o label PASSO usam a MESMA função. */
export function numeralFor(index: number): string {
  return String(Math.max(0, index) + 1).padStart(2, "0");
}

/** A palavra "passo" por idioma — ES "PASO" (uma letra S; erro comum é "PASSO", PT). */
export function stepWord(lang: "es" | "br" = "es"): string {
  return lang === "br" ? "PASSO" : "PASO";
}

/** A palavra do bloco final ("concluído") por idioma. */
export function doneWord(lang: "es" | "br" = "es"): string {
  return lang === "br" ? "PRONTO" : "LISTO";
}

/** Label "PASO 0X"/"PASSO 0X" — usa o override do passo se vier, senão gera do índice+idioma. */
export function labelFor(index: number, override?: string, lang: "es" | "br" = "es"): string {
  return override && override.trim() ? override.trim().toUpperCase() : `${stepWord(lang)} ${numeralFor(index)}`;
}

/**
 * Curva de volume da cama musical: sobe nos 15 primeiros frames, segura em
 * `max`, desce nos 24 frames finais. Pura (frame → volume), sem `loop` no
 * cálculo — o componente lê o frame da PEÇA (não o do áudio), mesmo motivo
 * documentado em ReelV2 (`curvaDaMusica`): com `loop` ligado, o frame relativo
 * ao áudio volta a zero a cada repetição e reabriria o fade no meio da peça.
 */
export function musicVolumeAtFrame(frame: number, total: number, max = 0.55): number {
  const rampaFim = Math.min(15, Math.max(1, total - 1));
  const fadeInicio = Math.max(rampaFim, total - 24);
  return interpolate(frame, [0, rampaFim, fadeInicio, total], [0, max, max, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

// ─── Fundo: grid de linhas verticais finas (papel milimetrado, quase invisível) ─
function GridBg() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: PASSOS_BLACK,
        backgroundImage: `repeating-linear-gradient(90deg, ${PASSOS_OFFWHITE}0D 0px, ${PASSOS_OFFWHITE}0D 1px, transparent 1px, transparent 64px)`,
      }}
    />
  );
}

// ─── Numeral gigante em contorno fino — marca-d'água do passo atual ──────────
function NumeralWatermark({ n }: { n: string }) {
  return (
    <div
      style={{
        position: "absolute",
        right: -20,
        bottom: -60,
        fontFamily: FRAUNCES,
        fontWeight: 900,
        fontSize: 620,
        lineHeight: 1,
        color: "transparent",
        WebkitTextStroke: `2px ${PASSOS_OFFWHITE}40`,
        userSelect: "none",
        pointerEvents: "none",
      }}
    >
      {n}
    </div>
  );
}

function Handle({ handle = "@dr.liberdad" }: { handle?: string }) {
  return (
    <div style={{ fontFamily: FRAUNCES, fontSize: 34, fontWeight: 600, letterSpacing: 2, color: PASSOS_OFFWHITE, opacity: 0.6 }}>
      {handle}
    </div>
  );
}

// ─── Label "PASSO 0X" + linha divisória curta ─────────────────────────────────
function StepLabel({ label }: { label: string }) {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const barW = interpolate(frame, [0, 14], [0, 72], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ opacity: o }}>
      <div style={{ fontFamily: FRAUNCES, fontWeight: 600, fontSize: 32, letterSpacing: 8, color: PASSOS_OFFWHITE, opacity: 0.4 }}>
        {label}
      </div>
      <div style={{ marginTop: 18, width: barW, height: 3, backgroundColor: PASSOS_OFFWHITE, borderRadius: 2 }} />
    </div>
  );
}

// ─── Título do passo: Fraunces bold, esquerda, 3-4 linhas curtas ──────────────
function StepTitle({ text }: { text: string }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const settle = spring({ frame, fps, config: { damping: 200, stiffness: 220 }, durationInFrames: 14 });
  const y = interpolate(settle, [0, 1], [26, 0]);
  const o = interpolate(frame, [2, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        transform: `translateY(${y}px)`,
        opacity: o,
        fontFamily: FRAUNCES,
        fontWeight: 700,
        fontSize: 84,
        lineHeight: 1.14,
        color: PASSOS_OFFWHITE,
        maxWidth: CONTENT_WIDTH,
        textShadow: "0 2px 24px rgba(0,0,0,0.6)",
      }}
    >
      {text}
    </div>
  );
}

// ─── Barra de progresso customizada: n marcadores + 1 ponto que avança ───────
function ProgressBar({ n, activeIndex }: { n: number; activeIndex: number }) {
  const width = Math.min(560, Math.max(160, n * 74));
  const gap = n > 1 ? width / (n - 1) : 0;
  const dotIndex = Math.min(activeIndex, n - 1);
  const dotX = n > 1 ? dotIndex * gap : width / 2;
  const done = activeIndex >= n;
  const fillX = n > 1 ? Math.min(dotX, width) : width;
  return (
    <div style={{ position: "relative", width, height: 26 }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          width,
          height: 2,
          borderRadius: 2,
          backgroundColor: PASSOS_OFFWHITE,
          opacity: 0.18,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 12,
          width: fillX,
          height: 2,
          borderRadius: 2,
          backgroundColor: done ? PASSOS_AMBER : PASSOS_OFFWHITE,
          opacity: 0.85,
        }}
      />
      {Array.from({ length: n }).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: n > 1 ? i * gap : width / 2 - 1.5,
            top: 3,
            width: 3,
            height: 20,
            borderRadius: 2,
            backgroundColor: PASSOS_OFFWHITE,
            opacity: i <= activeIndex ? 0.85 : 0.22,
          }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: dotX - 7,
          top: -3,
          width: 24,
          height: 24,
          borderRadius: 999,
          backgroundColor: done ? PASSOS_AMBER : PASSOS_OFFWHITE,
          boxShadow: `0 0 16px ${done ? PASSOS_AMBER : PASSOS_OFFWHITE}88`,
        }}
      />
    </div>
  );
}

// ─── Molde de UMA cena (passo OU cta) — grid + numeral + label + texto + barra ─
function PassoFrame({
  n,
  activeIndex,
  numeral,
  label,
  children,
  handle,
}: {
  n: number;
  activeIndex: number;
  numeral: string;
  label: string;
  children: React.ReactNode;
  handle?: string;
}) {
  return (
    <AbsoluteFill>
      <GridBg />
      <NumeralWatermark n={numeral} />
      <div style={{ position: "absolute", top: SAFE_TOP, left: MARGIN }}>
        <StepLabel label={label} />
      </div>
      <div style={{ position: "absolute", bottom: TEXT_BOTTOM, left: MARGIN, width: CONTENT_WIDTH }}>
        {children}
      </div>
      <div style={{ position: "absolute", bottom: PROGRESS_BOTTOM, left: MARGIN }}>
        <ProgressBar n={n} activeIndex={activeIndex} />
      </div>
      <div style={{ position: "absolute", bottom: HANDLE_BOTTOM, left: MARGIN }}>
        <Handle handle={handle} />
      </div>
    </AbsoluteFill>
  );
}

// ─── Cena final: CTA, mesmo molde, texto maior + convite ──────────────────────
function CtaScene({ cta, ctaNote, n, handle, brand, ctaFollow, ctaBio, lang }: { cta: string; ctaNote?: string; n: number; handle?: string; brand?: string; ctaFollow?: string; ctaBio?: string; lang: "es" | "br" }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entry = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 26 });
  const o = interpolate(entry, [0, 1], [0, 1]);
  const y = interpolate(entry, [0, 1], [24, 0]);
  return (
    <PassoFrame n={n} activeIndex={n} numeral={numeralFor(n - 1)} label={doneWord(lang)} handle={handle}>
      <div style={{ transform: `translateY(${y}px)`, opacity: o }}>
        <div
          style={{
            fontFamily: FRAUNCES,
            fontWeight: 700,
            fontSize: 88,
            lineHeight: 1.12,
            color: PASSOS_OFFWHITE,
            maxWidth: CONTENT_WIDTH,
            textShadow: "0 2px 24px rgba(0,0,0,0.6)",
          }}
        >
          {cta}
        </div>
        {ctaNote ? (
          <div style={{ marginTop: 26, fontFamily: FRAUNCES, fontWeight: 400, fontSize: 38, color: PASSOS_OFFWHITE, opacity: 0.75, maxWidth: CONTENT_WIDTH }}>
            {ctaNote}
          </div>
        ) : null}
        <div style={{ marginTop: 34, fontFamily: FRAUNCES, fontWeight: 600, fontSize: 34, letterSpacing: 2, color: PASSOS_AMBER }}>
          {ctaFollow ?? "Sigue"} {handle ?? "@dr.liberdad"} · {ctaBio ?? "→ Más en el link de la bio"}
        </div>
        {brand ? (
          <div style={{ marginTop: 28, fontFamily: FRAUNCES, fontWeight: 400, fontSize: 24, letterSpacing: 4, color: PASSOS_OFFWHITE, opacity: 0.35 }}>
            {brand.toUpperCase()}
          </div>
        ) : null}
      </div>
    </PassoFrame>
  );
}

// ─── Composição ────────────────────────────────────────────────────────────────
export const ReelPassos: React.FC<ReelPassosProps> = (props) => {
  const {
    steps, cta, ctaNote, handle = "@dr.liberdad", brand = "Dr. Libertad", ctaFollow = "Sigue", ctaBio = "→ Más en el link de la bio", music,
  } = props;
  const safeSteps = steps && steps.length ? steps : reelPassosDefaultProps.steps;
  const plan = reelPlanPassos(safeSteps.length);
  const usedSteps = safeSteps.slice(0, plan.n);
  const lang = langDoHandle(handle);
  const musicSrc = music ? (/^https?:\/\//.test(music) ? music : staticFile(music)) : null;
  const frameDaPeca = useCurrentFrame();
  const musicVol = musicVolumeAtFrame(frameDaPeca, plan.total);

  return (
    <AbsoluteFill style={{ backgroundColor: PASSOS_BLACK }}>
      {usedSteps.map((step, i) => {
        const scene = plan.scenes[i];
        return (
          <Sequence key={i} from={scene.fromFrame} durationInFrames={scene.durationInFrames}>
            <PassoFrame n={plan.n} activeIndex={i} numeral={numeralFor(i)} label={labelFor(i, step.label, lang)} handle={handle}>
              <StepTitle text={step.text} />
            </PassoFrame>
          </Sequence>
        );
      })}

      {(() => {
        const ctaScene = plan.scenes[plan.scenes.length - 1];
        return (
          <Sequence from={ctaScene.fromFrame} durationInFrames={ctaScene.durationInFrames}>
            <CtaScene cta={cta} ctaNote={ctaNote} n={plan.n} handle={handle} brand={brand} ctaFollow={ctaFollow} ctaBio={ctaBio} lang={lang} />
          </Sequence>
        );
      })()}

      {/* Cama musical — mesma faixa por TEMA que o resto do Reel usa (pick-music.cjs),
          sem narração (ver nota em ReelPassosProps.music). Garante que a peça
          renderizada tenha trilha de áudio real — a conferência de render
          (scripts/conferir-render.mjs) barra qualquer Reel sem som. */}
      {musicSrc && <Audio src={musicSrc} loop volume={musicVol} />}
    </AbsoluteFill>
  );
};
