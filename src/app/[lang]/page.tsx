"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import TravessiaOpening from "@/components/travessia/TravessiaOpening";
import EditorialGrid from "@/components/EditorialGrid";
import StudioContainer from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Marquee from "@/components/ui/Marquee";
import { useLang } from "@/lib/i18n/LanguageProvider";

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <div className="text-xs tracking-[0.26em] text-warm-gray/80 uppercase">{eyebrow}</div>
      <div className="mt-4 font-serif tracking-[-0.02em] text-[clamp(1.75rem,3.2vw,2.6rem)] leading-[1.02] text-balance">
        {title}
      </div>
      <div className="mt-5 h-[1px] w-28 bg-gradient-to-r from-muted-red/70 via-warm-gray/25 to-transparent" />
    </div>
  );
}

export default function Page() {
  const { t, lang } = useLang();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    const lenis = (window as any).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* ABERTURA CINEMATOGRAFICA — A Travessia da Gaiola */}
      <TravessiaOpening />

      {/* MARQUEE */}
      <section className="border-b border-warm-gray/10">
        <StudioContainer>
          <Marquee className="py-5" items={t.marquee} />
        </StudioContainer>
      </section>

      {/* MANIFESTO */}
      <section id="manifesto" className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={t.manifesto.eyebrow} title={t.manifesto.title} />
          </Reveal>

          <div className="mt-10 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur">
                <div className="text-sm tracking-[0.18em] text-warm-gray/80 uppercase">
                  {t.manifesto.principlesLabel}
                </div>
                <div className="mt-5 space-y-4">
                  {t.manifesto.principles.map((item, idx) => (
                    <motion.div
                      key={item.t}
                      initial={{ opacity: 0, y: 14 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.25 }}
                      transition={{ duration: 0.6, delay: idx * 0.05 }}
                      className="rounded-2xl border border-warm-gray/10 bg-ink/25 p-5"
                    >
                      <div className="text-base leading-[1.35]">
                        <span className="text-muted-red mr-2 font-semibold">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        {item.t}
                      </div>
                      <div className="mt-2 text-sm leading-[1.6] text-warm-gray/90">{item.d}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-5">
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.65, ease: "easeOut" }}
                className="rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur h-full"
              >
                <div className="text-sm tracking-[0.18em] text-warm-gray/80 uppercase">
                  {t.manifesto.promiseLabel}
                </div>
                <h3 className="mt-4 text-[1.55rem] leading-[1.15]">{t.manifesto.promiseTitle}</h3>
                <p className="mt-4 text-sm leading-[1.7] text-warm-gray/90">{t.manifesto.promiseLead}</p>

                <div className="mt-6 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full border border-warm-gray/20 bg-white/5 flex items-center justify-center text-muted-red">
                    ◐
                  </div>
                  <div>
                    <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">
                      {t.manifesto.rhythmLabel}
                    </div>
                    <div className="text-sm text-offwhite/95">{t.manifesto.rhythmValue}</div>
                  </div>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-3">
                  {t.manifesto.stats.map((s) => (
                    <div key={s.k} className="rounded-2xl border border-warm-gray/10 bg-ink/25 px-4 py-3">
                      <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">{s.k}</div>
                      <div className="mt-1 text-sm text-offwhite/95">{s.v}</div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* TOPICS */}
      <section id="topics" className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={t.topics.eyebrow} title={t.topics.title} />
          </Reveal>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {t.topics.items.map((topic, idx) => (
              <motion.article
                key={topic.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, delay: idx * 0.04 }}
                whileHover={{ y: -4, borderColor: "rgba(185,176,162,0.55)" }}
                className="group rounded-3xl border border-warm-gray/15 bg-white/3 p-6 backdrop-blur transition-colors"
              >
                <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">
                  {t.topics.label} {String(idx + 1).padStart(2, "0")}
                </div>
                <h3 className="mt-3 text-[1.25rem] leading-[1.1]">{topic.title}</h3>
                <p className="mt-3 text-sm leading-[1.7] text-warm-gray/90">{topic.desc}</p>
                <div className="mt-5 h-[1px] w-14 bg-warm-gray/25 group-hover:bg-muted-red transition-colors" />
              </motion.article>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* GALLERY */}
      <section id="gallery" className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={t.gallery.eyebrow} title={t.gallery.title} />
          </Reveal>
          <div className="mt-10">
            <EditorialGrid />
          </div>
        </StudioContainer>
      </section>

      {/* QUOTES */}
      <section id="quotes" className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={t.quotes.eyebrow} title={t.quotes.title} />
          </Reveal>

          <div className="mt-10 space-y-6">
            {t.quotes.items.map((q, idx) => (
              <motion.blockquote
                key={q.meta}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.6, delay: idx * 0.04 }}
                className="rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">
                      {t.quotes.noteLabel}
                    </div>
                    <p className="mt-3 text-[1.35rem] leading-[1.4]">&ldquo;{q.quote}&rdquo;</p>
                  </div>
                  <div className="hidden sm:block text-muted-red text-5xl leading-none font-serif">
                    &ldquo;
                  </div>
                </div>
                <footer className="mt-5 text-sm text-warm-gray/90">{q.meta}</footer>
              </motion.blockquote>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* NEWSLETTER */}
      <section id="newsletter" className="py-16 md:py-24">
        <StudioContainer>
          <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7">
              <Reveal>
                <SectionHeading eyebrow={t.newsletter.eyebrow} title={t.newsletter.title} />
              </Reveal>
              <p className="prose-justify mt-4 text-sm leading-[1.8] text-warm-gray/90">{t.newsletter.lead}</p>
              <NewsletterForm />
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
                  {t.newsletter.benefitsLabel}
                </div>
                <div className="mt-5 space-y-3">
                  {t.newsletter.benefits.map((row, idx) => (
                    <div key={row.t} className="rounded-2xl border border-warm-gray/10 bg-ink/25 px-5 py-4">
                      <div className="text-base">{row.t}</div>
                      <div className="mt-1 text-sm text-warm-gray/90 leading-[1.6]">{row.d}</div>
                      <div className="mt-3 h-[1px] w-16 bg-warm-gray/25" />
                      <div className="mt-2 text-xs tracking-[0.22em] text-muted-red/90 uppercase">
                        {String(idx + 1).padStart(2, "0")}
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </StudioContainer>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-warm-gray/10 py-10">
        <StudioContainer>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="font-serif text-[1.75rem] font-semibold leading-none tracking-[-0.01em] text-offwhite">
                {t.brand}
              </div>
              <div className="mt-4 h-[2px] w-11 bg-muted-red" />
              <div className="mt-4 text-sm tracking-[0.02em] text-warm-gray/90">{t.footer.tagline}</div>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-warm-gray/90">
              {t.footer.links.map((link) => (
                <a
                  key={link.id}
                  className="hover:text-offwhite transition"
                  href={`#${link.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSection(link.id);
                  }}
                >
                  {link.label}
                </a>
              ))}
              <a
                className="text-warm-gray/70 hover:text-offwhite transition"
                href={`/${lang}/privacidade`}
              >
                {t.footer.legal}
              </a>
            </div>
          </div>
        </StudioContainer>
      </footer>
    </motion.main>
  );
}

function NewsletterForm() {
  const { t, lang } = useLang();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [msg, setMsg] = useState("");

  const submit = async () => {
    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus("error");
      setMsg(t.newsletter.errorInvalid);
      return;
    }
    setStatus("loading");
    setMsg("");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: value, lang }),
      });
      if (!res.ok) throw new Error();
      setStatus("ok");
    } catch {
      setStatus("error");
      setMsg(t.newsletter.errorGeneric);
    }
  };

  return (
    <div className="mt-7 rounded-3xl border border-warm-gray/15 bg-white/3 p-6 backdrop-blur">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status !== "idle") setStatus("idle");
          }}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t.newsletter.placeholder}
          type="email"
          disabled={status === "loading" || status === "ok"}
          className="w-full rounded-2xl border border-warm-gray/15 bg-ink/35 px-4 py-3 text-offwhite placeholder:text-warm-gray/50 outline-none focus:border-muted-red/60 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={submit}
          disabled={status === "loading" || status === "ok"}
          className="rounded-2xl bg-muted-red px-5 py-3 text-sm font-semibold text-offwhite transition hover:bg-muted-red/85 disabled:opacity-70"
        >
          {status === "ok"
            ? t.newsletter.success
            : status === "loading"
            ? t.newsletter.submitting
            : t.newsletter.submit}
        </button>
      </div>
      <div className="mt-3 text-xs leading-[1.6] text-warm-gray/80">
        {status === "error" ? <span className="text-muted-red">{msg}</span> : t.newsletter.disclaimer}
      </div>
    </div>
  );
}
