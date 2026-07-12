// Termo de consentimento (§1 — pesquisa anônima) na íntegra, por idioma.
// Server component (sem interação) — textos em survey.content.ts.

import type { Lang } from "@/lib/i18n/dictionaries";
import { surveyContent } from "./survey.content";
import styles from "./survey.module.css";

export default function TermoView({ lang }: { lang: Lang }) {
  const c = surveyContent[lang];
  return (
    <div className={styles.root} lang={lang === "es" ? "es" : "pt-BR"}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.app}>
        <article className={`${styles.wrap} ${styles.article}`}>
          <a className={styles.backLink} href={c.basePath}>
            {c.termo.backLabel}
          </a>
          <h1 className={styles.articleTitle}>{c.termo.title}</h1>
          <p className={styles.articleBody}>{c.termo.intro}</p>
          <div style={{ marginTop: 24 }}>
            {c.termo.items.map((item) => (
              <section className={styles.articleItem} key={item.heading}>
                <h2>{item.heading}</h2>
                <p>{item.body}</p>
              </section>
            ))}
          </div>
          <p className={styles.fieldNote} style={{ marginTop: 20 }}>
            {c.termo.accept}
          </p>
        </article>
        <footer className={styles.foot}>{c.footerNote}</footer>
      </div>
    </div>
  );
}
