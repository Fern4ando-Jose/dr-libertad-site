"use client";

import { motion, useScroll, useTransform } from "framer-motion";

function scrollToSection(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const y = el.getBoundingClientRect().top + window.scrollY - 88;
  const lenis = (window as any).__lenis;
  if (lenis?.scrollTo) lenis.scrollTo(y);
  else window.scrollTo({ top: y, behavior: "smooth" });
}

export default function StudioNav() {
  const { scrollYProgress } = useScroll();
  const bg = useTransform(scrollYProgress, [0, 0.12], ["rgba(11,11,12,0)", "rgba(11,11,12,0.72)"]);
  const border = useTransform(scrollYProgress, [0, 0.12], ["rgba(185,176,162,0)", "rgba(185,176,162,0.14)"]);

  const items: Array<{ id: string; label: string }> = [
    { id: "manifesto", label: "Manifesto" },
    { id: "topics", label: "Temas" },
    { id: "gallery", label: "Editorial" },
    { id: "quotes", label: "Citações" },
    { id: "newsletter", label: "Newsletter" },
  ];

  return (
    <motion.header
      className="fixed left-0 top-0 z-[55] w-full backdrop-blur"
      style={{ backgroundColor: bg, borderBottomColor: border, borderBottomWidth: 1 }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 md:px-8">
        <button
          type="button"
          onClick={() => scrollToSection("top")}
          className="text-xs tracking-[0.28em] uppercase text-offwhite/90 hover:text-offwhite transition"
        >
          DR. LIBERTAD
        </button>
        <nav className="hidden items-center gap-6 md:flex">
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => scrollToSection(it.id)}
              className="text-xs tracking-[0.22em] uppercase text-warm-gray/80 hover:text-offwhite transition"
            >
              {it.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => scrollToSection("newsletter")}
            className="rounded-full border border-warm-gray/20 bg-white/5 px-4 py-2 text-xs tracking-[0.22em] uppercase text-offwhite/90 hover:bg-white/10 transition"
          >
            Entrar na lista
          </button>
        </div>
      </div>
    </motion.header>
  );
}

