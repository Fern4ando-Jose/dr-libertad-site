"use client";

import { motion } from "framer-motion";
import StudioContainer from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import { useLang } from "@/lib/i18n/LanguageProvider";

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{eyebrow}</div>
      <div className="mt-4 font-serif tracking-[-0.02em] text-[clamp(1.6rem,3vw,2.4rem)] leading-[1.04] text-balance">
        {title}
      </div>
      <div className="mt-5 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
    </div>
  );
}

const arrow = String.fromCharCode(8594);

export default function AuthorView() {
  const { t, lang } = useLang();
  const a = t.author;

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-warm-gray/10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              "radial-gradient(900px circle at 20% 0%, rgba(164,90,90,0.16), transparent 55%), radial-gradient(700px circle at 85% 8%, rgba(231,221,204,0.10), transparent 52%)",
          }}
        />
        <StudioContainer>
          <div className="relative pt-32 pb-12 md:pt-36">
            <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{a.eyebrow}</div>
            <h1 className="mt-5 max-w-[16ch] font-serif text-[clamp(2.3rem,5vw,4.6rem)] leading-[0.98] tracking-[-0.04em] text-pretty">
              {a.title}
            </h1>
            <p className="prose-justify mt-6 max-w-2xl text-[1.05rem] leading-[1.85] text-warm-gray/90">{a.lead}</p>
            <div className="mt-7 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
          </div>
        </StudioContainer>
      </section>

      {/* MANIFESTO PESSOAL */}
      <section className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={a.manifestoEyebrow} title={a.manifestoTitle} />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-12 lg:items-start">
            <div className="space-y-5 lg:col-span-7">
              {a.manifestoParas.map((p, i) => (
                <Reveal key={i} delay={i * 0.05}>
                  <p className="prose-justify text-[1.05rem] leading-[1.9] text-warm-gray/90">{p}</p>
                </Reveal>
              ))}
            </div>
            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur"
              >
                <div className="text-sm tracking-[0.18em] text-warm-gray/80 uppercase">
                  {a.convictionsLabel}
                </div>
                <div className="mt-5 space-y-4">
                  {a.convictions.map((c, i) => (
                    <div key={c} className="text-base leading-[1.4]">
                      <span className="text-muted-red mr-2 font-semibold">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {c}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* DE ONDE VEM A VOZ — credenciais + cânone */}
      <section className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={a.authorityEyebrow} title={a.authorityTitle} />
          </Reveal>
          <p className="prose-justify mt-6 max-w-3xl text-[1.02rem] leading-[1.85] text-warm-gray/90">{a.credLead}</p>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {a.creds.map((c, i) => (
              <motion.div
                key={c.t}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                className="rounded-3xl border border-warm-gray/15 bg-white/3 p-6 backdrop-blur"
              >
                <div className="text-xs tracking-[0.22em] text-muted-red/90 uppercase">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 font-serif text-[1.2rem] leading-[1.15] text-offwhite">{c.t}</h3>
                <p className="mt-3 text-sm leading-[1.7] text-warm-gray/85">{c.d}</p>
              </motion.div>
            ))}
          </div>

          <div className="mt-12">
            <div className="text-sm tracking-[0.18em] text-warm-gray/80 uppercase">{a.canonLabel}</div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {a.canon.map((c, i) => (
                <motion.div
                  key={c.t}
                  initial={{ opacity: 0, y: 14 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.25 }}
                  transition={{ duration: 0.55, delay: i * 0.04 }}
                  className="flex gap-4 rounded-2xl border border-warm-gray/10 bg-ink/25 p-5"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-red/80" />
                  <div>
                    <div className="font-serif text-[1.05rem] text-offwhite">{c.t}</div>
                    <div className="mt-1 text-sm leading-[1.6] text-warm-gray/85">{c.d}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* CONTATO + CTA LIVROS */}
      <section className="py-16 md:py-24">
        <StudioContainer>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-stretch">
            <div className="lg:col-span-6">
              <Reveal>
                <SectionHeading eyebrow={a.contactEyebrow} title={a.contactTitle} />
              </Reveal>
              <div className="mt-8 space-y-4">
                <a
                  href={a.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between rounded-2xl border border-warm-gray/15 bg-white/3 px-6 py-5 backdrop-blur transition hover:border-warm-gray/35"
                >
                  <div>
                    <div className="text-xs tracking-[0.22em] text-warm-gray/70 uppercase">
                      {a.instagramLabel}
                    </div>
                    <div className="mt-1 text-base text-offwhite">{a.instagramHandle}</div>
                  </div>
                  <span className="text-muted-red transition group-hover:translate-x-0.5">{arrow}</span>
                </a>
                <a
                  href={`mailto:${a.email}`}
                  className="group flex items-center justify-between rounded-2xl border border-warm-gray/15 bg-white/3 px-6 py-5 backdrop-blur transition hover:border-warm-gray/35"
                >
                  <div>
                    <div className="text-xs tracking-[0.22em] text-warm-gray/70 uppercase">
                      {a.emailLabel}
                    </div>
                    <div className="mt-1 text-base text-offwhite">{a.email}</div>
                  </div>
                  <span className="text-muted-red transition group-hover:translate-x-0.5">{arrow}</span>
                </a>
              </div>
            </div>

            <div className="lg:col-span-6">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="flex h-full flex-col justify-between rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur"
              >
                <div>
                  <div className="text-xs tracking-[0.24em] text-muted-red/90 uppercase">
                    {a.ctaEyebrow}
                  </div>
                  <h3 className="mt-4 font-serif text-[1.7rem] leading-[1.1] text-offwhite">
                    {a.ctaTitle}
                  </h3>
                  <p className="mt-4 text-sm leading-[1.8] text-warm-gray/90">{a.ctaLead}</p>
                </div>
                <a
                  href={`/${lang}/livros`}
                  className="mt-8 inline-flex w-fit items-center rounded-full bg-muted-red px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite transition hover:bg-muted-red/85"
                >
                  {a.ctaButton}
                  <span className="ml-3">{arrow}</span>
                </a>
              </motion.div>
            </div>
          </div>
        </StudioContainer>
      </section>
    </motion.main>
  );
}
