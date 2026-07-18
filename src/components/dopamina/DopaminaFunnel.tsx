"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Lang } from "@/lib/i18n/dictionaries";
import MetaPixel from "@/components/survey/MetaPixel";
import { dopaminaContent, faixaForScore, type Band } from "./dopamina.content";
import styles from "./dopamina.module.css";

// Tipografia: Fraunces (--font-serif) + Inter (--font-sans), AS MESMAS do site —
// a landing veste a identidade do drlibertad.com, não uma fonte própria.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;
type Utm = Partial<Record<(typeof UTM_KEYS)[number], string>>;

// Dispara evento no Meta Pixel só se ele estiver carregado (env NEXT_PUBLIC_META_PIXEL_ID
// setada). Sem Pixel, é no-op silencioso — não quebra a UX.
function fbTrack(event: string, custom = false, data?: Record<string, unknown>) {
  if (typeof window !== "undefined" && window.fbq) {
    window.fbq(custom ? "trackCustom" : "track", event, data);
  }
}

export default function DopaminaFunnel({ lang }: { lang: Lang }) {
  const c = dopaminaContent[lang];

  // UTM capturado da URL na montagem (para medir origem → quiz → lead).
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

  // ── Quiz ──
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(c.quiz.questions.length).fill(null));
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ band: Band; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const quizRef = useRef<HTMLElement>(null);

  const allAnswered = answers.every((a) => a !== null);
  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = allAnswered && emailValid && !submitting && !result;
  const total = useMemo(() => answers.reduce<number>((s, a) => s + (a ?? 0), 0), [answers]);
  const pct = result ? Math.round((result.total / 24) * 100) : 0;

  // ── Wizard: uma pergunta por vez (0..N-1); N = gate de e-mail. Cada resposta é
  // um micro-compromisso; a parede de 8 perguntas de uma vez afugenta no scroll.
  const qCount = c.quiz.questions.length;
  const [step, setStep] = useState(0);
  const advanceTimer = useRef<number | null>(null);
  useEffect(() => () => {
    if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
  }, []);

  const goStep = useCallback(
    (s: number) => {
      setStep(Math.max(0, Math.min(s, qCount)));
      // mantém o quiz enquadrado ao trocar de passo (o card muda de altura)
      requestAnimationFrame(() => quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    },
    [qCount]
  );

  function pick(qi: number, value: number) {
    if (result) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = value;
      return next;
    });
    // auto-avanço: a seleção pinta (260ms) e o próximo passo entra sozinho
    if (qi === step) {
      if (advanceTimer.current !== null) window.clearTimeout(advanceTimer.current);
      advanceTimer.current = window.setTimeout(() => goStep(qi + 1), 260);
    }
  }

  async function submitQuiz() {
    if (!canSubmit) return;
    setSubmitting(true);
    const band = faixaForScore(total, c.bands);
    setResult({ band, total }); // veredito imediato — não depende da rede
    fbTrack("Lead", false, { content_name: "dopamina_quiz", value: total });
    fbTrack("dopamina_quiz_lead", true, { faixa: band.key });
    try {
      await fetch("/api/dopamina-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          lang,
          source: "quiz",
          faixa: band.key,
          score: total,
          utm: utmRef.current,
        }),
      });
    } catch {
      // silencioso — o veredito já está na tela
    } finally {
      setSubmitting(false);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  // ── Prévia (só e-mail) ──
  const [previaEmail, setPreviaEmail] = useState("");
  const [previaState, setPreviaState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const previaRef = useRef<HTMLDivElement>(null);
  const previaInputRef = useRef<HTMLInputElement>(null);

  async function submitPrevia() {
    const e = previaEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(e)) {
      setPreviaState("error");
      return;
    }
    setPreviaState("sending");
    fbTrack("Lead", false, { content_name: "dopamina_previa" });
    fbTrack("dopamina_previa_lead", true);
    try {
      await fetch("/api/dopamina-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: e, lang, source: "previa", utm: utmRef.current }),
      });
    } catch {
      // silencioso — confirmamos sucesso na UX de qualquer forma
    } finally {
      setPreviaState("done");
    }
  }

  function goToQuiz() {
    fbTrack("dopamina_quiz_start", true);
    quizRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function goToPrevia() {
    previaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    requestAnimationFrame(() => previaInputRef.current?.focus());
  }

  const q = c.quiz;

  return (
    <div className={styles.root}>
      <MetaPixel event="dopamina_funnel_view" />

      {/* Fundo decorativo: os MESMOS radial-gradients do hero da home (ink +
          muted-red + offwhite). Puro CSS, pointer-events none — inequivocamente
          decorativo, nada de partículas/ícones ambíguos. */}
      <div className={styles.sky} aria-hidden="true" />

      <div className={styles.app}>
        {/* HERO */}
        <section className={`${styles.wrap} ${styles.hero}`}>
          <span className={styles.badge}>{c.hero.badge}</span>
          <h1 className={styles.heroTitle}>{c.hero.title}</h1>
          <div className={styles.rrule} />
          <p className={styles.heroSub}>{c.hero.sub}</p>
          <div className={styles.ctaRow}>
            <button type="button" className={styles.btn} onClick={goToQuiz}>
              {c.hero.ctaQuiz} →
            </button>
            <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={goToPrevia}>
              {c.hero.ctaPrevia}
            </button>
          </div>
        </section>

        {/* IDENTIFICAÇÃO */}
        <section className={`${styles.wrap} ${styles.section}`}>
          <h2 className={styles.h2}>{c.identify.heading}</h2>
          <ul className={styles.checklist}>
            {c.identify.items.map((it, i) => (
              <li key={i}>{it}</li>
            ))}
          </ul>
          <p className={styles.punch}>{c.identify.punch}</p>
          <button type="button" className={styles.btn} onClick={goToQuiz}>
            {c.identify.cta}
          </button>
        </section>

        {/* PRÉVIA + CTA duplo */}
        <section className={`${styles.wrap} ${styles.section}`}>
          <div className={styles.previaCard}>
            <p className={styles.eyebrow}>{lang === "es" ? "EL ADELANTO" : "A PRÉVIA"}</p>
            <h2 className={styles.h2}>{c.previa.heading}</h2>
            <p className={styles.lead}>{c.previa.lead}</p>
            <ul className={styles.previaList}>
              {c.previa.items.map((it, i) => (
                <li key={i}>{it}</li>
              ))}
            </ul>
            <p className={styles.closer}>{c.previa.closer}</p>
            <div className={styles.recommend}>
              <button type="button" className={styles.btn} onClick={goToQuiz}>
                {c.previa.ctaQuiz}
              </button>
              <small>{c.previa.ctaQuizNote}</small>
            </div>

            <div className={styles.previaForm} ref={previaRef}>
              {previaState === "done" ? (
                <p className={styles.formOk}>{c.previa.formSuccess}</p>
              ) : (
                <>
                  <label htmlFor="previa-email">{c.previa.formLabel}</label>
                  <div className={styles.inputRow}>
                    <input
                      id="previa-email"
                      ref={previaInputRef}
                      className={styles.input}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      placeholder={c.previa.formPlaceholder}
                      value={previaEmail}
                      onChange={(ev) => {
                        setPreviaEmail(ev.target.value);
                        if (previaState === "error") setPreviaState("idle");
                      }}
                    />
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost}`}
                      disabled={previaState === "sending"}
                      onClick={submitPrevia}
                    >
                      {c.previa.formCta}
                    </button>
                  </div>
                  {previaState === "error" && <p className={styles.formErr}>{c.previa.formError}</p>}
                  <p className={styles.formNote}>{c.previa.formNote}</p>
                </>
              )}
            </div>
          </div>
        </section>

        {/* PROVA / HONESTIDADE */}
        <section className={`${styles.wrap} ${styles.section}`}>
          <p className={styles.eyebrow}>{c.proof.heading}</p>
          <p className={styles.proofBody}>{c.proof.body}</p>
          <p className={styles.honesty}>{c.proof.honesty}</p>
        </section>

        {/* FAQ */}
        <section className={`${styles.wrap} ${styles.section}`}>
          <h2 className={styles.h2}>{c.faq.heading}</h2>
          <div className={styles.faq}>
            {c.faq.items.map((it, i) => (
              <div className={styles.faqItem} key={i}>
                <div className={styles.faqQ}>{it.q}</div>
                <div className={styles.faqA}>{it.a}</div>
              </div>
            ))}
          </div>
        </section>

        {/* QUIZ */}
        <section className={`${styles.wrap} ${styles.section}`} ref={quizRef} id="quiz">
          <div className={styles.quizHead}>
            <p className={styles.kick}>{q.kicker}</p>
            <h2 className={styles.quizTitle}>
              {q.titlePre} <em>{q.titleEm}</em>
            </h2>
            <p className={styles.quizSub}>{q.subtitle}</p>
          </div>

          <p className={styles.opening}>{q.opening}</p>

          <div className={styles.slab}>
            <span className={styles.n}>{q.questionsLabel}</span>
            <span className={styles.ln} />
          </div>

          {!result && step < qCount && (
            <div className={styles.stepper}>
              <div className={styles.stepMeta}>
                <span className={styles.stepCount}>
                  {lang === "es" ? "Pregunta" : "Pergunta"} {step + 1} / {qCount}
                </span>
                <span className={styles.stepAxis}>{q.questions[step].axis}</span>
              </div>
              <div className={styles.stepTrack} aria-hidden="true">
                <i style={{ width: `${(step / qCount) * 100}%` }} />
              </div>

              <div className={styles.stepCard} key={step} aria-live="polite">
                <div className={styles.qtext}>{q.questions[step].text}</div>
                <div className={styles.opts} role="group" aria-label={q.questions[step].axis}>
                  {q.questions[step].options.map((label, value) => {
                    const selected = answers[step] === value;
                    return (
                      <button
                        type="button"
                        key={value}
                        className={`${styles.opt} ${selected ? styles.optSel : ""}`}
                        aria-pressed={selected}
                        onClick={() => pick(step, value)}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className={styles.stepNav}>
                <button
                  type="button"
                  className={styles.stepBtn}
                  disabled={step === 0}
                  onClick={() => goStep(step - 1)}
                >
                  ← {lang === "es" ? "Anterior" : "Anterior"}
                </button>
                <button
                  type="button"
                  className={styles.stepBtn}
                  disabled={answers[step] === null}
                  onClick={() => goStep(step + 1)}
                >
                  {lang === "es" ? "Siguiente" : "Próxima"} →
                </button>
              </div>
            </div>
          )}

          {!result && step >= qCount && (
            <div className={styles.gate}>
              <div className={styles.stepTrack} aria-hidden="true" style={{ marginBottom: 22 }}>
                <i style={{ width: "100%" }} />
              </div>
              <h3>{q.gate.heading}</h3>
              <p>{q.gate.body}</p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={q.gate.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="email"
              />
              <br />
              <button type="button" className={styles.btn} disabled={!canSubmit} onClick={submitQuiz}>
                {q.gate.cta}
              </button>
              <p className={styles.gateHint}>{allAnswered ? q.gate.emailNote : q.gate.hintLocked}</p>
              <button type="button" className={styles.stepBtn} onClick={() => goStep(qCount - 1)}>
                ← {lang === "es" ? "Revisar mis respuestas" : "Revisar minhas respostas"}
              </button>
            </div>
          )}

          {result && (
            <div ref={resultRef} className={styles.verdict} aria-live="polite">
              {/* Marcador de faixa: ponto de cor via CSS (vocabulário do site),
                  não emoji — emoji parecia ícone clicável/ambíguo. */}
              <div className={styles.band} style={{ color: result.band.color }}>
                <i className={styles.bandDot} style={{ background: result.band.color }} aria-hidden="true" />
                {result.total}
                {q.result.scoreSuffix}
              </div>
              <h3>{result.band.name}</h3>
              <div className={styles.meter}>
                <i style={{ width: `${pct}%`, background: result.band.color }} />
                <i style={{ flex: 1, background: "rgba(185,176,162,.15)" }} />
              </div>
              <p className={styles.v}>{result.band.verdict}</p>
              <p className={styles.promise}>{q.result.guidePromise}</p>
            </div>
          )}

          <p className={styles.disc}>{q.disclaimer}</p>
        </section>

        {/* RODAPÉ CTA */}
        <section className={`${styles.wrap} ${styles.footCta}`}>
          <button type="button" className={styles.btn} onClick={goToQuiz}>
            {c.footRepeatCta}
          </button>
        </section>

        <div className={`${styles.wrap} ${styles.foot}`}>
          <p className={styles.disc} style={{ borderLeft: "none", padding: 0, marginBottom: 16 }}>
            {c.footerDisclaimer}
          </p>
          {c.footerSignature}
        </div>
      </div>
    </div>
  );
}
