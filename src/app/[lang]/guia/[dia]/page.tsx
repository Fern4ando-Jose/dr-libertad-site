import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getGuideDays,
  getGuideDay,
  neighbours,
  daySlug,
  dayLabel,
} from "@/lib/guia";
import type { GuideDay } from "@/lib/guia";
import type { Lang } from "@/lib/i18n/dictionaries";
import { MarkdownLite, InlineText } from "@/components/guia/MarkdownLite";
import styles from "@/components/guia/guia.module.css";

const SITE_URL = "https://www.drlibertad.com";

export function generateStaticParams() {
  // Só PT por enquanto (ES não traduzido). Uma rota por dia.
  return getGuideDays("pt").map((d) => ({ lang: "pt", dia: daySlug(d) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string; dia: string }>;
}): Promise<Metadata> {
  const { lang, dia } = await params;
  const l: Lang = lang === "es" ? "es" : "pt";
  const d = getGuideDay(l, dia);
  if (!d) return { title: "Guia 100 Dias" };
  return {
    title: `${dayLabel(d)} — ${d.title}`,
    description: d.promise,
    alternates: { canonical: `${SITE_URL}/${l}/guia/${dia}` },
    robots: { index: false, follow: false },
  };
}

// Extrai os itens de ação (marcáveis) e a nota de registro do markdown da seção.
function parseAction(md: string): { items: string[]; note: string } {
  const lines = md.split("\n").map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];
  let note = "";
  for (const line of lines) {
    const isRegistro = /registro/i.test(line) && /^-?\s*\*?\(?registro/i.test(line.replace(/^-\s*/, ""));
    if (isRegistro || /^-?\s*\*\(registro/i.test(line)) {
      note = line.replace(/^-\s*/, "");
    } else if (/^-\s*\[\s*\]\s*/.test(line)) {
      items.push(line.replace(/^-\s*\[\s*\]\s*/, ""));
    } else if (/^-\s+/.test(line)) {
      if (/registro/i.test(line)) note = line.replace(/^-\s*/, "");
      else items.push(line.replace(/^-\s+/, ""));
    } else if (!items.length) {
      items.push(line);
    }
  }
  if (!items.length && lines.length) items.push(lines[0]);
  return { items, note };
}

export default async function GuideDayPage({
  params,
}: {
  params: Promise<{ lang: string; dia: string }>;
}) {
  const { lang, dia } = await params;
  if (lang !== "pt" && lang !== "es") notFound();
  const l = lang as Lang;

  const d: GuideDay | undefined = getGuideDay(l, dia);
  if (!d) notFound();

  const { prev, next } = neighbours(l, dia);
  const action = parseAction(d.action);

  return (
    <div className={styles.root}>
      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.appbar}>
            <Link href={`/${l}`} className={styles.brand}>
              Dr. <span className={styles.m}>Liberdade</span>
            </Link>
          </div>

          <div className={styles.readerTop}>
            <div className={styles.crumb}>
              <Link href={`/${l}/guia`}>← Guia</Link>
              <span>·</span>
              <span>{d.phaseLabel}</span>
            </div>
          </div>

          <div className={styles.readerHead}>
            <span className={styles.dayBadge}>
              {d.phaseLabel} · {dayLabel(d)}
            </span>
            <h1 className={styles.readerTitle}>{d.title}</h1>
            {d.promise && <p className={styles.readerPromise}>{d.promise}</p>}
          </div>

          <div className={styles.sectionTag}>A ciência do dia</div>
          <div className={styles.prose}>
            <MarkdownLite text={d.science} />
          </div>

          {action.items.length > 0 && (
            <div className={styles.action}>
              <div className={styles.tag}>Sua ação de hoje</div>
              {action.items.map((it, i) => (
                <div className={styles.arow} key={i}>
                  <span className={styles.checkbox} aria-hidden="true" />
                  <div className={styles.txt}>
                    <InlineText text={it} />
                  </div>
                </div>
              ))}
              {action.note && (
                <div className={styles.reg}>
                  <InlineText text={action.note} />
                </div>
              )}
            </div>
          )}

          {d.trap && (
            <div className={styles.trap}>
              <div className={styles.tag}>⚠ A armadilha do dia</div>
              <MarkdownLite text={d.trap} />
            </div>
          )}

          <div className={styles.journal}>
            <div className={styles.tag}>✍ Seu diário de bordo</div>
            <div className={styles.hint}>
              O que aconteceu hoje ao aplicar isto? O gatilho que veio, o que
              funcionou e o que falhou. Escreve sem censura — só você vê.
            </div>
            <textarea
              className={styles.box}
              placeholder="Escreva aqui o seu dia…"
              rows={4}
              readOnly
            />
            <div className={styles.lockmsg}>
              Entre na sua conta para salvar o diário e o seu progresso.
            </div>
          </div>

          <div className={styles.readerNav}>
            {prev ? (
              <Link className={styles.navbtn} href={`/${l}/guia/${daySlug(prev)}`}>
                ← {dayLabel(prev)} · {prev.title}
              </Link>
            ) : (
              <span className={`${styles.navbtn} ${styles.spacer}`} />
            )}
            {next ? (
              <Link className={`${styles.navbtn} ${styles.next}`} href={`/${l}/guia/${daySlug(next)}`}>
                {dayLabel(next)} · {next.title} →
              </Link>
            ) : (
              <span className={`${styles.navbtn} ${styles.spacer}`} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
