"use client";

// Contador de respostas da pesquisa — prova social HONESTA (P4):
// lê a contagem REAL do banco via GET /api/survey. Nunca fabrica número.
// - Contagem >= LIMIAR → mostra o número + barra de meta (real / ~400).
// - Contagem baixa ou erro de rede → esconde o número e mostra o
//   enquadramento "seja um dos primeiros" (verdadeiro na janela de lançamento).
// Respeita prefers-reduced-motion (sem count-up).

import { useEffect, useRef, useState } from "react";
import type { EstudoCopy } from "./estudo.content";
import type { Lang } from "@/lib/i18n/dictionaries";

const GOAL = 400; // meta por idioma (marco de fechamento do campo)
const THRESHOLD = 25; // abaixo disso não vira "número de prova", vira "seja um dos primeiros"

export default function LiveCount({ lang, c }: { lang: Lang; c: EstudoCopy }) {
  const [count, setCount] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Busca a contagem real (só o idioma da página).
  useEffect(() => {
    let alive = true;
    fetch("/api/survey", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { br?: number; es?: number } | null) => {
        if (!alive || !d) return;
        const n = lang === "es" ? d.es ?? 0 : d.br ?? 0;
        setCount(Number.isFinite(n) ? n : 0);
      })
      .catch(() => alive && setCount(0));
    return () => {
      alive = false;
    };
  }, [lang]);

  // Observa a entrada em viewport para disparar a animação uma vez.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!("IntersectionObserver" in window)) {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Count-up até o valor real, quando visível.
  useEffect(() => {
    if (!visible || count === null) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || count < THRESHOLD) {
      setShown(count);
      return;
    }
    let raf = 0;
    let start: number | null = null;
    const dur = 1400;
    const tick = (ts: number) => {
      if (start === null) start = ts;
      const t = Math.min((ts - start) / dur, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(eased * count));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [visible, count]);

  const hasNumber = count !== null && count >= THRESHOLD;
  const pct = count !== null ? Math.min(100, Math.round((count / GOAL) * 100)) : 0;

  return (
    <div
      ref={ref}
      className="grid items-center gap-8 rounded-[24px] border border-warm-gray/15 bg-white/[0.03] p-7 md:grid-cols-[1.1fr_1fr] md:gap-12 md:p-11"
    >
      <div>
        <div className="text-[11px] uppercase tracking-[0.24em] text-muted-red">{c.live.eyebrow}</div>
        {hasNumber ? (
          <>
            <div className="mt-4 flex items-baseline gap-3">
              <span className="font-serif text-[clamp(3.5rem,12vw,6.5rem)] leading-[0.9] tracking-[-0.03em] tabular-nums text-offwhite">
                {shown}
              </span>
              <span className="text-warm-gray/70">{c.live.counterOf}</span>
            </div>
            <div className="mt-4 text-xs uppercase tracking-[0.2em] text-warm-gray/80">
              {c.live.counterLabel}
            </div>
          </>
        ) : (
          <p className="mt-4 max-w-sm text-[1.05rem] leading-[1.6] text-offwhite/90">
            {c.live.firstFraming}
          </p>
        )}
      </div>
      <div>
        <p className="text-sm leading-[1.6] text-warm-gray/85">
          <Rich text={c.live.goalNote} />
        </p>
        {hasNumber && (
          <>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-warm-gray/15" aria-hidden="true">
              <div
                className="h-full rounded-full bg-gradient-to-r from-muted-red/60 to-muted-red transition-[width] duration-[1100ms] ease-out"
                style={{ width: visible ? `${pct}%` : "0%" }}
              />
            </div>
            <div className="mt-3 flex justify-between text-xs text-warm-gray/70">
              <span>{c.live.goalMetaLeft}</span>
              <span>{c.live.goalMetaRight(pct)}</span>
            </div>
          </>
        )}
        <div className="mt-6">
          <a
            href={c.surveyPath}
            className="group inline-flex items-center gap-2 rounded-full bg-offwhite px-6 py-3.5 text-sm font-medium text-ink transition hover:brightness-105"
          >
            {c.live.cta}
            <span className="transition group-hover:translate-x-0.5" aria-hidden="true">→</span>
          </a>
        </div>
      </div>
    </div>
  );
}

// Marcador **negrito** → <strong> (evita HTML cru na fonte de conteúdo).
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-offwhite">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}
