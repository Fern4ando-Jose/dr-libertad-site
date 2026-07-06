"use client";

import { useMemo, useRef, useState } from "react";
import { Instrument_Sans } from "next/font/google";
import type { Lang } from "@/lib/i18n/dictionaries";
import { quizContent, faixaForScore, type Band } from "./quiz.content";
import styles from "./quiz.module.css";

// Instrument Sans compõe o par tipográfico "Amanhecer" com a Fraunces (já global
// como --font-serif). Exposta como --font-instrument e consumida pelo CSS Module.
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

export default function QuizExperience({ lang }: { lang: Lang }) {
  const c = quizContent[lang];
  const [answers, setAnswers] = useState<(number | null)[]>(() => Array(c.questions.length).fill(null));
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ band: Band; total: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const allAnswered = answers.every((a) => a !== null);
  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = allAnswered && emailValid && !submitting && !result;

  const total = useMemo(() => answers.reduce<number>((sum, a) => sum + (a ?? 0), 0), [answers]);

  function pick(qi: number, value: number) {
    if (result) return;
    setAnswers((prev) => {
      const next = [...prev];
      next[qi] = value;
      return next;
    });
  }

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");
    const band = faixaForScore(total, c.bands);
    // Mostra o resultado imediatamente (a UX não depende da rede) e dispara a
    // captura em background. Falha de captura não bloqueia o veredito na tela.
    setResult({ band, total });
    try {
      await fetch("/api/quiz-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), lang, faixa: band.key, score: total }),
      });
    } catch {
      // silencioso — o veredito já está na tela; lead pode ser reprocessado depois
    } finally {
      setSubmitting(false);
      requestAnimationFrame(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  const pct = result ? Math.round((result.total / 24) * 100) : 0;

  return (
    <div className={`${styles.root} ${instrument.variable}`}>
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
        {/* Hero */}
        <section className={`${styles.wrap} ${styles.hero}`}>
          <div className={styles.eclipse}>
            <div className={styles.glow} />
            <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="46" fill="none" stroke="#EBB073" strokeWidth="2.5" />
              <circle cx="74" cy="52" r="40" fill="#160F0C" />
            </svg>
          </div>
          <p className={styles.kick}>{c.kicker}</p>
          <h1 className={styles.disp}>
            {c.titlePre} <em>{c.titleEm}</em>
          </h1>
          <div className={styles.rrule} />
          <p className={styles.lede}>{c.subtitle}</p>
          <p className={styles.herometa}>{c.scrollHint}</p>
        </section>

        {/* Perguntas + gate + resultado */}
        <section className={`${styles.wrap} ${styles.pagepad}`}>
          <p className={styles.opening}>{c.opening}</p>

          <div className={styles.slab}>
            <span className={styles.n}>{c.questionsLabel}</span>
            <span className={styles.ln} />
          </div>

          {c.questions.map((q, qi) => (
            <div className={styles.q} key={qi}>
              <div className={styles.qn}>
                {lang === "es" ? "Pregunta" : "Pergunta"} {qi + 1} — {q.axis}
              </div>
              <div className={styles.qtext}>{q.text}</div>
              <div className={styles.opts} role="group" aria-label={q.axis}>
                {c.options.map((opt) => {
                  const selected = answers[qi] === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.value}
                      className={`${styles.opt} ${selected ? styles.optSel : ""}`}
                      aria-pressed={selected}
                      onClick={() => pick(qi, opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {!result && (
            <div className={styles.gate}>
              <h3>{c.gate.heading}</h3>
              <p>{c.gate.body}</p>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={c.gate.placeholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="email"
              />
              <br />
              <button type="button" className={styles.btn} disabled={!canSubmit} onClick={submit}>
                {c.gate.cta}
              </button>
              {error && <p className={styles.gateErr}>{error}</p>}
              <p className={styles.gateHint}>{allAnswered ? c.gate.emailNote : c.gate.hintLocked}</p>
            </div>
          )}

          {result && (
            <div ref={resultRef} className={styles.verdict} aria-live="polite">
              <div className={styles.band} style={{ color: result.band.color }}>
                {result.band.emoji} {result.total}
                {c.result.scoreSuffix}
              </div>
              <h3>{result.band.name}</h3>
              <div className={styles.meter}>
                <i style={{ width: `${pct}%`, background: result.band.color }} />
                <i style={{ flex: 1, background: "rgba(210,190,160,.12)" }} />
              </div>
              <p className={styles.v}>{result.band.verdict}</p>
              <p className={styles.m}>
                <b>{c.result.meansLabel}</b> {result.band.means}
              </p>
              {result.band.referral && <p className={styles.referral}>{result.band.referral}</p>}
              <p className={styles.promise}>
                <span aria-hidden="true">✉️</span>
                {c.result.guidePromise}
              </p>
            </div>
          )}

          <p className={styles.disc}>{c.disclaimer}</p>
          <div className={styles.foot}>{c.footer}</div>
        </section>
      </div>
    </div>
  );
}
