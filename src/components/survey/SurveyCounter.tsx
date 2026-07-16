"use client";

// Contador de respostas da pesquisa (prova social da página do livro).
// Busca GET /api/survey/count (COUNT real, EXCLUINDO as linhas de teste —
// src/lib/survey-meta.ts; cache CDN 60s). Fail-open: erro/indisponível →
// mostra só o CTA, sem número (a página nunca quebra pela prova social).

import { useEffect, useState } from "react";
import type { Lang } from "@/lib/i18n/dictionaries";
import { surveyContent } from "./survey.content";
import styles from "./survey.module.css";

type CountData = {
  ok: boolean;
  total: number;
  byLang: { pt: number; es: number };
  targetPerLang: number;
};

export default function SurveyCounter({ lang }: { lang: Lang }) {
  const c = surveyContent[lang].livro.counter;
  const [data, setData] = useState<CountData | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/survey/count")
      .then((r) => r.json())
      .then((d: CountData) => {
        if (alive && d?.ok) setData(d);
      })
      .catch(() => {
        /* fail-open: fica sem número */
      });
    return () => {
      alive = false;
    };
  }, []);

  const langCount = data ? data.byLang[lang] : null;
  const target = data?.targetPerLang ?? 400;
  const pct = langCount !== null ? Math.min(100, Math.round((langCount / target) * 100)) : 0;

  return (
    <div className={styles.counterCard}>
      <p className={styles.counterHeading}>{c.heading}</p>
      {langCount !== null && (
        <>
          <p className={styles.counterNumber} aria-live="polite">
            {langCount.toLocaleString(lang === "es" ? "es" : "pt-BR")}
            <span className={styles.counterUnit}> {c.unit}</span>
          </p>
          <div className={styles.counterTrack} aria-hidden="true">
            <div className={styles.counterFill} style={{ width: `${Math.max(pct, 2)}%` }} />
          </div>
          <p className={styles.counterProgress}>{c.progressOf(langCount, target)}</p>
          {data && <p className={styles.counterTotal}>{c.totalLine(data.total)}</p>}
        </>
      )}
      <div style={{ marginTop: 22 }}>
        <a className={`${styles.btn} ${styles.btnRed}`} href={c.surveyHref}>
          {c.cta}
        </a>
      </div>
    </div>
  );
}
