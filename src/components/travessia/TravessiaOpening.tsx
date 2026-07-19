"use client";

/**
 * A TRAVESSIA DA GAIOLA — abertura cinematográfica da home.
 *
 * VISUAL: uma section alta (≈100vh por cena) com um palco sticky; um rAF próprio
 * lê o scroll nativo (animado pelo Lenis) e desenha no <canvas> os QUADROS dos
 * vídeos das 7 cenas (ida e volta), com crossfade nas emendas. Fail-open: sem
 * manifest.json, a cena usa o poster (storyboard) parado.
 *
 * NARRATIVA (reconstrução ditada pelo dono, 19/07): UMA frase por momento —
 * a anterior SAI COMPLETAMENTE antes da próxima entrar. Sete momentos, um por
 * cena: gaiola → captura da recompensa → entrada no celular/saturação → silêncio
 * (único lugar do ritual de 90s) → interrupção do impulso → escolha → liberdade.
 * Primeira tela: só a cena, a 1ª frase e um indicador discreto de rolagem.
 * CTAs aparecem apenas na conclusão da sequência (cena 7).
 *
 * TIPOGRAFIA: scroll-scrubbed masked split-text reveal — GSAP + ScrollTrigger
 * (scrub) + SplitText (mask: "lines"). Entrada de baixo da máscara (yPercent
 * ~115, blur), reversível com a rolagem; saída subindo com desfoque.
 * Entrelinha 1.15 + folga na máscara: sem corte de descendentes ("g", "ç").
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
/** fração de UMA cena no progresso global (0..1) */
const SEG = 1 / N;

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

/** Um beat tipográfico: UMA frase por cena, com janela própria no progresso global. */
type Beat = {
  id: string;
  text: string;
  /** "title" = grande, linhas · "words" = menor, palavra a palavra (silêncio) */
  kind: "title" | "words";
  /** null = primeira frase: já está em cena na tela inicial (entra no load) */
  enter: [number, number] | null;
  /** null = frase final estável, nunca sai */
  exit: [number, number] | null;
  accent?: boolean;
  dark?: boolean;
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
  const stepsRef = useRef<HTMLDivElement | null>(null);
  const ctasRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
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
   * SETE momentos, UMA frase cada (ordem ditada pelo dono, 19/07):
   * cada frase vive dentro do trecho da SUA cena e sai por completo
   * (termina em i+0.92·SEG) antes da próxima entrar (começa em i+1.12·SEG).
   */
  const beats = useMemo<Beat[]>(() => {
    const win = (i: number): Pick<Beat, "enter" | "exit"> => ({
      enter: [(i + 0.14) * SEG, (i + 0.42) * SEG],
      exit: [(i + 0.68) * SEG, (i + 0.92) * SEG],
    });
    return [
      // 1 · Gaiola sem grade — já está na primeira tela; só sai.
      { id: "m1", text: tv.c1a, kind: "title", enter: null, exit: [0.66 * SEG, 0.9 * SEG] },
      // 2 · Captura da recompensa
      { id: "m2", text: tv.c2b, kind: "title", ...win(1), accent: true },
      // 3 · Entrada no celular / dopamina barata
      { id: "m3", text: tv.c3b, kind: "title", ...win(2) },
      // 4 · Saturação → silêncio: o ritual mora SÓ aqui (passos entram à parte)
      { id: "m4", text: tv.b90, kind: "words", enter: [(3 + 0.12) * SEG, (3 + 0.4) * SEG], exit: [(3 + 0.72) * SEG, (3 + 0.94) * SEG] },
      // 5 · Interrupção do impulso
      { id: "m5", text: tv.c5a, kind: "title", ...win(4) },
      // 6 · Escolha
      { id: "m6", text: tv.bfim, kind: "title", ...win(5), accent: true },
      // 7 · Liberdade — frase final estável (fundo claro → tinta escura)
      { id: "m7", text: tv.c7, kind: "title", enter: [(6 + 0.16) * SEG, (6 + 0.46) * SEG], exit: null, dark: true },
    ];
  }, [tv]);

  /** passos do ritual — só na cena do silêncio (4ª), um por vez, devagar */
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

      const idx = Math.min(N - 1, Math.floor(p / SEG));
      const local = (p - idx * SEG) / SEG;

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
    let intro: gsap.core.Tween | null = null;
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

        const split = new SplitText(el.querySelector(".beat-text")!, {
          type: beat.kind === "words" ? "lines,words" : "lines",
          mask: "lines",
          linesClass: "beat-line",
        });
        splits.push(split);
        const targets = beat.kind === "words" ? split.words : split.lines;

        if (beat.enter) {
          const [e0, e1] = beat.enter;
          const eLen = e1 - e0;
          const frag = beat.kind === "words" ? 0.55 : 0.3;
          // entrada: de baixo da máscara, com leve desfoque
          tl!.fromTo(
            targets,
            { yPercent: 115, opacity: 0, filter: "blur(8px)" },
            {
              yPercent: 0,
              opacity: 1,
              filter: "blur(0px)",
              duration: eLen * (1 - frag),
              stagger: targets.length > 1 ? (eLen * frag) / (targets.length - 1) : 0,
            },
            e0
          );
        }

        if (beat.exit) {
          const [x0, x1] = beat.exit;
          const xLen = x1 - x0;
          // saída: sobe, perde opacidade, ganha desfoque, some na máscara
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

      // 1ª frase: já pertence à primeira tela — entra UMA vez no carregamento
      // (tempo, não rolagem), e daí em diante só a saída é scrubada.
      const first = els.find((e) => e.dataset.beat === "m1");
      if (first) {
        const split0 = splits[0];
        if (split0?.lines?.length) {
          intro = gsap.from(split0.lines, {
            yPercent: 115,
            opacity: 0,
            filter: "blur(8px)",
            duration: 1.05,
            delay: 0.25,
            stagger: 0.09,
            ease: "power3.out",
          });
        }
      }

      // passos do ritual — SÓ na cena do silêncio: um por vez, bem devagar,
      // e TODOS saem antes da frase da cena seguinte entrar.
      if (stepsRef.current) {
        const stepEls = Array.from(
          stepsRef.current.querySelectorAll<HTMLElement>("[data-step]")
        );
        stepEls.forEach((el, i) => {
          el.style.visibility = "visible";
          const split = new SplitText(el, { type: "lines", mask: "lines", linesClass: "beat-line" });
          splits.push(split);
          // um por vez, e os TRÊS convivem em cena antes de sair juntos
          const at = (3 + 0.4 + i * 0.07) * SEG;
          tl!.fromTo(
            split.lines,
            { yPercent: 115, opacity: 0, filter: "blur(6px)" },
            { yPercent: 0, opacity: 1, filter: "blur(0px)", duration: 0.055 * SEG },
            at
          );
          tl!.to(
            split.lines,
            { yPercent: -70, opacity: 0, filter: "blur(8px)", duration: 0.16 * SEG },
            (3 + 0.76) * SEG
          );
        });
      }

      // CTAs — apenas na CONCLUSÃO da sequência (fim da cena 7); a entrada
      // completa ANTES do último pixel de rolagem, para ninguém ficar sem vê-los
      if (ctasRef.current) {
        tl!.fromTo(
          ctasRef.current,
          { autoAlpha: 0, y: 22 },
          { autoAlpha: 1, y: 0, duration: 0.032 },
          0.93
        );
      }

      // âncora em 1.0: a linha do tempo dura EXATAMENTE o percurso da rolagem
      // (sem ela, o scrub esticaria as janelas em ~2%)
      tl!.set({}, {}, 1);

      // indicador de rolagem — some assim que a jornada começa
      if (hintRef.current) {
        tl!.to(hintRef.current, { autoAlpha: 0, duration: 0.018 }, 0.006);
      }

      ScrollTrigger.refresh();
    });

    return () => {
      killed = true;
      intro?.kill();
      splits.forEach((s) => s.revert());
      if (tl) {
        tl.scrollTrigger?.kill();
        tl.kill();
      }
    };
  }, [reduced, beats, isMobile, steps]);

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
      tv.c1a,
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
              <p className="font-serif text-[clamp(1.6rem,3vw,2.6rem)] leading-[1.2]">
                {staticTexts[i]}
              </p>
              {i === N - 1 && (
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
      {/* folga na máscara do split: sem corte de descendentes ("g", "ç", "p") */}
      <style>{`
        .beat-text .beat-line, .trav-step .beat-line {
          padding-bottom: 0.18em;
          margin-bottom: -0.18em;
        }
      `}</style>
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

        {/* AS SETE FRASES — uma por cena, empilhadas no mesmo palco baixo-esquerdo;
            a timeline garante: a anterior SAI por completo antes da próxima entrar */}
        <div
          ref={beatsWrapRef}
          className="absolute inset-x-0 bottom-0 z-10"
        >
          {beats.map((b) => (
            <div
              key={b.id}
              data-beat={b.id}
              className="absolute inset-x-6 bottom-[14vh] md:inset-x-14 md:bottom-[16vh]"
              style={{ visibility: "hidden" }}
            >
              <p
                className={`beat-text max-w-[13ch] md:max-w-3xl font-serif leading-[1.15] tracking-[-0.02em] ${
                  b.kind === "title"
                    ? "text-[clamp(2.1rem,5.2vw,4.3rem)]"
                    : "text-[clamp(1.6rem,3.4vw,2.9rem)]"
                } ${b.accent ? "text-muted-red" : b.dark ? "text-ink" : "text-offwhite"}`}
              >
                {b.text}
              </p>
            </div>
          ))}
        </div>

        {/* ritual de 90 segundos — SÓ na cena do silêncio */}
        <div
          ref={stepsRef}
          className="absolute inset-x-6 bottom-[6vh] z-10 md:inset-x-14 md:bottom-[8vh]"
        >
          {steps.map((s, i) => (
            <p
              key={s}
              data-step={i}
              className="trav-step font-sans text-sm tracking-[0.08em] text-warm-gray md:text-base"
              style={{ visibility: "hidden" }}
            >
              {i + 1} · {s}
            </p>
          ))}
        </div>

        {/* CTAs — apenas depois da conclusão da sequência (cena da liberdade) */}
        <div
          ref={ctasRef}
          className="invisible absolute inset-x-6 bottom-[5vh] z-10 opacity-0 md:inset-x-14 md:bottom-[7vh]"
        >
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="#manifesto"
              onClick={scrollToManifesto}
              className="inline-flex items-center rounded-full bg-ink px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite transition hover:bg-ink/85"
            >
              {t.hero.ctaPrimary} <span className="ml-3 text-muted-red">→</span>
            </a>
            <a
              href={estudoHref}
              className="inline-flex items-center rounded-full border border-ink/35 px-6 py-3 text-xs tracking-[0.22em] uppercase text-ink/85 transition hover:border-ink/70"
            >
              {t.hero.ctaSecondary} <span className="ml-3 text-muted-red">→</span>
            </a>
          </div>
        </div>

        {/* indicador discreto de rolagem — primeira tela apenas */}
        <div
          ref={hintRef}
          aria-hidden="true"
          className="absolute bottom-[4vh] left-1/2 z-10 -translate-x-1/2"
        >
          <div className="h-12 w-[1.5px] overflow-hidden rounded bg-warm-gray/25">
            <div className="trav-hint-dot h-4 w-full bg-[#BE7A2A]" />
          </div>
          <style>{`
            .trav-hint-dot { animation: travHint 1.9s ease-in-out infinite; }
            @keyframes travHint {
              0% { transform: translateY(-100%); opacity: 0; }
              25% { opacity: 1; }
              100% { transform: translateY(300%); opacity: 0; }
            }
          `}</style>
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
