"use client";

// Opt-in de e-mail da pesquisa/livro (waitlist) — usado como bloco principal do
// obrigado (source='obrigado') e na página do livro (source='livro').
// Consentimento LGPD PRÓPRIO (checkbox), separado do consentimento de pesquisa:
// sem marcar, não envia. POST /api/waitlist (idempotente por e-mail+livro).

import { useState } from "react";
import type { Lang } from "@/lib/i18n/dictionaries";
import { surveyContent } from "./survey.content";
import styles from "./survey.module.css";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Slug do livro desta pesquisa na tabela `waitlist` (book_slug). */
export const BOOK_SLUG = "redes-relacionamentos";

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 6.2 4.8 9 10 3.4" fill="none" stroke="#0B0B0C" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function WaitlistForm({
  lang,
  source,
}: {
  lang: Lang;
  source: "obrigado" | "livro";
}) {
  const c = surveyContent[lang].waitlist;
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function submit() {
    if (state !== "idle") return;
    const candidate = email.trim().toLowerCase();
    if (!EMAIL_RE.test(candidate)) {
      setError(c.invalidEmail);
      return;
    }
    if (!consent) {
      setError(c.needConsent);
      return;
    }
    setError("");
    setState("sending");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: candidate, lang, slug: BOOK_SLUG, source, consent: true }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (res.ok && data?.ok) {
        setState("done");
        return;
      }
      setError(c.error);
      setState("idle");
    } catch {
      setError(c.error);
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className={styles.waitlistCard} aria-live="polite">
        <p className={styles.waitlistSuccess}>✓ {c.success}</p>
      </div>
    );
  }

  return (
    <div className={styles.waitlistCard}>
      <h3 className={styles.waitlistHeading}>{c.heading}</h3>
      <p className={styles.waitlistBody}>{c.body}</p>
      <div className={styles.waitlistRow}>
        <input
          className={styles.input}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={c.placeholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label={c.placeholder}
        />
        <button
          type="button"
          className={`${styles.btn} ${styles.btnRed}`}
          disabled={state === "sending"}
          onClick={submit}
        >
          {state === "sending" ? c.submitting : c.submit}
        </button>
      </div>
      <label className={styles.consentRow} style={{ marginTop: 14 }}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        />
        <span className={`${styles.consentBox} ${consent ? styles.consentBoxOn : ""}`} aria-hidden="true">
          <CheckIcon />
        </span>
        <span className={styles.waitlistConsentText}>{c.consentLabel}</span>
      </label>
      {error && <p className={styles.fieldErr}>{error}</p>}
    </div>
  );
}
