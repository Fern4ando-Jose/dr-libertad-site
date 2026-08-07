import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  GUIDE_PHASES,
  getGuideDays,
  daysOfPhase,
  daySlug,
  dayBadge,
} from "@/lib/guia";
import type { Lang } from "@/lib/i18n/dictionaries";
import styles from "@/components/guia/guia.module.css";

const SITE_URL = "https://www.drlibertad.com";

export function generateStaticParams() {
  return [{ lang: "pt" }, { lang: "es" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const l: Lang = lang === "es" ? "es" : "pt";
  const title = "Guia 100 Dias para a Liberdade";
  const description =
    "O guia diário gratuito: um passo por dia — ciência curta, uma ação concreta e o seu diário de bordo. Sem milagre, método no seu ritmo.";
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/${l}/guia` },
    robots: { index: false, follow: false }, // área de conteúdo do guia — fora do índice
  };
}

export default async function GuideHubPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (lang !== "pt" && lang !== "es") notFound();
  const l = lang as Lang;

  const days = getGuideDays(l);

  // ES ainda não traduzido.
  if (days.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.wrap}>
          <div className={styles.card}>
            <div className={styles.appbar}>
              <Link href={`/${l}`} className={styles.brand}>
                Dr. <span className={styles.m}>Libertad</span>
              </Link>
            </div>
            <div className={styles.hubHero}>
              <div className={styles.eyebrow}>Guía diaria</div>
              <h1 className={styles.hubTitle}>Muy pronto en español</h1>
              <p className={styles.hubLead}>
                La guía de 100 días está disponible por ahora en portugués. La
                versión en español llega en breve.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const firstSlug = daySlug(days[0]);

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.appbar}>
            <Link href={`/${l}`} className={styles.brand}>
              Dr. <span className={styles.m}>Liberdade</span>
            </Link>
            <span className={styles.enter} style={{ pointerEvents: "none", borderStyle: "dashed" }}>
              Guia grátis · 100 dias
            </span>
          </div>

          <div className={styles.hubHero}>
            <div className={styles.eyebrow}>Seu guia diário</div>
            <h1 className={styles.hubTitle}>100 Dias para a Liberdade</h1>
            <p className={styles.hubLead}>
              Um passo por dia. Ciência curta, uma ação concreta e o seu diário
              de bordo. Sem milagre — método, no seu ritmo.
            </p>
            <div style={{ marginTop: 22 }}>
              <Link className={styles.ctaContinue} href={`/${l}/guia/${firstSlug}`}>
                Começar pelo início →
              </Link>
            </div>
          </div>

          {GUIDE_PHASES.map((phase) => {
            const phaseDays = daysOfPhase(l, phase.key);
            return (
              <div key={phase.key} className={styles.phase}>
                <div className={styles.phaseHead}>
                  <span className={styles.phaseIdx}>{phase.idx}</span>
                  <span className={styles.phaseName}>{phase.label}</span>
                  <span className={styles.phaseMeta}>{phase.range}</span>
                </div>
                <div className={styles.phaseSub}>{phase.sub}</div>
                <ul className={styles.days}>
                  {phaseDays.map((d) => (
                    <li key={daySlug(d)}>
                      <Link className={styles.dayRow} href={`/${l}/guia/${daySlug(d)}`}>
                        <span className={styles.daynum}>{dayBadge(d)}</span>
                        <span className={styles.dayMain}>
                          <span className={styles.dayT}>{d.title}</span>
                          {d.promise && <span className={styles.dayP}>{d.promise}</span>}
                        </span>
                        <span className={styles.dayArrow}>→</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
