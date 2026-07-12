// Página de obrigado/gracias — CTA de seguir a conta do idioma + evento do
// Pixel ("pesquisa_enviada") quando NEXT_PUBLIC_META_PIXEL_ID existir.

import type { Lang } from "@/lib/i18n/dictionaries";
import { surveyContent } from "./survey.content";
import MetaPixel from "./MetaPixel";
import styles from "./survey.module.css";

export default function ThanksView({ lang }: { lang: Lang }) {
  const c = surveyContent[lang];
  const siteHome = lang === "es" ? "/es" : "/pt";
  return (
    <div className={styles.root} lang={lang === "es" ? "es" : "pt-BR"}>
      {/* Evento de conversão da campanha (só dispara com a env do Pixel setada) */}
      <MetaPixel event="pesquisa_enviada" />
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.app}>
        <section className={`${styles.wrap} ${styles.thanks}`}>
          <h1 className={styles.thanksTitle}>{c.thanks.title}</h1>
          <p className={styles.thanksBody}>{c.thanks.body}</p>
          <div className={styles.thanksActions}>
            <a
              className={`${styles.btn} ${styles.btnRed}`}
              href={c.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {c.thanks.cta} →
            </a>
            <a className={styles.btnGhost} href={siteHome}>
              {c.thanks.backToSite}
            </a>
          </div>
        </section>
        <footer className={styles.foot}>{c.footerNote}</footer>
      </div>
    </div>
  );
}
