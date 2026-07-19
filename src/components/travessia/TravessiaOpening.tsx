"use client";

/**
 * A TRAVESSIA DA GAIOLA — abertura cinematográfica da home.
 *
 * Uma section alta (≈100vh por cena) com um palco sticky: conforme o visitante
 * rola, os QUADROS dos vídeos das 7 cenas avançam (e retrocedem) num <canvas>,
 * com os textos reais do dicionário entrando por cena. Sem ScrollTrigger/pin:
 * o progresso é lido num rAF próprio a partir do scroll nativo (que o Lenis
 * anima), o que evita conflito com o GsapOrchestrator global e é 100% reversível.
 *
 * Fail-open: se um manifest.json de cena não existir/falhar, a cena usa o
 * poster (storyboard) parado — a narrativa nunca quebra.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLang } from "@/lib/i18n/LanguageProvider";

const SCENES = [1, 2, 3, 4, 5, 6, 7] as const;
const N = SCENES.length;
/** sobreposição do crossfade entre cenas, em fração do trecho de UMA cena */
const FADE = 0.18;

type Manifest = {
  frameCount: number;
  pattern: string;
  first: number;
  width: number;
  height: number;
  ext: string;
  fps: number;
  sourceDuration: number;
  poster: string;
};

type SceneMedia = {
  manifest: Manifest | null;
  frames: (HTMLImageElement | null)[];
  poster: HTMLImageElement | null;
  loading: boolean;
  failed: boolean;
};

function framePath(base: string, m: Manifest, i: number) {
  const n = String(m.first + i).padStart(3, "0");
  return `${base}/${m.pattern.replace("%03d", n)}`;
}

/** desenha a imagem em modo "cover" (preenche sem distorcer) */
function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number
) {
  const iw = img.naturalWidth || 1;
  const ih = img.naturalHeight || 1;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

export default function TravessiaOpening() {
  const { t, lang } = useLang();
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mediaRef = useRef<SceneMedia[]>([]);
  const progressRef = useRef(0);
  const rafRef = useRef<number>(0);
  const [reduced, setReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  /** cena ativa (0..6) — só muda em limiares; controla os textos via CSS */
  const [active, setActive] = useState(0);
  /** passo do texto dentro da cena (0..3) para entradas graduais */
  const [step, setStep] = useState(0);

  const tv = t.travessia;

  // preferências / viewport
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    onMq();
    mq.addEventListener("change", onMq);
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => {
      mq.removeEventListener("change", onMq);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const variant = isMobile ? "mobile" : "desktop";

  const loadScene = useCallback(
    (idx: number) => {
      const media = mediaRef.current[idx];
      if (!media || media.loading || media.manifest || media.failed) return;
      media.loading = true;
      const base = `/generated/sequences/scene-0${SCENES[idx]}/${variant}`;
      fetch(`${base}/manifest.json`)
        .then((r) => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json() as Promise<Manifest>;
        })
        .then((m) => {
          media.manifest = m;
          media.frames = new Array(m.frameCount).fill(null);
          // carrega progressivamente; os primeiros com prioridade
          for (let i = 0; i < m.frameCount; i++) {
            const img = new Image();
            img.decoding = "async";
            img.src = framePath(base, m, i);
            img.onload = () => {
              media.frames[i] = img;
            };
          }
        })
        .catch(() => {
          media.failed = true;
        })
        .finally(() => {
          media.loading = false;
        });
    },
    [variant]
  );

  // mídia: posters sempre; quadros sob demanda
  useEffect(() => {
    if (reduced) return;
    mediaRef.current = SCENES.map((s) => {
      const poster = new Image();
      poster.decoding = "async";
      poster.src = `/generated/storyboard/scene-0${s}.png`;
      return { manifest: null, frames: [], poster, loading: false, failed: false };
    });
    // cena 1 e 2 já começam a carregar; as demais quando se aproximarem
    loadScene(0);
    loadScene(1);
    const first = mediaRef.current[0].poster;
    if (first) {
      if (first.complete) setReady(true);
      else first.onload = () => setReady(true);
    }
    return () => {
      mediaRef.current = [];
    };
  }, [reduced, loadScene]);

  // laço principal: progresso -> desenho + estados de texto
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastActive = -1;
    let lastStep = -1;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;
      progressRef.current = p;

      // dimensões (DPR até 2)
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const seg = 1 / N;
      const idx = Math.min(N - 1, Math.floor(p / seg));
      const local = (p - idx * seg) / seg; // 0..1 dentro da cena

      // pré-carrega vizinhas
      loadScene(idx);
      if (idx + 1 < N) loadScene(idx + 1);

      const pick = (i: number, lp: number): HTMLImageElement | null => {
        const m = mediaRef.current[i];
        if (!m) return null;
        if (m.manifest && m.frames.length) {
          const fi = Math.min(
            m.manifest.frameCount - 1,
            Math.max(0, Math.round(lp * (m.manifest.frameCount - 1)))
          );
          // usa o quadro mais próximo já carregado (busca para trás)
          for (let k = fi; k >= 0; k--) {
            const f = m.frames[k];
            if (f && f.complete && f.naturalWidth > 0) return f;
          }
        }
        const po = m.poster;
        return po && po.complete && po.naturalWidth > 0 ? po : null;
      };

      ctx.fillStyle = "#0B0B0C";
      ctx.fillRect(0, 0, cw, ch);

      const img = pick(idx, local);
      if (img) {
        ctx.globalAlpha = 1;
        drawCover(ctx, img, cw, ch);
      }
      // crossfade: início da cena atual recebe o fim da anterior por cima
      if (idx > 0 && local < FADE) {
        const prev = pick(idx - 1, 1);
        if (prev) {
          ctx.globalAlpha = 1 - local / FADE;
          drawCover(ctx, prev, cw, ch);
          ctx.globalAlpha = 1;
        }
      }

      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
      const st = local < 0.3 ? 0 : local < 0.55 ? 1 : local < 0.8 ? 2 : 3;
      if (st !== lastStep) {
        lastStep = st;
        setStep(st);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduced, loadScene]);

  const scrollToManifesto = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("manifesto");
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    const lenis = (window as any).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  }, []);

  const estudoHref = lang === "es" ? "/el-estudio" : "/o-estudo";

  /** classes utilitárias de entrada de texto (fade + máscara vertical suave) */
  const on = "opacity-100 translate-y-0";
  const off = "opacity-0 translate-y-4";
  const baseTxt =
    "transition-all duration-700 ease-out will-change-transform";

  const sceneTexts = useMemo(
    () => [
      // cena 1 — captura (título + CTAs reais do hero)
      (a: boolean, s: number) => (
        <div className="max-w-3xl">
          <div className={`${baseTxt} ${a ? on : off} flex flex-wrap gap-2`}>
            {t.hero.chips.map((chip) => (
              <span key={chip} className="dl-chip">
                {chip}
              </span>
            ))}
          </div>
          <h1 className={`${baseTxt} ${a ? on : off} mt-6 font-serif text-[clamp(2.4rem,5.2vw,4.8rem)] leading-[0.98] tracking-[-0.04em]`}>
            {tv.c1a}{" "}
            <em className={`${baseTxt} ${a && s >= 1 ? on : off} not-italic md:italic text-muted-red inline-block`}>
              {tv.c1b}
            </em>
          </h1>
          <div className={`${baseTxt} ${a && s >= 1 ? on : off} mt-8 flex flex-wrap items-center gap-3`}>
            <a
              href="#manifesto"
              onClick={scrollToManifesto}
              className="inline-flex items-center rounded-full border border-warm-gray/25 bg-black/30 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90 hover:bg-black/50 transition"
            >
              {t.hero.ctaPrimary} <span className="ml-3 text-muted-red">→</span>
            </a>
            <a
              href={estudoHref}
              className="inline-flex items-center rounded-full border border-muted-red/40 bg-black/30 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90 hover:border-muted-red/70 transition"
            >
              {t.hero.ctaSecondary} <span className="ml-3 text-muted-red">→</span>
            </a>
          </div>
        </div>
      ),
      // cena 2 — repetição
      (a: boolean, s: number) => (
        <div className="max-w-2xl">
          <p className={`${baseTxt} ${a ? on : off} font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.05]`}>
            {tv.c2a}
          </p>
          <p className={`${baseTxt} ${a && s >= 1 ? on : off} mt-4 font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.05] text-muted-red`}>
            {tv.c2b}
          </p>
        </div>
      ),
      // cena 3 — saturação
      (a: boolean, s: number) => (
        <div className="max-w-2xl">
          <p className={`${baseTxt} ${a ? on : off} font-serif text-[clamp(1.8rem,3.2vw,2.9rem)] leading-[1.08]`}>
            {tv.c3a}
          </p>
          <p className={`${baseTxt} ${a && s >= 1 ? on : off} mt-3 font-serif text-[clamp(1.8rem,3.2vw,2.9rem)] leading-[1.08]`}>
            {tv.c3b}
          </p>
          <p className={`${baseTxt} ${a && s >= 2 ? on : off} mt-3 font-serif text-[clamp(1.8rem,3.2vw,2.9rem)] leading-[1.08] text-warm-gray`}>
            {tv.c3c}
          </p>
        </div>
      ),
      // cena 4 — pausa (ritual dos 90s, um passo por vez)
      (a: boolean, s: number) => (
        <div className="max-w-2xl">
          <p className={`${baseTxt} ${a ? on : off} font-serif text-[clamp(1.7rem,3vw,2.7rem)] leading-[1.12]`}>
            {t.hero.deckTitle}
          </p>
          <ol className="mt-7 space-y-3">
            {t.hero.deckSteps.map((item, i) => (
              <li
                key={item}
                className={`${baseTxt} ${a && s >= i + 1 ? on : off} flex items-center gap-3 text-base md:text-lg text-offwhite/90`}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full border border-offwhite/25 text-xs text-warm-gray">
                  {i + 1}
                </span>
                {item}
              </li>
            ))}
          </ol>
        </div>
      ),
      // cena 5 — consciência
      (a: boolean, s: number) => (
        <div className="max-w-2xl">
          <p className={`${baseTxt} ${a ? on : off} font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.06]`}>
            {tv.c5a}
          </p>
          <p className={`${baseTxt} ${a && s >= 1 ? on : off} mt-4 font-serif text-[clamp(1.9rem,3.6vw,3.2rem)] leading-[1.06] text-muted-red`}>
            {tv.c5b}
          </p>
        </div>
      ),
      // cena 6 — escolha
      (a: boolean, s: number) => (
        <div className="max-w-2xl">
          {tv.c6.map((line, i) => (
            <p
              key={line}
              className={`${baseTxt} ${a && s >= i ? on : off} font-serif text-[clamp(2rem,4vw,3.6rem)] leading-[1.05] ${
                i === tv.c6.length - 1 ? "text-muted-red" : ""
              }`}
            >
              {line}
            </p>
          ))}
        </div>
      ),
      // cena 7 — liberdade
      (a: boolean) => (
        <div className="max-w-2xl">
          <p className={`${baseTxt} ${a ? on : off} font-serif text-[clamp(2rem,4.2vw,3.8rem)] leading-[1.05] text-ink md:text-ink`}>
            {tv.c7}
          </p>
        </div>
      ),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, tv, estudoHref]
  );

  /* ---------- Versão de movimento reduzido: tudo estático e legível ---------- */
  if (reduced) {
    return (
      <section id="top" className="border-b border-warm-gray/10">
        {SCENES.map((s, i) => (
          <figure key={s} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/generated/storyboard/scene-0${s}.png`}
              alt=""
              className="block h-auto w-full"
              loading={i === 0 ? "eager" : "lazy"}
            />
            <figcaption className="mx-auto max-w-3xl px-6 py-10">
              {sceneTexts[i](true, 3)}
            </figcaption>
          </figure>
        ))}
      </section>
    );
  }

  return (
    <section
      ref={sectionRef}
      id="top"
      className="relative border-b border-warm-gray/10"
      style={{ height: isMobile ? `${N * 88}vh` : `${N * 100}vh` }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-ink">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
        {/* vinheta p/ legibilidade do texto, sem matar a imagem */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              active === N - 1
                ? "linear-gradient(to right, rgba(244,240,232,0.72) 0%, rgba(244,240,232,0.25) 45%, transparent 70%)"
                : "linear-gradient(to top, rgba(11,11,12,0.72) 0%, rgba(11,11,12,0.15) 34%, transparent 55%)",
          }}
        />

        {/* tela de espera discreta até o 1º quadro */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink">
            <div className="h-[2px] w-24 overflow-hidden rounded bg-warm-gray/20">
              <div className="h-full w-1/3 animate-pulse bg-[#BE7A2A]" />
            </div>
          </div>
        )}

        {/* textos por cena */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16 md:px-14 md:pb-20">
          {sceneTexts.map((render, i) => (
            <div
              key={i}
              className={i === active ? "block" : "hidden"}
              aria-hidden={i !== active}
            >
              {render(i === active, step)}
            </div>
          ))}
        </div>

        {/* trilha de progresso da narrativa (7 pontos) */}
        <div
          aria-hidden="true"
          className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col gap-2.5 md:flex"
        >
          {SCENES.map((s, i) => (
            <span
              key={s}
              className="h-2 w-2 rounded-full transition-all duration-500"
              style={{
                background: i === active ? "#BE7A2A" : "rgba(185,176,162,0.3)",
                transform: i === active ? "scale(1.35)" : "scale(1)",
              }}
            />
          ))}
        </div>

        {/* pular a abertura (acessibilidade + pressa) */}
        <a
          href="#manifesto"
          onClick={scrollToManifesto}
          className="absolute right-5 top-24 z-10 rounded-full border border-warm-gray/25 bg-black/30 px-4 py-2 text-[10px] uppercase tracking-[0.22em] text-warm-gray/90 hover:text-offwhite transition"
        >
          {tv.skip} ↓
        </a>
      </div>
    </section>
  );
}
