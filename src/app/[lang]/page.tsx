"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import TravessiaOpening from "@/components/travessia/TravessiaOpening";
import EditorialGrid from "@/components/EditorialGrid";
import StudioContainer from "@/components/ui/Container";
import Reveal from "@/components/ui/Reveal";
import Marquee from "@/components/ui/Marquee";
import { useLang } from "@/lib/i18n/LanguageProvider";
import { estudoContent } from "@/components/estudo/estudo.content";

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

      {/* TEMAS — índice editorial interativo: títulos grandes, números discretos,
          uma frase de contexto revelada no tema ativo (hover no desktop, toque no mobile) */}
      <section id="topics" className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={t.topics.eyebrow} title={t.topics.title} />
          </Reveal>
          <TopicsIndex />
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
                <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">
                  {t.quotes.noteLabel} {String(idx + 1).padStart(2, "0")}
                </div>
                <p className="mt-3 text-[1.35rem] leading-[1.4]">&ldquo;{q.quote}&rdquo;</p>
                <footer className="mt-5 text-sm text-warm-gray/90">{q.meta}</footer>
              </motion.blockquote>
            ))}
          </div>
        </StudioContainer>
      </section>

      {/* PARA CONTINUAR — destaques reais: Livros, Estudo e Autor */}
      <section id="descobrir" className="py-16 md:py-24 border-b border-warm-gray/10">
        <StudioContainer>
          <Reveal>
            <SectionHeading eyebrow={t.discover.eyebrow} title={t.discover.title} />
          </Reveal>
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {/* LIVROS */}
            <motion.a
              href={`/${lang}/livros`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -5 }}
              className="group flex flex-col rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur"
            >
              <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">{t.nav.books}</div>
              <h3 className="mt-4 font-serif text-[1.5rem] leading-[1.15]">{t.livrosIndex.title}</h3>
              <p className="mt-3 text-sm leading-[1.7] text-warm-gray/90">
                {t.livro.title} {t.livro.titleAccent} · {t.dopamina.title} {t.dopamina.titleAccent}
              </p>
              <div className="mt-auto pt-6 text-xs tracking-[0.22em] uppercase text-muted-red group-hover:text-offwhite transition">
                {t.discover.booksCta} →
              </div>
            </motion.a>

            {/* ESTUDO */}
            <motion.a
              href={lang === "es" ? "/el-estudio" : "/o-estudo"}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              whileHover={{ y: -5 }}
              className="group flex flex-col rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur"
            >
              <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">{t.nav.study}</div>
              <h3 className="mt-4 font-serif text-[1.5rem] leading-[1.15]">
                {estudoContent[lang].hero.titlePre}
                <em className="text-muted-red not-italic">{estudoContent[lang].hero.titleEm}</em>
                {estudoContent[lang].hero.titlePost}
              </h3>
              <p className="mt-3 text-sm leading-[1.7] text-warm-gray/90">{estudoContent[lang].hero.kicker}</p>
              <div className="mt-auto pt-6 text-xs tracking-[0.22em] uppercase text-muted-red group-hover:text-offwhite transition">
                {t.discover.studyCta} →
              </div>
            </motion.a>

            {/* AUTOR */}
            <motion.a
              href={`/${lang}/autor`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              whileHover={{ y: -5 }}
              className="group flex flex-col rounded-3xl border border-warm-gray/15 bg-white/3 p-8 backdrop-blur"
            >
              <div className="text-xs tracking-[0.22em] text-warm-gray/80 uppercase">{t.author.eyebrow}</div>
              <h3 className="mt-4 font-serif text-[1.5rem] leading-[1.15]">{t.author.title}</h3>
              <p className="mt-3 text-sm leading-[1.7] text-warm-gray/90 line-clamp-3">{t.author.lead}</p>
              <div className="mt-auto pt-6 text-xs tracking-[0.22em] uppercase text-muted-red group-hover:text-offwhite transition">
                {t.discover.authorCta} →
              </div>
            </motion.a>
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

      {/* FOOTER — marca à esquerda; duas colunas nomeadas (âncoras desta página ·
          páginas do estúdio), cada item na sua linha */}
      <footer className="border-t border-warm-gray/10 py-12">
        <StudioContainer>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <div className="font-serif text-[1.75rem] font-semibold leading-none tracking-[-0.01em] text-offwhite">
                {t.brand}
              </div>
              <div className="mt-4 h-[2px] w-11 bg-muted-red" />
              <div className="mt-4 max-w-[32ch] text-sm leading-[1.7] tracking-[0.02em] text-warm-gray/90">
                {t.footer.tagline}
              </div>
            </div>
            <div>
              <div className="text-xs tracking-[0.22em] text-warm-gray/60 uppercase">
                {t.footer.sectionsLabel}
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-warm-gray/90">
                {t.footer.links.map((link) => (
                  <li key={link.id}>
                    <a
                      className="hover:text-offwhite transition"
                      href={`#${link.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollToSection(link.id);
                      }}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs tracking-[0.22em] text-warm-gray/60 uppercase">
                {t.footer.pagesLabel}
              </div>
              <ul className="mt-4 space-y-2.5 text-sm text-warm-gray/90">
                <li>
                  <a className="hover:text-offwhite transition" href={`/${lang}/livros`}>
                    {t.nav.books}
                  </a>
                </li>
                <li>
                  <a
                    className="hover:text-offwhite transition"
                    href={lang === "es" ? "/el-estudio" : "/o-estudo"}
                  >
                    {t.nav.study}
                  </a>
                </li>
                <li>
                  <a className="hover:text-offwhite transition" href={`/${lang}/autor`}>
                    {t.nav.author}
                  </a>
                </li>
                <li>
                  <a className="hover:text-offwhite transition" href={`/${lang}/quiz`}>
                    {t.nav.quiz}
                  </a>
                </li>
                <li>
                  <a
                    className="text-warm-gray/70 hover:text-offwhite transition"
                    href={`/${lang}/privacidade`}
                  >
                    {t.footer.legal}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </StudioContainer>
      </footer>
    </motion.main>
  );
}

/**
 * Índice editorial dos temas: linhas com número discreto e título grande;
 * o tema ativo (hover no desktop, toque no mobile) revela a frase de contexto.
 */
function TopicsIndex() {
  const { t } = useLang();
  const [activeIdx, setActiveIdx] = useState(0);

  return (
    <div className="mt-10 border-t border-warm-gray/12">
      {t.topics.items.map((topic, idx) => {
        const isActive = idx === activeIdx;
        return (
          <button
            key={topic.title}
            type="button"
            aria-expanded={isActive}
            onClick={() => setActiveIdx(idx)}
            onMouseEnter={() => setActiveIdx(idx)}
            onFocus={() => setActiveIdx(idx)}
            className="group block w-full border-b border-warm-gray/12 py-5 text-left md:py-6"
          >
            <div className="flex items-baseline gap-5 md:gap-8">
              <span
                className={`w-8 shrink-0 font-sans text-xs tracking-[0.2em] transition-colors ${
                  isActive ? "text-muted-red" : "text-warm-gray/50"
                }`}
              >
                {String(idx + 1).padStart(2, "0")}
              </span>
              <span
                className={`font-serif text-[clamp(1.6rem,4vw,2.9rem)] leading-[1.08] tracking-[-0.02em] transition-colors ${
                  isActive ? "text-offwhite" : "text-warm-gray/75 group-hover:text-offwhite"
                }`}
              >
                {topic.title}
              </span>
            </div>
            <motion.div
              initial={false}
              animate={{ height: isActive ? "auto" : 0, opacity: isActive ? 1 : 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="overflow-hidden"
            >
              <p className="pl-13 pt-3 text-sm leading-[1.7] text-warm-gray/90 md:pl-16 md:text-base">
                {topic.desc}
              </p>
            </motion.div>
          </button>
        );
      })}
    </div>
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
