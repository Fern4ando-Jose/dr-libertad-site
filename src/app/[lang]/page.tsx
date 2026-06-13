"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useState } from "react";
import HeroFloatingDeck from "@/components/HeroFloatingDeck";
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

function ScrollHint() {
  return (
    <div className="mt-10 flex items-center gap-3 text-xs tracking-[0.16em] text-warm-gray/80 uppercase">
      <div className="h-[1px] w-10 bg-warm-gray/30" />
      <div className="relative h-6 w-6">
        <motion.div
          aria-hidden="true"
          className="absolute left-1/2 top-0 h-3 w-[2px] -translate-x-1/2 rounded-full bg-muted-red"
          animate={{ y: [0, 14, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
      <div className="h-[1px] w-14 bg-warm-gray/30" />
    </div>
  );
}

export default function Page() {
  const { t } = useLang();

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 88;
    const lenis = (window as any).__lenis;
    if (lenis?.scrollTo) lenis.scrollTo(y);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const { scrollYProgress } = useScroll();
  const heroParallax = useTransform(scrollYProgress, [0, 0.8], [0, -70]);
  const heroGridShift = useTransform(scrollYProgress, [0, 1], [0, 46]);
  const heroScale = useTransform(scrollYProgress, [0, 0.55], [1, 0.985]);
  const heroBlur = useTransform(scrollYProgress, [0, 0.45], [0, 16]);
  const heroFilter = useTransform(heroBlur, (v) => `blur(${v}px)`);

  return (
    <motion.main
      className="relative z-10"
      initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.9, ease: "easeOut" }}
    >
      {/* HERO */}
      <section
        id="top"
        className="relative flex min-h-[92vh] items-center overflow-hidden border-b border-warm-gray/10"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 top-0 z-0 h-20 bg-[linear-gradient(to_bottom,rgba(11,11,12,0.9),rgba(11,11,12,0))]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 right-0 bottom-0 z-0 h-24 bg-[linear-gradient(to_top,rgba(11,11,12,0.95),rgba(11,11,12,0))]"
        />

        <div className="absolute inset-0" data-gsap="parallax" data-gsap-parallax="24">
          <motion.div
            style={{ y: heroParallax, scale: heroScale, filter: heroFilter }}
            className="h-full w-full bg-[radial-gradient(1000px_circle_at_40%_-20%,rgba(164,90,90,0.22),transparent_60%),radial-gradient(800px_circle_at_80%_10%,rgba(231,221,204,0.12),transparent_55%)]"
          />

          <motion.div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.14]"
            style={{ y: heroGridShift }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(185,176,162,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(185,176,162,0.07) 1px, transparent 1px)",
                backgroundSize: "90px 90px",
              }}
            />
          </motion.div>

          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-60"
            data-gsap="float"
            data-gsap-float="12"
            style={{
              background:
                "radial-gradient(900px circle at 12% 8%, rgba(164,90,90,0.22), transparent 55%), radial-gradient(700px circle at 85% 15%, rgba(231,221,204,0.16), transparent 52%)",
            }}
          />
        </div>

        <StudioContainer>
          <div className="relative pb-14 pt-28 md:pb-20 md:pt-32" data-gsap="hero">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
              <div className="lg:col-span-7">
                <div data-gsap="stagger" data-gsap-stagger="0.06">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.hero.chips.map((chip) => (
                      <span key={chip} className="dl-chip" data-gsap-child="line">
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-7" data-gsap="stagger" data-gsap-stagger="0.07">
                  <h1
                    className="max-w-[18ch] font-serif text-[clamp(2.5rem,5.4vw,5.1rem)] leading-[0.96] tracking-[-0.05em] text-pretty"
                    data-gsap-child="line"
                  >
                    {t.hero.title}{" "}
                    <em className="italic text-muted-red">{t.hero.titleAccent}</em>
                  </h1>
                </div>

                <div className="mt-6" data-gsap="reveal">
                  <p className="max-w-xl text-[1.05rem] leading-[1.85] text-warm-gray/90">
                    {t.hero.lead}
                  </p>
                </div>

                <div className="mt-10 flex flex-wrap items-center gap-3" data-gsap="reveal">
                  <a
                    href="#manifesto"
                    className="group inline-flex items-center rounded-full border border-warm-gray/20 bg-white/5 px-6 py-3 text-xs tracking-[0.22em] uppercase text-offwhite/90 hover:bg-white/10 transition"
                  >
                    {t.hero.ctaPrimary}
                    <span className="ml-3 text-muted-red transition group-hover:translate-x-0.5">
                      {String.fromCharCode(8594)}
                    </span>
                  </a>
                  <a
                    href="#gallery"
                    className="inline-flex items-center rounded-full border border-warm-gray/20 px-6 py-3 text-xs tracking-[0.22em] uppercase text-warm-gray/80 hover:text-offwhite hover:border-warm-gray/35 transition"
                  >
                    {t.hero.ctaSecondary}
                  </a>
                </div>

                <ScrollHint />
              </div>

              <div className="lg:col-span-5">
                <HeroFloatingDeck>
                  <motion.div
                    initial={{ opacity: 0, y: 40 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    whileHover={{ y: -6, scale: 1.02 }}
                    className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-8 shadow-[0_20px_80px_rgba(0,0,0,0.45)]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent pointer-events-none" />
                    <div className="relative z-10">
                      <div className="text-[10px] uppercase tracking-[0.35em] text-warm-gray/70">
                        {t.hero.deckEyebrow}
                      </div>
                      <h3 className="mt-4 text-3xl leading-[1.15] font-light text-offwhite">
                        {t.hero.deckTitle}
                      </h3>
                      <p className="mt-4 text-sm leading-relaxed text-warm-gray/80">
                        {t.hero.deckLead}
                      </p>
                      <div className="mt-8 flex items-center gap-3">
                        <div className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs uppercase tracking-[0.25em] text-warm-gray/75">
                          {t.hero.deckTag}
                        </div>
                        <div className="text-2xl font-semibold text-offwhite">90s</div>
                      </div>
                      <div className="mt-8 space-y-3">
                        {t.hero.deckSteps.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] px-4 py-3"
                          >
                            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-xs text-warm-gray">
                              {i + 1}
                            </div>
                            <span className="text-sm text-warm-gray/90">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                </HeroFloatingDeck>
              </div>
            </div>
          </div>
        </StudioContainer>
      </section>

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
              <p className="mt-4 text-sm leading-[1.8] text-warm-gray/90">{t.newsletter.lead}</p>
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
                Dr. Libertad
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
