"use client";

/**
 * A TRAVESSIA DA GAIOLA — abertura cinematográfica da home.
 *
 * VISUAL: uma section alta (≈100vh por cena) com um palco sticky; um rAF próprio
 * lê o scroll nativo (animado pelo Lenis) e desenha no <canvas> os QUADROS dos
 * vídeos das 7 cenas (ida e volta), com crossfade nas emendas. Fail-open: sem
 * manifest.json, a cena usa o poster (storyboard) parado.
 *
 * TIPOGRAFIA (refino do dono, 19/07): scroll-scrubbed masked split-text reveal —
 * GSAP + ScrollTrigger (scrub) + SplitText (mask: "lines"). Cada frase-beat entra
 * de baixo da máscara (yPercent ~115, blur 8px), atada DIRETAMENTE à rolagem
 * (reversível), e sai subindo (-70%) com desfoque quando a narrativa avança.
 * Atos com comportamento próprio: captura = rápida e fragmentada; silêncio =
 * lenta, poucas palavras por vez; final = frase estável, sem sair.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
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

/** Um beat tipográfico: frase + janela de entrada/saída no progresso global (0..1). */
type Beat = {
  id: string;
  text: string;
  /** "title" = grande, quebra por linhas · "words" = menor, revela palavra a palavra */
  kind: "title" | "words";
  enter: [number, number];
  /** null = frase final estável, nunca sai */
  exit: [number, number] | null;
  /** fração do enter usada em stagger (captura maior = mais fragmentado) */
  frag: number;
  accent?: boolean;
};

function framePath(base: string, m: Manifest, i: number) {
  const n = String(m.first + i).padStart(3, "0");
  return `${base}/${m.pattern.replace("%03d", n)}`;
}

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
  const beatsWrapRef = useRef<HTMLDivElement | null>(null);
  const ctasRef = useRef<HTMLDivElement | null>(null);
  const mediaRef = useRef<SceneMedia[]>([]);
  const rafRef = useRef<number>(0);
  const [reduced, setReduced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(0);

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

  /**
   * Os 8 beats na ordem ditada pelo dono (19/07), sincronizados com as cenas:
   * gaiola se formando → aproximação → travessia → saturação → pausa →
   * espaço entre impulso e resposta → liberdade (estável).
   */
  const beats = useMemo<Beat[]>(
    () => [
      { id: "b1", text: tv.c1a, kind: "title", enter: [0.015, 0.085], exit: [0.095, 0.13], frag: 0.35 },
      { id: "b2", text: tv.c1b, kind: "title", enter: [0.135, 0.18], exit: [0.195, 0.23], frag: 0.35, accent: true },
      { id: "b3", text: tv.c2b, kind: "title", enter: [0.24, 0.29], exit: [0.305, 0.34], frag: 0.4 },
      { id: "b4", text: tv.c3b, kind: "words", enter: [0.35, 0.4], exit: [0.425, 0.455], frag: 0.45 },
      { id: "b5", text: tv.b90, kind: "words", enter: [0.475, 0.565], exit: [0.59, 0.62], frag: 0.6 },
      { id: "b6", text: tv.c5a, kind: "title", enter: [0.635, 0.695], exit: [0.72, 0.75], frag: 0.3 },
      { id: "b7", text: tv.bfim, kind: "title", enter: [0.79, 0.86], exit: null, frag: 0.25, accent: true },
    ],
    [tv]
  );

  /** passos do ritual — surgem devagar, um por vez, dentro do silêncio (cena 4) */
  const steps = t.hero.deckSteps;

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
          // fila de carregamento (6 por vez) — evita rajada de ~100 requisições
          let next = 0;
          let inFlight = 0;
          const pump = () => {
            while (inFlight < 6 && next < m.frameCount) {
              const i = next++;
              inFlight++;
              const img = new Image();
              img.decoding = "async";
              img.onload = img.onerror = () => {
                media.frames[i] = img;
                inFlight--;
                pump();
              };
              img.src = framePath(base, m, i);
            }
          };
          pump();
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

  // laço do CANVAS: progresso -> desenho dos quadros + cena ativa (pontos)
  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    const section = sectionRef.current;
    if (!canvas || !section) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastActive = -1;

    const tick = () => {
      rafRef.current = requestAnimationFrame(tick);
      const rect = section.getBoundingClientRect();
      const total = rect.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 0;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = Math.round(canvas.clientWidth * dpr);
      const ch = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }

      const seg = 1 / N;
      const idx = Math.min(N - 1, Math.floor(p / seg));
      const local = (p - idx * seg) / seg;

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
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reduced, loadScene]);

  // TIPOGRAFIA: timeline única, scrubada pela rolagem, com máscara + split
  useEffect(() => {
    if (reduced) return;
    const section = sectionRef.current;
    const wrap = beatsWrapRef.current;
    if (!section || !wrap) return;

    gsap.registerPlugin(ScrollTrigger, SplitText);

    let tl: gsap.core.Timeline | null = null;
    const splits: SplitText[] = [];
    let killed = false;

    // fontes prontas antes de dividir (senão as linhas quebram errado)
    const fontsReady: Promise<unknown> =
      (document as any).fonts?.ready ?? Promise.resolve();

    fontsReady.then(() => {
      if (killed) return;

      tl = gsap.timeline({
        defaults: { ease: "none" }, // atado ao scrub — a rolagem É o tempo
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.9,
        },
      });

      const els = Array.from(
        wrap.querySelectorAll<HTMLElement>("[data-beat]")
      );

      els.forEach((el) => {
        const beat = beats.find((b) => b.id === el.dataset.beat);
        if (!beat) return;
        el.style.visibility = "visible";

        // linhas mascaradas; textos menores também dividem palavras
        const split = new SplitText(el.querySelector(".beat-text")!, {
          type: beat.kind === "words" ? "lines,words" : "lines",
          mask: "lines",
          linesClass: "beat-line",
        });
        splits.push(split);
        const targets = beat.kind === "words" ? split.words : split.lines;

        const [e0, e1] = beat.enter;
        const eLen = e1 - e0;
        // entrada: de baixo da máscara, com leve desfoque
        tl!.fromTo(
          targets,
          { yPercent: 115, opacity: 0, filter: "blur(8px)" },
          {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: eLen * (1 - beat.frag),
            stagger: targets.length > 1 ? (eLen * beat.frag) / (targets.length - 1) : 0,
          },
          e0
        );

        if (beat.exit) {
          const [x0, x1] = beat.exit;
          const xLen = x1 - x0;
          // saída: sobe discretamente, perde opacidade, ganha desfoque, some na máscara
          tl!.to(
            targets,
            {
              yPercent: -70,
              opacity: 0,
              filter: "blur(8px)",
              duration: xLen * 0.85,
              stagger: targets.length > 1 ? (xLen * 0.15) / (targets.length - 1) : 0,
            },
            x0
          );
        }
      });

      // passos do ritual (silêncio): palavras poucas, bem devagar, um por vez
      const stepEls = Array.from(
        wrap.querySelectorAll<HTMLElement>("[data-step]")
      );
      stepEls.forEach((el, i) => {
        el.style.visibility = "visible";
        const split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "beat-line" });
        splits.push(split);
        const at = 0.505 + i * 0.028;
        tl!.fromTo(
          split.lines,
          { yPercent: 115, opacity: 0, filter: "blur(6px)" },
          { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.022 },
          at
        );
        tl!.to(
          split.lines,
          { yPercent: -70, opacity: 0, filter: "blur(8px)", duration: 0.02 },
          0.59
        );
      });

      // CTAs do hero: presentes na captura, saem quando a narrativa mergulha
      if (ctasRef.current) {
        tl!.to(ctasRef.current, { opacity: 0, yPercent: -30, duration: 0.03 }, 0.115);
      }

      ScrollTrigger.refresh();
    });

    return () => {
      killed = true;
      splits.forEach((s) => s.revert());
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
    };
  }, [reduced, beats, isMobile]);

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

  /* ---------- Versão de movimento reduzido: tudo estático e legível ---------- */
  if (reduced) {
    const staticTexts = [
      `${tv.c1a} ${tv.c1b}`,
      tv.c2b,
      tv.c3b,
      `${tv.b90} ${steps.join(". ")}.`,
      tv.c5a,
      tv.bfim,
      tv.c7,
    ];
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
              <p className="font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.15]">
                {staticTexts[i]}
              </p>
              {i === 0 && (
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href="#manifesto" className="inline-flex items-center rounded-full border border-warm-gray/25 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90">
                    {t.hero.ctaPrimary} →
                  </a>
                  <a href={estudoHref} className="inline-flex items-center rounded-full border border-muted-red/40 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90">
                    {t.hero.ctaSecondary} →
                  </a>
                </div>
              )}
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

        {/* BEATS tipográficos — todos empilhados no mesmo palco; o timeline decide quem vive */}
        <div
          ref={beatsWrapRef}
          className="absolute inset-x-0 bottom-0 z-10 px-6 pb-16 md:px-14 md:pb-20"
        >
          {beats.map((b) => (
            <div
              key={b.id}
              data-beat={b.id}
              className="absolute inset-x-6 bottom-16 md:inset-x-14 md:bottom-20"
              style={{ visibility: "hidden" }}
            >
              <p
                className={`beat-text max-w-3xl font-serif leading-[1.04] tracking-[-0.03em] ${
                  b.kind === "title"
                    ? "text-[clamp(2.2rem,4.8vw,4.4rem)]"
                    : "text-[clamp(1.7rem,3.4vw,3rem)]"
                } ${b.accent ? "text-muted-red" : b.id === "b7" ? "text-ink" : "text-offwhite"}`}
              >
                {b.text}
              </p>
            </div>
          ))}

          {/* passos do ritual (cena 4) — pequenos, lentos */}
          <div className="absolute inset-x-6 bottom-6 md:inset-x-14 md:bottom-8">
            {steps.map((s, i) => (
              <p
                key={s}
                data-step={i}
                className="font-sans text-sm md:text-base tracking-[0.08em] text-warm-gray"
                style={{ visibility: "hidden" }}
              >
                {i + 1} · {s}
              </p>
            ))}
          </div>

          {/* chips + CTAs do hero (só na captura) */}
          <div
            ref={ctasRef}
            className="absolute inset-x-6 md:inset-x-14"
            style={{ bottom: "calc(4rem + clamp(6rem, 14vh, 9rem))" }}
          >
            <div className="flex flex-wrap gap-2">
              {t.hero.chips.map((chip) => (
                <span key={chip} className="dl-chip">
                  {chip}
                </span>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
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
