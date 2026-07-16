// Página do livro (/livro PT · /libro ES) — camada por TRÁS da pesquisa
// (PLANO-PAGINA-LIVRO.md, veredito de marketing 2026-07-11): a tese entra como
// PERGUNTA (nunca afirmação — honestidade é o diferencial), a pesquisa ao vivo
// é a prova social (contador real) e o CTA primário leva à pesquisa (?de=livro
// → coluna `origem`). SEM data de lançamento — o marco é o contador (~400/idioma).
// Ordem das seções: gancho-pergunta → pesquisa ao vivo → como funciona →
// o autor → waitlist (source='livro').

import type { Lang } from "@/lib/i18n/dictionaries";
import { surveyContent } from "./survey.content";
import SurveyCounter from "./SurveyCounter";
import WaitlistForm from "./WaitlistForm";
import styles from "./survey.module.css";

export default function LivroView({ lang }: { lang: Lang }) {
  const c = surveyContent[lang];
  const l = c.livro;

  return (
    <div className={styles.root} lang={lang === "es" ? "es" : "pt-BR"}>
      <div className={styles.backdrop} aria-hidden="true" />
      <div className={styles.app}>
        {/* (a) Gancho-PERGUNTA + honestidade */}
        <section className={`${styles.wrap} ${styles.hero}`}>
          <p className={styles.kicker}>{l.kicker}</p>
          <h1 className={styles.title}>
            <em>{l.question}</em>
          </h1>
          <div className={styles.rule} />
          <p className={styles.lede}>{l.honesty}</p>
        </section>

        {/* (b) Pesquisa ao vivo — contador real + CTA primário */}
        <section className={`${styles.wrap} ${styles.livroSection}`}>
          <SurveyCounter lang={lang} />
        </section>

        {/* (c) Como funciona o estudo */}
        <section className={`${styles.wrap} ${styles.livroSection}`}>
          <h2 className={styles.screenTitle}>{l.how.heading}</h2>
          <div className={styles.screenRule} />
          <ul className={styles.howList}>
            {l.how.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {/* (d) O autor */}
        <section className={`${styles.wrap} ${styles.livroSection}`}>
          <h2 className={styles.screenTitle}>{l.author.heading}</h2>
          <div className={styles.screenRule} />
          <p className={styles.authorBody}>{l.author.body}</p>
          <a className={styles.btnGhost} href={c.instagramUrl} target="_blank" rel="noopener noreferrer">
            {l.author.igLabel} →
          </a>
        </section>

        {/* (e) Waitlist (source='livro') */}
        <section className={`${styles.wrap} ${styles.livroSection} ${styles.livroLast}`}>
          <h2 className={styles.screenTitle}>{l.waitlistHeading}</h2>
          <div className={styles.screenRule} />
          <WaitlistForm lang={lang} source="livro" />
        </section>

        <footer className={styles.foot}>{c.footerNote}</footer>
      </div>
    </div>
  );
}
