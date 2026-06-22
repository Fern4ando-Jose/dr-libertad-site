"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useLang } from "@/lib/i18n/LanguageProvider";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 88;
  const lenis = (window as any).__lenis;
  if (lenis?.scrollTo) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: "smooth" });
}

export default function StudioNav() {
  const { t, lang, setLang } = useLang();
  const { scrollYProgress } = useScroll();
  const bg = useTransform(scrollYProgress, [0, 0.12], ["rgba(11,11,12,0)", "rgba(11,11,12,0.72)"]);
  const border = useTransform(scrollYProgress, [0, 0.12], ["rgba(185,176,162,0)", "rgba(185,176,162,0.14)"]);

  return (
    <motion.header
      className="fixed left-0 top-0 z-[55] w-full backdrop-blur"
      style={{ backgroundColor: bg, borderBottomColor: border, borderBottomWidth: 1 }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <button
          type="button"
          onClick={() => scrollToSection("top")}
          aria-label="Dr. Libertad"
          className="group inline-flex flex-col items-start gap-1.5 font-serif text-[1.1rem] font-semibold leading-none tracking-[-0.01em] text-offwhite/95 hover:text-offwhite transition"
        >
          <span>Dr. Libertad</span>
          <span
            aria-hidden="true"
            className="h-[2px] w-7 bg-muted-red transition-all duration-300 group-hover:w-11"
          />
        </button>

        <nav className="hidden items-center gap-6 md:flex">
          {t.nav.items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => scrollToSection(it.id)}
              className="text-xs tracking-[0.22em] uppercase text-warm-gray/80 hover:text-offwhite transition"
            >
              {it.label}
            </button>
          ))}
          <a
            href={`/${lang}/livros`}
            className="text-xs tracking-[0.22em] uppercase text-warm-gray/80 hover:text-offwhite transition"
          >
            {t.nav.books}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          <button
            type="button"
            onClick={() => scrollToSection("newsletter")}
            className="rounded-full border border-warm-gray/20 bg-white/5 px-4 py-2 text-xs tracking-[0.22em] uppercase text-offwhite/90 hover:bg-white/10 transition"
          >
            {t.nav.cta}
          </button>
        </div>
      </div>
    </motion.header>
  );
}

function LangToggle({ lang, setLang }: { lang: "pt" | "es"; setLang: (l: "pt" | "es") => void }) {
  return (
    <div
      role="group"
      aria-label="Idioma / Idioma"
      className="relative flex items-center rounded-full border border-warm-gray/20 bg-white/5 p-0.5 text-[11px] tracking-[0.18em] uppercase"
    >
      {(["pt", "es"] as const).map((code) => {
        const activeOn = lang === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLang(code)}
            aria-pressed={activeOn}
            className={`relative z-10 rounded-full px-2.5 py-1 transition-colors ${
              activeOn ? "text-offwhite" : "text-warm-gray/70 hover:text-offwhite"
            }`}
          >
            {activeOn && (
              <motion.span
                layoutId="lang-pill"
                className="absolute inset-0 -z-10 rounded-full bg-muted-red/80"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            {code}
          </button>
        );
      })}
    </div>
  );
}
