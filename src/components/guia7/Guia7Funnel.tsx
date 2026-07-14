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
      // silencioso — a UX confirma sucesso de qualquer forma (o guia já está na página)
    } finally {
      setState("done");
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

        {/* OS 7 PASSOS */}
        <section className={`${styles.wrap} ${styles.section}`} id="passos">
          <h2 className={styles.h2}>{c.stepsHeading}</h2>
          <div className={styles.steps}>
            {c.steps.map((s, i) => (
              <article className={styles.step} key={i}>
                <div className={styles.stepHead}>
                  <span className={styles.stepDia}>{s.dia}</span>
                  <span className={styles.stepTitle}>{s.titulo}</span>
                </div>
                <p className={styles.stepAcao}>{s.acao}</p>
                <p className={styles.stepPorque}>
                  <b>{c.porqueLabel}:</b> {s.porque}
                </p>
              </article>
            ))}
          </div>
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
