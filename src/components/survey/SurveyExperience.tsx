"use client";

// Funil da pesquisa "Redes Sociais e Relacionamentos" (FUNIL v2) — 7 telas,
// mobile-first (tráfego vem do Instagram): tela 0 = herói + consentimento
// (obrigatório), telas 1–5 = itens fechados (todas respondidas para avançar;
// itens sensíveis têm "prefiro não responder"), tela 6 = abertas + e-mail (tudo
// opcional). Botões narrativos de progresso por tela (embalagem v2).
// Estrutura das perguntas: src/lib/survey-schema.ts · textos: survey.content.ts.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n/dictionaries";
import { PNR, SCREENS, type QuestionSpec, type Answers } from "@/lib/survey-schema";
import { surveyContent } from "./survey.content";
import styles from "./survey.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOTAL_STEPS = 7; // tela 0 + 6 telas de perguntas

// Micro-copy de pioneirismo (FUNIL v2, tela 0): "usar SÓ enquanto for verdade".
// Default LIGADA (janela de lançamento); quando deixar de ser verdade, setar
// NEXT_PUBLIC_SURVEY_LAUNCH_WINDOW=0 na Vercel e redeployar (P4 — sem claim falso no ar).
const LAUNCH_WINDOW = process.env.NEXT_PUBLIC_SURVEY_LAUNCH_WINDOW !== "0";

// Nº global do item (1..24), igual ao FUNIL-PERGUNTAS.md.
const QUESTION_NUMBER: Record<string, number> = (() => {
  const map: Record<string, number> = {};
  let n = 1;
  for (const s of SCREENS) for (const q of s.questions) map[q.id] = n++;
  return map;
})();

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 6.2 4.8 9 10 3.4" fill="none" stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function SurveyExperience({ lang }: { lang: Lang }) {
  const c = surveyContent[lang];
  const router = useRouter();

  const [step, setStep] = useState(0); // 0 = herói/consentimento; 1..6 = SCREENS[step-1]
  const [consent, setConsent] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);

  const screenSpec = step >= 1 ? SCREENS[step - 1] : null;
  const screenCopy = step >= 1 ? c.screens[step - 1] : null;
  const isLast = step === TOTAL_STEPS - 1;

  const screenComplete = useMemo(() => {
    if (!screenSpec) return consent;
    if (isLast) return true; // tela 6: tudo opcional
    return screenSpec.questions.every((q) => {
      const v = answers[q.id];
      if (q.kind === "multi") return Array.isArray(v) && v.length > 0;
      return v !== undefined;
    });
  }, [screenSpec, isLast, answers, consent]);

  const emailTrimmed = email.trim().toLowerCase();
  const emailOk = emailTrimmed === "" || EMAIL_RE.test(emailTrimmed);

  function setAnswer(id: string, value: Answers[string]) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id: string, value: string) {
    setAnswers((prev) => {
      const cur = Array.isArray(prev[id]) ? (prev[id] as string[]) : [];
      const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
      return { ...prev, [id]: next };
    });
  }

  function goTo(next: number) {
    setSubmitError(false);
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit() {
    if (submitting || !emailOk) return;
    setSubmitting(true);
    setSubmitError(false);
    try {
      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lang,
          consent: true,
          answers,
          email: emailTrimmed || null,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && data?.ok) {
        router.push(c.thanksPath);
        return;
      }
      setSubmitError(true);
    } catch {
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  }

  function renderOptions(spec: QuestionSpec) {
    const copy = screenCopy!.questions[spec.id];

    if (spec.kind === "scale") {
      const cur = answers[spec.id];
      return (
        <div>
          <div className={styles.scale} role="group" aria-label={copy.text}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.scaleBtn} ${cur === n ? styles.scaleSel : ""}`}
                aria-pressed={cur === n}
                onClick={() => setAnswer(spec.id, n)}
              >
                {n}
              </button>
            ))}
          </div>
          <div className={styles.scaleAnchors}>
            <span>{c.scaleAnchors.low}</span>
            <span>{c.scaleAnchors.high}</span>
          </div>
          {/* v2: item sensível em escala (q19) também aceita "prefiro não responder" */}
          {spec.pnr && (
            <div className={styles.scalePnrRow}>
              <button
                type="button"
                className={`${styles.opt} ${styles.optPnr} ${cur === PNR ? styles.optSel : ""}`}
                aria-pressed={cur === PNR}
                onClick={() => setAnswer(spec.id, PNR)}
              >
                {c.pnrLabel}
              </button>
            </div>
          )}
        </div>
      );
    }

    if (spec.kind === "open") {
      return (
        <textarea
          className={styles.textarea}
          value={(answers[spec.id] as string | undefined) ?? ""}
          placeholder={copy.placeholder}
          maxLength={2000}
          onChange={(e) => setAnswer(spec.id, e.target.value)}
          aria-label={copy.text}
        />
      );
    }

    // single / multi / freq / yesno → pílulas
    let entries: [string, string][];
    if (spec.kind === "freq") entries = Object.entries(c.freqLabels);
    else if (spec.kind === "yesno") entries = Object.entries(c.yesnoLabels);
    else entries = Object.entries(copy.options ?? {});
    // v2: opção "não se aplica" do q13 ("nunca conheci alguém que vi primeiro online")
    if (spec.extra && copy.extraLabel) entries = [...entries, [spec.extra, copy.extraLabel]];
    if (spec.pnr) entries = [...entries, [PNR, c.pnrLabel]];

    const cur = answers[spec.id];
    return (
      <div className={styles.opts} role="group" aria-label={copy.text}>
        {entries.map(([value, label]) => {
          const selected =
            spec.kind === "multi" ? Array.isArray(cur) && cur.includes(value) : cur === value;
          return (
            <button
              key={value}
              type="button"
              className={`${styles.opt} ${selected ? styles.optSel : ""} ${value === PNR || value === spec.extra ? styles.optPnr : ""}`}
              aria-pressed={selected}
              onClick={() =>
                spec.kind === "multi" ? toggleMulti(spec.id, value) : setAnswer(spec.id, value)
              }
            >
              {label}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={styles.root} lang={lang === "es" ? "es" : "pt-BR"}>
      <div className={styles.backdrop} aria-hidden="true" />

      <div className={styles.app}>
        {/* Progresso */}
        <div className={styles.progress}>
          <div className={styles.progressInner}>
            <span className={styles.progressBrand}>{c.brand}</span>
            <span className={styles.progressLabel}>{c.progressLabel(step + 1, TOTAL_STEPS)}</span>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <div className={styles.progressFill} style={{ width: `${((step + 1) / TOTAL_STEPS) * 100}%` }} />
          </div>
        </div>

        {/* Tela 0 — herói + consentimento */}
        {step === 0 && (
          <section className={`${styles.wrap} ${styles.hero} ${styles.screen}`}>
            <p className={styles.kicker}>{c.hero.kicker}</p>
            <h1 className={styles.title}>
              {c.hero.titlePre} <em>{c.hero.titleEm}</em>
            </h1>
            <div className={styles.rule} />
            <p className={styles.lede}>{c.hero.lede}</p>
            {/* Pioneirismo — só na janela de lançamento (flag; ver LAUNCH_WINDOW) */}
            {LAUNCH_WINDOW && <p className={styles.launchNote}>{c.hero.launchNote}</p>}

            <div className={styles.consent}>
              <label className={styles.consentRow}>
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
                />
                <span className={`${styles.consentBox} ${consent ? styles.consentBoxOn : ""}`} aria-hidden="true">
                  <CheckIcon />
                </span>
                <span className={styles.consentText}>{c.consent.label}</span>
              </label>
              <a className={styles.termLink} href={c.termoPath} target="_blank" rel="noopener noreferrer">
                {c.consent.termLink}
              </a>
            </div>

            <div className={styles.heroCta}>
              <button type="button" className={styles.btn} disabled={!consent} onClick={() => goTo(1)}>
                {c.consent.start}
              </button>
            </div>
          </section>
        )}

        {/* Telas 1–6 */}
        {screenSpec && screenCopy && (
          <section key={step} className={`${styles.wrap} ${styles.screen}`}>
            <p className={styles.screenKicker}>
              {c.progressLabel(step + 1, TOTAL_STEPS)}
            </p>
            <h2 className={styles.screenTitle}>{screenCopy.title}</h2>
            {screenCopy.note && <p className={styles.screenNote}>{screenCopy.note}</p>}
            <div className={styles.screenRule} />

            {screenSpec.questions.map((spec) => (
              <div className={styles.q} key={spec.id}>
                <p className={styles.qNum}>{String(QUESTION_NUMBER[spec.id]).padStart(2, "0")}</p>
                <p className={styles.qText}>{screenCopy.questions[spec.id].text}</p>
                {renderOptions(spec)}
              </div>
            ))}

            {/* Tela 6: convite de entrevista (e-mail opcional — item 25 do funil) */}
            {isLast && (
              <div className={styles.q}>
                <p className={styles.qNum}>25</p>
                <p className={styles.qText}>{c.email.label}</p>
                <input
                  className={styles.input}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={c.email.placeholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-label={c.email.label}
                />
                <p className={styles.fieldNote}>{c.email.note}</p>
                {!emailOk && <p className={styles.fieldErr}>{c.email.invalid}</p>}
              </div>
            )}

            <div className={styles.navRow}>
              <button type="button" className={styles.btnGhost} onClick={() => goTo(step - 1)}>
                ← {c.nav.back}
              </button>
              {isLast ? (
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnRed}`}
                  disabled={submitting || !emailOk}
                  onClick={submit}
                >
                  {submitting ? c.nav.submitting : c.nav.submit}
                </button>
              ) : (
                <button type="button" className={styles.btn} disabled={!screenComplete} onClick={() => goTo(step + 1)}>
                  {screenCopy.nextLabel}
                </button>
              )}
            </div>
            {!screenComplete && !isLast && <p className={styles.navHint}>{c.nav.incompleteHint}</p>}
            {isLast && !submitError && <p className={styles.navHint}>{c.nav.optionalHint}</p>}
            {submitError && <p className={styles.navErr}>{c.nav.error}</p>}
          </section>
        )}

        <footer className={styles.foot}>{c.footerNote}</footer>
      </div>
    </div>
  );
}
