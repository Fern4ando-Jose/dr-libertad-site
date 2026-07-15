"use client";

// Página institucional "O Estudo" / "El Estudio" — apresenta o projeto de
// pesquisa e leva ao funil (/pesquisa · /investigacion). Vestida com o design
// system do site (tinta #0B0B0C · papel · vermelho #A45A5A · Fraunces + Inter),
// mobile-first (95% do tráfego vem do Instagram). Reveal por seção com
// framer-motion, respeitando prefers-reduced-motion (whileInView + once).

import { motion } from "framer-motion";
import type { Lang } from "@/lib/i18n/dictionaries";
import { estudoContent, type EstudoCopy } from "./estudo.content";
import LiveCount from "./LiveCount";

const MAX = "mx-auto w-full max-w-[1080px] px-6";
const COL = "mx-auto w-full max-w-[760px] px-6";

// Marcador **negrito** → <strong>.
function Rich({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-medium text-offwhite">
            {p}
          </strong>
        ) : (
          <span key={i}>{p}</span>
        )
      )}
    </>
  );
}

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function BrandMark() {
  return (
    <svg viewBox="0 0 64 64" className="h-[26px] w-[26px]" aria-hidden="true">
      <rect width="64" height="64" rx="14" fill="#0B0B0C" />
      <circle cx="32" cy="32" r="17" fill="none" stroke="#B9B0A2" strokeWidth="2.4" strokeOpacity="0.5" />
      <path d="M32 15 a17 17 0 0 1 0 34 Z" fill="#A45A5A" />
      <circle cx="32" cy="32" r="3.4" fill="#F4F0E8" />
    </svg>
  );
}

function SecHeading({
  eyebrow,
  pre,
  em,
  post,
}: {
  eyebrow: string;
  pre: string;
  em: string;
  post: string;
}) {
  return (
    <>
      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-red">{eyebrow}</p>
      <h2 className="mt-3.5 max-w-[18ch] font-serif text-[clamp(1.75rem,4.4vw,2.75rem)] font-normal leading-[1.08] tracking-[-0.015em] text-balance">
        {pre}
        <em className="italic text-muted-red">{em}</em>
        {post}
      </h2>
    </>
  );
}

export default function EstudoPage({ lang }: { lang: Lang }) {
  const c: EstudoCopy = estudoContent[lang];

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-ink text-offwhite">
      {/* Fundo: brasa vermelha + vinheta editorial */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(120vw 72vh at 50% -20%, rgba(164,90,90,0.16), transparent 60%), radial-gradient(82vw 52vh at 88% 112%, rgba(164,90,90,0.07), transparent 60%), linear-gradient(180deg, #101012 0%, #0B0B0C 44%)",
        }}
      />
      <div className="grain z-[1]" aria-hidden="true" />

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-warm-gray/15 bg-ink/70 backdrop-blur-md">
        <div className={`${MAX} flex items-center justify-between gap-4 py-3.5`}>
          <a href={c.surveyPath} className="inline-flex items-center gap-3" aria-label={c.brand}>
            <BrandMark />
            <span className="relative pb-1 font-serif text-[17px] font-medium text-offwhite">
              {c.brand}
              <span className="absolute bottom-0 left-0 h-[2px] w-[26px] bg-muted-red" />
            </span>
          </a>
          <div className="flex items-center gap-3">
            <a
              href={c.otherLang.path}
              className="rounded-full border border-warm-gray/20 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-warm-gray/70 transition hover:text-offwhite"
            >
              {c.otherLang.label}
            </a>
            <a
              href={c.surveyPath}
              className="inline-flex items-center gap-2 rounded-full border border-warm-gray/25 px-4 py-2.5 text-[13.5px] font-medium text-offwhite transition hover:border-muted-red hover:bg-muted-red/15"
            >
              {c.nav.respond}
              <span className="hidden sm:inline">{c.nav.respondLong}</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      </header>

      <main className="relative z-[2]">
        {/* Hero */}
        <section className="pb-14 pt-[clamp(64px,13vh,132px)]">
          <div className={MAX}>
            <Reveal>
              <p className="mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-warm-gray">
                <span className="inline-block h-px w-[26px] bg-muted-red" />
                {c.hero.kicker}
              </p>
            </Reveal>
            <Reveal delay={0.08}>
              <h1 className="max-w-[15ch] font-serif text-[clamp(2.4rem,7.4vw,4.75rem)] font-normal leading-[1.02] tracking-[-0.02em] text-balance">
                {c.hero.titlePre}
                <em className="italic text-muted-red">{c.hero.titleEm}</em>
                {c.hero.titlePost}
              </h1>
            </Reveal>
            <Reveal delay={0.16}>
              <p className="mt-7 max-w-[40em] text-[clamp(1.03rem,2.2vw,1.25rem)] leading-[1.62] text-offwhite/85">
                <Rich text={c.hero.lede} />
              </p>
            </Reveal>
            <Reveal delay={0.16}>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {c.hero.chips.map((chip) => (
                  <span
                    key={chip}
                    className="inline-flex items-center gap-2 rounded-full border border-warm-gray/15 bg-white/[0.03] px-3.5 py-2 text-[11.5px] uppercase tracking-[0.14em] text-offwhite/90"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-red" />
                    {chip}
                  </span>
                ))}
              </div>
            </Reveal>
            <Reveal delay={0.24}>
              <div className="mt-10 flex flex-wrap items-center gap-3.5">
                <a
                  href={c.surveyPath}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-muted-red px-7 py-4 text-[15px] font-medium text-offwhite shadow-[0_20px_46px_-20px_rgba(164,90,90,0.6)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  {c.hero.ctaPrimary}
                  <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </a>
                <a
                  href="#estudo"
                  className="inline-flex items-center gap-2 rounded-full border border-warm-gray/15 px-6 py-3.5 text-[14.5px] text-warm-gray transition hover:border-warm-gray/35 hover:text-offwhite"
                >
                  {c.hero.ctaSecondary}
                </a>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Pesquisa ao vivo */}
        <section className="py-[clamp(40px,8vh,72px)]">
          <div className={MAX}>
            <Reveal>
              <LiveCount lang={lang} c={c} />
            </Reveal>
          </div>
        </section>

        {/* Propósito */}
        <section className="py-[clamp(48px,9vh,96px)]">
          <div className={COL}>
            <Reveal>
              <SecHeading
                eyebrow={c.proposito.eyebrow}
                pre={c.proposito.titlePre}
                em={c.proposito.titleEm}
                post={c.proposito.titlePost}
              />
            </Reveal>
            {c.proposito.paras.map((p, i) => (
              <Reveal key={i} delay={0.08}>
                <p className="mt-5 max-w-[40em] text-[clamp(1rem,1.9vw,1.125rem)] leading-[1.68] text-offwhite/80">
                  <Rich text={p} />
                </p>
              </Reveal>
            ))}
          </div>
        </section>

        <div className={MAX}>
          <div className="h-px w-full bg-warm-gray/15" />
        </div>

        {/* Como funciona */}
        <section id="estudo" className="py-[clamp(48px,9vh,96px)]">
          <div className={MAX}>
            <Reveal>
              <SecHeading
                eyebrow={c.estudo.eyebrow}
                pre={c.estudo.titlePre}
                em={c.estudo.titleEm}
                post={c.estudo.titlePost}
              />
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-5 max-w-[40em] text-[clamp(1rem,1.9vw,1.125rem)] leading-[1.68] text-offwhite/80">
                <Rich text={c.estudo.lede} />
              </p>
            </Reveal>
            <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-9">
              {c.estudo.steps.map((s, i) => (
                <Reveal key={s.num} delay={i * 0.08}>
                  <div className="border-t border-warm-gray/30 pt-6">
                    <div className="font-serif text-[14px] italic text-muted-red">{s.num}</div>
                    <h3 className="mt-3 font-serif text-[clamp(1.2rem,2.4vw,1.45rem)] font-medium leading-[1.2]">
                      {s.title}
                    </h3>
                    <p className="mt-2.5 text-[14.5px] leading-[1.62] text-offwhite/75">{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Hipóteses */}
        <section className="pb-[clamp(48px,9vh,96px)]">
          <div className={MAX}>
            <Reveal>
              <SecHeading
                eyebrow={c.hipoteses.eyebrow}
                pre={c.hipoteses.titlePre}
                em={c.hipoteses.titleEm}
                post={c.hipoteses.titlePost}
              />
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-5 max-w-[40em] text-[clamp(1rem,1.9vw,1.125rem)] leading-[1.68] text-offwhite/80">
                {c.hipoteses.lede}
              </p>
            </Reveal>
            <div className="mt-9 grid gap-px overflow-hidden rounded-[20px] border border-warm-gray/15 bg-warm-gray/15 sm:grid-cols-2">
              {c.hipoteses.items.map((h) => (
                <div key={h.tag} className="bg-ink p-6 transition-colors hover:bg-[#0e0e10] md:p-7">
                  <p className="font-serif text-[15px] italic text-muted-red">{h.tag}</p>
                  <h3 className="mt-2.5 font-serif text-[clamp(1.05rem,2.2vw,1.3rem)] font-medium leading-[1.28]">
                    {h.title}
                  </h3>
                  <p className="mt-2 text-[14.5px] leading-[1.6] text-offwhite/70">{h.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={MAX}>
          <div className="h-px w-full bg-warm-gray/15" />
        </div>

        {/* Rigor & ética */}
        <section className="py-[clamp(48px,9vh,96px)]">
          <div className={MAX}>
            <Reveal>
              <SecHeading
                eyebrow={c.rigor.eyebrow}
                pre={c.rigor.titlePre}
                em={c.rigor.titleEm}
                post={c.rigor.titlePost}
              />
            </Reveal>
            <div className="mt-8 grid gap-x-12 sm:grid-cols-2">
              {c.rigor.items.map((r) => (
                <div key={r.ic} className="border-t border-warm-gray/15 py-5.5">
                  <h3 className="flex items-baseline gap-2.5 font-serif text-[18px] font-medium">
                    <span className="text-[14px] italic text-muted-red">{r.ic}</span>
                    {r.title}
                  </h3>
                  <p className="mt-1.5 text-[14.5px] leading-[1.62] text-offwhite/72">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className={MAX}>
          <div className="h-px w-full bg-warm-gray/15" />
        </div>

        {/* Quem está por trás */}
        <section className="py-[clamp(48px,9vh,96px)]">
          <div className={MAX}>
            <Reveal>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-red">{c.autor.eyebrow}</p>
              <h2 className="mb-9 mt-3.5 font-serif text-[clamp(1.75rem,4.4vw,2.75rem)] font-normal leading-[1.08] tracking-[-0.015em]">
                {c.autor.title}
              </h2>
            </Reveal>
            <Reveal delay={0.08}>
              <div className="grid items-start gap-8 rounded-[24px] border border-warm-gray/15 bg-white/[0.03] p-7 md:grid-cols-[auto_1fr] md:gap-11 md:p-12">
                <div
                  className="flex h-[120px] w-[120px] items-center justify-center rounded-[20px] border border-warm-gray/30 font-serif text-[44px] italic text-offwhite"
                  style={{
                    background:
                      "radial-gradient(60% 60% at 50% 30%, rgba(164,90,90,0.35), transparent 70%), linear-gradient(160deg, #17161a, #0d0d0f)",
                  }}
                  aria-hidden="true"
                >
                  DL
                </div>
                <div>
                  <h3 className="font-serif text-[clamp(1.35rem,3vw,1.75rem)] font-medium">{c.autor.name}</h3>
                  <p className="mb-4 mt-1 text-[12px] uppercase tracking-[0.2em] text-warm-gray">{c.autor.role}</p>
                  <p className="max-w-[44em] text-[15px] leading-[1.66] text-offwhite/82">{c.autor.bioSafe}</p>
                  <p className="mt-3.5 max-w-[44em] text-[15px] leading-[1.66] text-offwhite/82">{c.autor.para2}</p>
                  <a
                    href={c.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-2 rounded-full border border-warm-gray/15 px-5 py-3 text-[14px] text-warm-gray transition hover:border-warm-gray/35 hover:text-offwhite"
                  >
                    {c.autor.follow}
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* CTA final */}
        <section className="py-[clamp(48px,9vh,96px)] text-center">
          <div className={COL}>
            <Reveal>
              <p className="text-[11px] uppercase tracking-[0.24em] text-muted-red">{c.cta.eyebrow}</p>
              <h2 className="mx-auto mt-3.5 max-w-[16ch] font-serif text-[clamp(1.9rem,5vw,3.25rem)] font-normal leading-[1.06] tracking-[-0.02em] text-balance">
                {c.cta.titlePre}
                <em className="italic text-muted-red">{c.cta.titleEm}</em>
              </h2>
              <p className="mx-auto mt-5 max-w-[40em] text-[clamp(1.03rem,2.2vw,1.2rem)] leading-[1.62] text-offwhite/85">
                {c.cta.lede}
              </p>
              <div className="mt-9 flex justify-center">
                <a
                  href={c.surveyPath}
                  className="group inline-flex items-center gap-2.5 rounded-full bg-muted-red px-8 py-4 text-[15px] font-medium text-offwhite shadow-[0_20px_46px_-20px_rgba(164,90,90,0.6)] transition hover:-translate-y-0.5 hover:brightness-105"
                >
                  {c.cta.button}
                  <span className="transition group-hover:translate-x-1" aria-hidden="true">→</span>
                </a>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-[2] border-t border-warm-gray/15 py-10">
        <div className={`${MAX} flex flex-wrap items-center justify-between gap-4`}>
          <span className="text-[11.5px] uppercase tracking-[0.14em] text-warm-gray/60">{c.footer.note}</span>
          <div className="flex gap-6 text-[13.5px] text-warm-gray">
            <a href={c.surveyPath} className="transition hover:text-offwhite">{c.footer.respond}</a>
            <a href={c.termoPath} className="transition hover:text-offwhite">{c.footer.termo}</a>
            <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className="transition hover:text-offwhite">
              {c.footer.instagram}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
