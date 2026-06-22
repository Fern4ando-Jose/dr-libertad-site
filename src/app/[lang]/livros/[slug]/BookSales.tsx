"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import StudioContainer from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { getBook } from "@/lib/books";

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{children}</div>
  );
}

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-4 font-serif tracking-[-0.02em] text-[clamp(1.75rem,3.4vw,2.7rem)] leading-[1.03] text-balance">
        {title}
      </h2>
      <div className="mt-5 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
    </div>
  );
}

export default function BookSales({ slug }: { slug: string }) {
  const { t, lang } = useLang();
  const book = getBook(slug);
  if (!book) return null;
  const L = t[book.dictKey];
  const checkout = book.checkout[lang] ?? book.checkout.pt;
  const cover = book.cover[lang] ?? book.cover.pt;

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* HERO */}
      <section id="top" className="relative overflow-hidden border-b border-warm-gray/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 18% 0%, rgba(45,90,61,0.20), transparent 55%), radial-gradient(800px circle at 88% 12%, rgba(164,90,90,0.18), transparent 52%)",
          }}
        />
        <StudioContainer>
          <div className="relative grid gap-12 pt-28 pb-16 md:pt-32 md:pb-24 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <a
                href={`/${lang}/livros`}
                className="text-xs tracking-[0.2em] uppercase text-warm-gray/70 hover:text-offwhite transition"
              >
                {String.fromCharCode(8592)} {t.livrosIndex.eyebrow}
              </a>

              <div className="mt-5">
                <span className="dl-chip">{L.badge}</span>
              </div>

              <h1 className="mt-6 max-w-[16ch] font-serif text-[clamp(2.5rem,5.4vw,5rem)] leading-[0.95] tracking-[-0.045em] text-pretty">
                {L.title} <em className="italic text-muted-red">{L.titleAccent}</em>
              </h1>

              <p className="mt-6 max-w-xl text-[1.08rem] leading-[1.7] text-offwhite/90">
                {L.subtitle}
              </p>
              <p className="mt-4 max-w-xl text-[0.98rem] leading-[1.8] text-warm-gray/85">
                {L.lead}
              </p>

              <div className="mt-7 flex flex-wrap gap-2">
                {L.chips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-warm-gray/20 bg-white/5 px-3.5 py-1.5 text-xs tracking-[0.08em] text-warm-gray/85"
                  >
                    {chip}
                  </span>
                ))}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <a
                  href={checkout}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center rounded-full bg-muted-red px-7 py-3.5 text-sm font-semibold tracking-[0.02em] text-offwhite shadow-[0_14px_44px_rgba(164,90,90,0.32)] transition hover:bg-muted-red/88"
                >
                  {L.ctaBuy}
                  <span className="ml-3 transition group-hover:translate-x-0.5">
                    {String.fromCharCode(8594)}
                  </span>
                </a>
                <div className="flex items-baseline gap-2">
                  <div className="font-serif text-3xl text-offwhite">{L.price}</div>
                  <div className="text-xs tracking-[0.04em] text-warm-gray/75">{L.priceNote}</div>
                </div>
              </div>
              <div className="mt-3 text-xs tracking-[0.04em] text-warm-gray/65">{L.ctaBuyNote}</div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 36 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.1, ease: "easeOut" }}
                whileHover={{ y: -6, rotate: -0.4 }}
                className="relative mx-auto max-w-sm"
              >
                <div
                  aria-hidden="true"
                  className="absolute -inset-6 -z-10 rounded-[40px] bg-[radial-gradient(circle_at_50%_30%,rgba(45,90,61,0.35),transparent_70%)] blur-2xl"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt={L.coverAlt}
                  className="w-full rounded-[18px] border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.55)]"
                />
              </motion.div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <Reveal>
            <Heading eyebrow={L.whatEyebrow} title={L.whatTitle} />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {L.benefits.map((b, i) => (
              <motion.div
                key={b.t}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.55, delay: i * 0.05 }}
                whileHover={{ y: -4, borderColor: "rgba(185,176,162,0.5)" }}
                className="group rounded-3xl border border-warm-gray/15 bg-white/3 p-6 backdrop-blur transition-colors"
              >
                <div className="text-xs tracking-[0.22em] text-muted-red/90 uppercase">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-[1.2rem] leading-[1.15] text-offwhite">{b.t}</h3>
                <p className="mt-3 text-sm leading-[1.7] text-warm-gray/90">{b.d}</p>
              </motion.div>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* INSIDE */}
      <section id="inside" className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <Reveal>
            <Heading eyebrow={L.insideEyebrow} title={L.insideTitle} />
          </Reveal>
          <p className="mt-6 max-w-3xl text-[0.98rem] leading-[1.8] text-warm-gray/90">
            {L.insideLead}
          </p>
          <div className="mt-10 space-y-6">
            {[
              { src: "/images/livro-spread-1.jpg", cap: L.insideCaption1 },
              { src: "/images/livro-spread-2.jpg", cap: L.insideCaption2 },
            ].map((s, i) => (
              <motion.figure
                key={s.src}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="overflow-hidden rounded-3xl border border-warm-gray/15 bg-white/3 p-3 backdrop-blur"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.cap} className="w-full rounded-2xl" />
                <figcaption className="px-3 py-3 text-xs tracking-[0.06em] text-warm-gray/75">
                  {s.cap}
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* FOR WHO */}
      <section className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
            <div className="lg:col-span-5">
              <Reveal>
                <Heading eyebrow={L.forWhoEyebrow} title={L.forWhoTitle} />
              </Reveal>
            </div>
            <div className="lg:col-span-7">
              <div className="space-y-3">
                {L.forWho.map((row, i) => (
                  <motion.div
                    key={row}
                    initial={{ opacity: 0, y: 14 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className="flex items-center gap-4 rounded-2xl border border-warm-gray/12 bg-ink/25 px-5 py-4"
                  >
                    <span className="text-muted-red">{String.fromCharCode(10022)}</span>
                    <span className="text-sm leading-[1.5] text-offwhite/90">{row}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* AUTHOR */}
      <section className="border-b border-warm-gray/10 py-16 md:py-24">
        <StudioContainer>
          <div className="mx-auto max-w-3xl text-center">
            <Eyebrow>{L.authorEyebrow}</Eyebrow>
            <div className="mt-6 mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-muted-red/50 bg-white/[0.03]">
              <span className="font-serif text-xl text-offwhite">DL</span>
            </div>
            <h3 className="mt-5 font-serif text-2xl text-offwhite">{L.authorTitle}</h3>
            <p className="mt-4 text-[0.98rem] leading-[1.8] text-warm-gray/90">{L.authorLead}</p>
          </div>
        </StudioContainer>
      </section>

      {/* FINAL CTA */}
      <section className="py-20 md:py-28">
        <StudioContainer>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="relative overflow-hidden rounded-[32px] border border-warm-gray/15 bg-white/3 p-10 text-center backdrop-blur md:p-14"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(700px circle at 50% 0%, rgba(45,90,61,0.22), transparent 60%)",
              }}
            />
            <h2 className="font-serif text-[clamp(1.8rem,3.4vw,2.7rem)] leading-[1.05] text-offwhite text-balance">
              {L.finalTitle}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm leading-[1.8] text-warm-gray/90">
              {L.finalLead}
            </p>
            <div className="mt-9 flex flex-col items-center gap-3">
              <a
                href={checkout}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center rounded-full bg-muted-red px-8 py-4 text-sm font-semibold text-offwhite shadow-[0_14px_44px_rgba(164,90,90,0.32)] transition hover:bg-muted-red/88"
              >
                {L.ctaBuy} · {L.price}
                <span className="ml-3 transition group-hover:translate-x-0.5">
                  {String.fromCharCode(8594)}
                </span>
              </a>
              <div className="text-xs tracking-[0.04em] text-warm-gray/65">{L.ctaBuyNote}</div>
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-[0.72rem] leading-[1.6] text-warm-gray/55">
              {L.disclaimer}
            </p>
          </motion.div>
        </StudioContainer>
      </section>
    </motion.main>
  );
}
