"use client";

import { useEffect, useRef, useState } from "react";
import { Instrument_Sans } from "next/font/google";
import MetaPixel from "@/components/survey/MetaPixel";
import { guia7Content, type Lang } from "./guia7.content";
import styles from "./guia7.module.css";

// Instrument Sans compõe o par tipográfico com a Fraunces (global --font-serif).
const instrument = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-instrument",
  display: "swap",
});

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMBERS = [
  { left: "12%", dur: "15s", delay: "0s", size: 5 },
  { left: "34%", dur: "19s", delay: "5s", size: 5 },
  { left: "58%", dur: "16s", delay: "2s", size: 6 },
  { left: "78%", dur: "21s", delay: "8s", size: 5 },
];

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

// Dispara evento no Meta Pixel só se ele estiver carregado (env NEXT_PUBLIC_META_PIXEL_ID).
// Sem Pixel, é no-op silencioso — não quebra a UX.
function fbTrack(event: string, custom = false, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(custom ? "trackCustom" : "track", event, data);
  }
}

// --- Desbloqueio progressivo (delta 2026-08-23) -----------------------------------
// Dia 1 sempre aberto. Dias 2–7 nascem trancados e só abrem quando a pessoa marca
// "fiz o Dia N" — com piso de 1 dia-calendário real entre desbloqueios. Tudo
// client-side (localStorage), sem chamada a backend nova — 100% honesto: o rodapé
// da seção avisa que o progresso é só deste navegador.
const PROGRESS_KEY = "guia7_progress_v1";
const UNLOCK_ALL_KEY = "guia7_unlocked_all";
const TOTAL_DAYS = 7;

type Guia7Progress = {
  diaAtual: number;
  diasConcluidos: number[];
  dataUltimoDesbloqueio: string;
};

const DEFAULT_PROGRESS: Guia7Progress = {
  diaAtual: 1,
  diasConcluidos: [],
  dataUltimoDesbloqueio: "",
};

// Data local (YYYY-MM-DD) — de propósito NÃO usa UTC: o piso é "1 dia-calendário
// real" no fuso do navegador de quem está lendo, não um recorte de 24h corrido.
function todayStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readProgress(): Guia7Progress {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw);
    const diasConcluidos = Array.isArray(parsed?.diasConcluidos)
      ? parsed.diasConcluidos.filter((n: unknown) => typeof n === "number" && n >= 1 && n <= TOTAL_DAYS)
      : [];
    const diaAtual =
      typeof parsed?.diaAtual === "number" && parsed.diaAtual >= 1 && parsed.diaAtual <= TOTAL_DAYS
        ? parsed.diaAtual
        : 1;
    const dataUltimoDesbloqueio = typeof parsed?.dataUltimoDesbloqueio === "string" ? parsed.dataUltimoDesbloqueio : "";
    return { diaAtual, diasConcluidos, dataUltimoDesbloqueio };
  } catch {
    // localStorage indisponível (modo privado antigo, etc.) — segue com o padrão.
    return DEFAULT_PROGRESS;
  }
}

// Preenche templates com o marcador literal usado no dicionário: "{N-1}", "{N}", "{N+1}".
function fillTemplate(template: string, dayNum: number): string {
  return template
    .replaceAll("{N-1}", String(dayNum - 1))
    .replaceAll("{N+1}", String(dayNum + 1))
    .replaceAll("{N}", String(dayNum));
}

export default function Guia7Funnel({ lang }: { lang: Lang }) {
  const c = guia7Content[lang];

  // UTM capturado da URL na montagem (para medir origem → lead).
  const utmRef = useRef<Utm>({});
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const utm: Utm = {};
    for (const k of UTM_KEYS) {
      const v = params.get(k);
      if (v) utm[k] = v.slice(0, 120);
    }
    utmRef.current = utm;
  }, []);

  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Progresso do funil de 7 dias — lido do localStorage após montar (SSR nunca
  // vê localStorage; o padrão "tudo trancado exceto o Dia 1" já é o que o servidor
  // renderiza, então não há mismatch de hidratação — só o "pop" normal ao carregar
  // o progresso real de quem já voltou à página).
  const [progress, setProgress] = useState<Guia7Progress>(DEFAULT_PROGRESS);
  const [unlockedAll, setUnlockedAll] = useState(false);

  useEffect(() => {
    setProgress(readProgress());
    try {
      if (window.localStorage.getItem(UNLOCK_ALL_KEY) === "true") {
        setUnlockedAll(true);
        setState((s) => (s === "idle" ? "done" : s));
      }
    } catch {
      // segue sem o atalho — a jornada dia a dia continua funcionando normalmente.
    }
  }, []);

  async function submit() {
    const e = email.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setState("error");
      return;
    }
    setState("sending");
    fbTrack("Lead", false, { content_name: "guia_7_dias" });
    fbTrack("guia7_lead", true);
    try {
      await fetch("/api/guia7-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e, lang, utm: utmRef.current }),
      });
    } catch {
      // silencioso — a UX confirma sucesso de qualquer forma (o e-mail já destrava os 7 dias)
    } finally {
      setState("done");
      // Atalho por e-mail: destrava os 7 dias de uma vez, ignorando o piso de dias
      // (delta 2026-08-23) — grava ANTES de qualquer outro estado depender disso.
      try {
        window.localStorage.setItem(UNLOCK_ALL_KEY, "true");
      } catch {
        // sem localStorage: a página segue funcionando, só sem lembrar o atalho.
      }
      setUnlockedAll(true);
    }
  }

  function goToForm() {
    fbTrack("guia7_form_focus", true);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => inputRef.current?.focus());
  }
  function goToSteps() {
    document.getElementById("passos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Marca "fiz o Dia N" — grava no localStorage e avança o dia ativo. Sem piso no
  // Dia 7 (não há próximo dia a proteger); dias 1–6 exigem 1 dia-calendário real
  // desde o último desbloqueio (checado também na UI via `todayBlocked`).
  function handleUnlock(dayNum: number) {
    const today = todayStr();
    if (dayNum < TOTAL_DAYS && progress.dataUltimoDesbloqueio && progress.dataUltimoDesbloqueio >= today) {
      return;
    }
    const diasConcluidos = progress.diasConcluidos.includes(dayNum)
      ? progress.diasConcluidos
      : [...progress.diasConcluidos, dayNum];
    const diaAtual = dayNum < TOTAL_DAYS ? dayNum + 1 : TOTAL_DAYS;
    const next: Guia7Progress = { diaAtual, diasConcluidos, dataUltimoDesbloqueio: today };
    setProgress(next);
    try {
      window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
    } catch {
      // sem localStorage: o desbloqueio vale só para esta visita (não persiste).
    }
    fbTrack("guia7_day_unlocked", true, { dia: dayNum });
  }

  const hasLockedDays = !unlockedAll && progress.diaAtual < TOTAL_DAYS;

  return (
    <div className={`${styles.root} ${instrument.variable}`}>
      <MetaPixel event="guia7_funnel_view" />

      <div className={styles.sky} aria-hidden="true">
        <div className={styles.sun} />
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className={styles.ember}
            style={{ left: e.left, width: e.size, height: e.size, animationDuration: e.dur, animationDelay: e.delay }}
          />
        ))}
      </div>

      <div className={styles.app}>
        {/* HERO */}
        <section className={`${styles.wrap} ${styles.hero}`}>
          <span className={styles.badge}>{c.badge}</span>
          <h1 className={styles.heroTitle}>
            {c.titlePre} <em>{c.titleEm}</em>
          </h1>
          <div className={styles.rrule} />
          <p className={styles.heroSub}>{c.subtitle}</p>
          <div className={styles.chips}>
            {c.chips.map((chip, i) => (
              <span key={i} className={styles.chip}>
                {chip}
              </span>
            ))}
          </div>
          <div className={styles.ctaRow}>
            <button type="button" className={styles.btn} onClick={goToSteps}>
              {lang === "es" ? "Ver los 7 pasos" : "Ver os 7 passos"} →
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={goToForm}>
              {lang === "es" ? "Recibir el refuerzo diario" : "Receber o reforço diário"}
            </button>
          </div>
        </section>

        {/* LEAD + HONESTIDADE */}
        <section className={`${styles.wrap} ${styles.section}`}>
          <p className={styles.lead}>{c.lead}</p>
          <div className={styles.honesty}>
            <p className={styles.eyebrow}>{c.honestyHeading}</p>
            {c.honestyBody}
          </div>
        </section>

        {/* OS 7 PASSOS — Dia 1 sempre aberto; Dias 2–7 desbloqueiam por AÇÃO, não
            por tempo passivo (delta 2026-08-23). */}
        <section className={`${styles.wrap} ${styles.section}`} id="passos">
          <h2 className={styles.h2}>{c.stepsHeading}</h2>
          <p className={styles.stepsSubheading}>{c.stepsSubheading}</p>
          <div className={styles.steps}>
            {c.steps.map((s, i) => {
              const dayNum = i + 1;
              const isDone = progress.diasConcluidos.includes(dayNum);
              const isLocked = !unlockedAll && dayNum !== 1 && dayNum > progress.diaAtual && !isDone;
              const isActive = !unlockedAll && dayNum === progress.diaAtual && !isDone;
              const showButton = !unlockedAll && dayNum === progress.diaAtual && !isDone;
              const todayBlocked =
                dayNum < TOTAL_DAYS &&
                !!progress.dataUltimoDesbloqueio &&
                progress.dataUltimoDesbloqueio >= todayStr();
              const cardCls = [
                styles.step,
                isLocked ? styles.stepLocked : "",
                isActive ? styles.stepActive : "",
                isDone ? styles.stepDone : "",
              ]
                .filter(Boolean)
                .join(" ");
              let buttonLabel = c.unlockButtonLabelFinal;
              if (todayBlocked) buttonLabel = fillTemplate(c.unlockButtonDisabledLabel, dayNum);
              else if (dayNum < TOTAL_DAYS) buttonLabel = fillTemplate(c.unlockButtonLabel, dayNum);

              return (
                <article className={cardCls} key={i}>
                  <div className={styles.stepHead}>
                    <span className={styles.stepDia}>{s.dia}</span>
                    <span className={styles.stepTitle}>{s.titulo}</span>
                    {isLocked && <span className={styles.lockedBadge}>{c.lockedBadge}</span>}
                    {isDone && (
                      <span className={styles.stepCheck} aria-hidden="true">
                        ✓
                      </span>
                    )}
                  </div>
                  {isLocked ? (
                    <p className={styles.lockedTeaser}>{fillTemplate(c.lockedTeaser, dayNum)}</p>
                  ) : (
                    <>
                      <p className={styles.stepAcao}>{s.acao}</p>
                      <p className={styles.stepPorque}>
                        <b>{c.porqueLabel}:</b> {s.porque}
                      </p>
                      {showButton && (
                        <div className={styles.unlockRow}>
                          <button
                            type="button"
                            className={`${styles.btn} ${styles.unlockBtn}`}
                            disabled={todayBlocked}
                            onClick={() => handleUnlock(dayNum)}
                          >
                            {buttonLabel}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </article>
              );
            })}
          </div>
          {hasLockedDays && (
            <button type="button" className={styles.emailShortcut} onClick={goToForm}>
              {c.emailShortcutCta}
            </button>
          )}
          <p className={styles.progressFooterNote}>{c.progressFooterNote}</p>
        </section>

        {/* OPT-IN DO REFORÇO DIÁRIO */}
        <section className={`${styles.wrap} ${styles.section}`}>
          <div className={styles.formCard} ref={formRef}>
            <p className={styles.eyebrow}>{lang === "es" ? "REFUERZO DIARIO" : "REFORÇO DIÁRIO"}</p>
            <h2 className={styles.h2}>{c.form.heading}</h2>
            <p className={styles.formBody}>{c.form.body}</p>
            {state === "done" ? (
              <p className={styles.formOk}>{c.form.success}</p>
            ) : (
              <>
                <label className={styles.formLabel} htmlFor="guia7-email">
                  {c.form.label}
                </label>
                <div className={styles.inputRow}>
                  <input
                    id="guia7-email"
                    ref={inputRef}
                    className={styles.input}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder={c.form.placeholder}
                    value={email}
                    onChange={(ev) => {
                      setEmail(ev.target.value);
                      if (state === "error") setState("idle");
                    }}
                  />
                  <button
                    type="button"
                    className={styles.btn}
                    disabled={state === "sending"}
                    onClick={submit}
                  >
                    {c.form.cta}
                  </button>
                </div>
                {state === "error" && <p className={styles.formErr}>{c.form.error}</p>}
                <p className={styles.formNote}>{c.form.note}</p>
              </>
            )}
          </div>
        </section>

        {/* CTA FINAL — venda soft I Love Dopamina */}
        <section className={`${styles.wrap} ${styles.section} ${styles.finalCard}`}>
          <h2 className={styles.h2}>{c.finalTitle}</h2>
          <p className={styles.finalLead}>{c.finalLead}</p>
          <a className={styles.btn} href={c.finalHref}>
            {c.finalCta} →
          </a>
        </section>

        <div className={`${styles.wrap} ${styles.foot}`}>
          <p className={styles.disc} style={{ borderLeft: "none", padding: 0, marginBottom: 16 }}>
            {c.disclaimer}
          </p>
          {c.footerSignature}
        </div>
      </div>
    </div>
  );
}
