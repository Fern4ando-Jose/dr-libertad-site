"use client";

import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const bg = useTransform(scrollYProgress, [0, 0.12], ["rgba(11,11,12,0)", "rgba(11,11,12,0.72)"]);
  const border = useTransform(scrollYProgress, [0, 0.12], ["rgba(185,176,162,0)", "rgba(185,176,162,0.14)"]);

  const home = `/${lang}`;
  const isHome = pathname === home || pathname === `${home}/`;

  // Link de seção: rola suave quando já está na home; fora dela, navega para a
  // home + âncora (antes não fazia nada fora da home — ex.: dentro de /livros).
  const sectionProps = (id: string) => ({
    href: `${home}#${id}`,
    onClick: (e: React.MouseEvent) => {
      setOpen(false);
      if (isHome) {
        e.preventDefault();
        scrollToSection(id);
      }
    },
  });

  const linkCls =
    "relative cursor-pointer text-xs tracking-[0.22em] uppercase text-warm-gray/80 transition-colors hover:text-offwhite " +
    "after:pointer-events-none after:absolute after:-bottom-1.5 after:left-0 after:h-[1.5px] after:w-0 after:bg-muted-red after:transition-all after:duration-300 hover:after:w-full";

  const mobileItemCls =
    "border-b border-warm-gray/10 py-3 text-sm tracking-[0.18em] uppercase text-warm-gray/85 hover:text-offwhite transition";

  return (
    <motion.header
      className="fixed left-0 top-0 z-[55] w-full backdrop-blur"
      style={{ backgroundColor: bg, borderBottomColor: border, borderBottomWidth: 1 }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <a
          href={home}
          onClick={(e) => {
            setOpen(false);
            if (isHome) {
              e.preventDefault();
              scrollToSection("top");
            }
          }}
          aria-label={t.brand}
          className="group inline-flex flex-col items-start gap-1.5 font-serif text-[1.1rem] font-semibold leading-none tracking-[-0.01em] text-offwhite/95 hover:text-offwhite transition"
        >
          <span>{t.brand}</span>
          <span
            aria-hidden="true"
            className="h-[2px] w-7 bg-muted-red transition-all duration-300 group-hover:w-11"
          />
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {t.nav.items.map((it) => (
            <a key={it.id} {...sectionProps(it.id)} className={linkCls}>
              {it.label}
            </a>
          ))}
          <a href={`${home}/livros`} className={linkCls}>
            {t.nav.books}
          </a>
          <a href={`${home}/autor`} className={linkCls}>
            {t.nav.author}
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <LangToggle lang={lang} setLang={setLang} />
          <a
            {...sectionProps("newsletter")}
            className="hidden rounded-full border border-warm-gray/20 bg-white/5 px-4 py-2 text-xs tracking-[0.22em] uppercase text-offwhite/90 hover:bg-white/10 transition md:inline-flex"
          >
            {t.nav.cta}
          </a>

          {/* Botão do menu mobile */}
          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-warm-gray/20 bg-white/5 text-offwhite/90 transition hover:bg-white/10 md:hidden"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* Painel mobile — dá acesso a tudo (seções, Livros, Autor, CTA) no celular */}
      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden border-t border-warm-gray/10 bg-ink/95 backdrop-blur md:hidden"
          >
            <div className="flex flex-col px-6 py-2">
              {t.nav.items.map((it) => (
                <a key={it.id} {...sectionProps(it.id)} className={mobileItemCls}>
                  {it.label}
                </a>
              ))}
              <a href={`${home}/livros`} onClick={() => setOpen(false)} className={mobileItemCls}>
                {t.nav.books}
              </a>
              <a href={`${home}/autor`} onClick={() => setOpen(false)} className={mobileItemCls}>
                {t.nav.author}
              </a>
              <a
                {...sectionProps("newsletter")}
                className="my-4 rounded-full bg-muted-red px-5 py-3 text-center text-xs tracking-[0.22em] uppercase text-offwhite transition hover:bg-muted-red/85"
              >
                {t.nav.cta}
              </a>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
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
